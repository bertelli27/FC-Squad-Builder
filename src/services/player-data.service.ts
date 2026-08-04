import { prisma } from "@/lib/prisma";
import { cachedPlayerToDomain, toJson } from "@/lib/cache-mappers";
import { KAGGLE_RATINGS_SOURCE } from "@/lib/normalizers/kaggle-ratings.normalizer";
import { API_FOOTBALL_SOURCE } from "@/lib/normalizers/api-football.normalizer";
import { THESPORTSDB_SOURCE } from "@/lib/normalizers/thesportsdb.normalizer";
import { cacheRepository, defaultExpiresAt } from "@/repositories/cache.repository";
import { kaggleRatingsProvider } from "./providers/kaggle-ratings.provider";
import { apiFootballPlayerProvider } from "./providers/api-football.provider";
import { theSportsDbPlayerProvider } from "./providers/thesportsdb.provider";
import { providerRegistry } from "./provider-registry";
import type { Player } from "@/types/domain";
import type { PlayerProvider, PlayerSearchFilters } from "./providers/provider.interface";

const SEARCH_RESULT_LIMIT = 50;
const CUSTOM_PLAYER_SOURCE = "custom";

// api-football and thesportsdb are rate-limited/network sources, so single
// player lookups for them go through the read-through cache. Kaggle is an
// in-memory CSV lookup with no such cost — see getPlayer() below.
const RATE_LIMITED_PLAYER_PROVIDERS: Record<string, PlayerProvider> = {
  [API_FOOTBALL_SOURCE]: apiFootballPlayerProvider,
  [THESPORTSDB_SOURCE]: theSportsDbPlayerProvider,
};

// `rawData` is meant for reprocessing without a new network call (§5). For
// players that came from a live source it's the normalized Player itself
// (the providers here don't hand back the pre-normalization payload); only
// the bulk Kaggle import (scripts/import-ratings.ts) stores the true raw
// CSV row.
// Exported so ClubDataService/NationalTeamDataService can cache the
// players they pull in via resolveClubSquad/resolveNationalTeamSquad.
export async function cachePlayer(player: Player): Promise<void> {
  // Etapa 6: a player the user has manually edited (§14/§29's "don't
  // silently overwrite personalized data" applies beyond the SoFIFA import
  // this etapa dropped — the same risk exists whenever a provider re-fetch
  // re-caches a player, e.g. re-adding them to another squad or reopening
  // their profile). Non-cadastral bookkeeping (club/league/rawData/
  // expiresAt) still refreshes normally either way. Calls prisma directly
  // (rather than cacheRepository.upsertPlayer) because create and update
  // need genuinely different payloads here — a brand new row always needs
  // its full cadastral data, an existing manually-edited one must skip it.
  const existing = await cacheRepository.getPlayer(player.source, player.externalId);
  const cadastral = {
    name: player.name,
    photoUrl: player.photoUrl,
    nationality: player.nationality,
    position: player.position,
    secondaryPositions: player.secondaryPositions ?? [],
    overall: player.overall,
    potential: player.potential,
    age: player.age,
    dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth) : undefined,
    externalLink: player.externalLink,
  };
  const bookkeeping = {
    club: player.club,
    league: player.league,
    rawData: toJson(player),
    expiresAt: defaultExpiresAt(),
  };

  await prisma.cachedPlayer.upsert({
    where: { source_externalId: { source: player.source, externalId: player.externalId } },
    create: { source: player.source, externalId: player.externalId, ...cadastral, ...bookkeeping },
    update: existing?.manuallyEdited ? bookkeeping : { ...cadastral, ...bookkeeping },
  });
}

export const playerDataService = {
  /**
   * Searches the player cache directly — Kaggle's ~16k players are already
   * bulk-imported there (npm run import:ratings), so this is a plain
   * indexed Postgres query, not a live provider call. `minPotential`/
   * `maxPotential` are accepted but not applied: no source currently
   * populates `potential`.
   */
  async searchPlayers(filters: PlayerSearchFilters): Promise<Player[]> {
    const rows = await prisma.cachedPlayer.findMany({
      where: {
        expiresAt: { gt: new Date() },
        ...(filters.name && { name: { contains: filters.name, mode: "insensitive" } }),
        ...(filters.position && { position: filters.position }),
        ...(filters.nationality && { nationality: filters.nationality }),
        ...(filters.club && { club: filters.club }),
        ...(filters.league && { league: filters.league }),
        ...((filters.minOverall !== undefined || filters.maxOverall !== undefined) && {
          overall: { gte: filters.minOverall, lte: filters.maxOverall },
        }),
        ...((filters.minAge !== undefined || filters.maxAge !== undefined) && {
          age: { gte: filters.minAge, lte: filters.maxAge },
        }),
      },
      orderBy: { overall: "desc" },
      take: SEARCH_RESULT_LIMIT,
    });
    return rows.map(cachedPlayerToDomain);
  },

  /**
   * Nova etapa — Gerenciamento: every player the user created directly
   * (as opposed to imported from Kaggle/API-Football/TheSportsDB), for the
   * central admin listing. Returns the raw CachedPlayer row (not the
   * source:externalId-keyed Player DTO cachedPlayerToDomain produces) —
   * the management UI needs the real CachedPlayer.id to call
   * PATCH/DELETE /api/players/[id], which the DTO's composite id can't
   * give it. No expiresAt gate here on purpose — that's a cache-freshness
   * concept for provider-sourced rows, meaningless for a custom player
   * (they'd never disappear from their own management page just because a
   * TTL lapsed).
   */
  async listCustomPlayers(query?: string) {
    return prisma.cachedPlayer.findMany({
      where: {
        source: CUSTOM_PLAYER_SOURCE,
        ...(query?.trim() && { name: { contains: query.trim(), mode: "insensitive" } }),
      },
      orderBy: { name: "asc" },
    });
  },

  /** Cache-first single player fetch, namespaced by source (matches Player.id's `${source}:${externalId}` shape). */
  async getPlayer(source: string, externalId: string): Promise<Player | null> {
    if (source === KAGGLE_RATINGS_SOURCE) {
      const player = await kaggleRatingsProvider.fetchPlayer(externalId);
      if (player) await cachePlayer(player);
      return player;
    }

    const cached = await cacheRepository.getPlayer(source, externalId);
    if (cached) return cachedPlayerToDomain(cached);

    const provider = RATE_LIMITED_PLAYER_PROVIDERS[source];
    if (!provider) return null;

    const player = await provider.fetchPlayer(externalId);
    if (player) await cachePlayer(player);
    return player;
  },

  /** Full cross-source merge for a player found elsewhere (e.g. a club squad) that isn't in the Kaggle catalog by id. See ProviderRegistry.resolvePlayer. */
  async enrichPlayer(name: string, context?: { club?: string }): Promise<Player | null> {
    const player = await providerRegistry.resolvePlayer(name, context);
    if (player) await cachePlayer(player);
    return player;
  },

  /**
   * Etapa 6 (§16/§24): edits a player's cadastral data directly, regardless
   * of source — the old restriction to only "custom" players (§7's original
   * "cache is never edited by the user" guarantee) is deliberately lifted
   * here. Every SquadPlayer/PlayerCareer referencing this CachedPlayer row
   * shares the same identity, so the edit is meant to show up everywhere at
   * once — that's the point of a central player record (§32). Sets
   * `manuallyEdited` so future cache refreshes (import-ratings.ts,
   * cachePlayer above) don't silently revert it.
   */
  async updatePlayer(
    cachedPlayerId: string,
    patch: {
      name?: string;
      photoUrl?: string | null;
      dateOfBirth?: Date | null;
      nationality?: string | null;
      position?: string | null;
      secondaryPositions?: string[];
      overall?: number | null;
      potential?: number | null;
      externalLink?: string | null;
    },
  ): Promise<Player | null> {
    const secondaryPositions = patch.secondaryPositions
      ?.filter((p, i, arr) => p && p !== patch.position && arr.indexOf(p) === i)
      .slice(0, 3);

    const row = await prisma.cachedPlayer
      .update({
        where: { id: cachedPlayerId },
        data: {
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.photoUrl !== undefined && { photoUrl: patch.photoUrl }),
          ...(patch.dateOfBirth !== undefined && { dateOfBirth: patch.dateOfBirth }),
          ...(patch.nationality !== undefined && { nationality: patch.nationality }),
          ...(patch.position !== undefined && { position: patch.position }),
          ...(secondaryPositions !== undefined && { secondaryPositions }),
          ...(patch.overall !== undefined && { overall: patch.overall }),
          ...(patch.potential !== undefined && { potential: patch.potential }),
          ...(patch.externalLink !== undefined && { externalLink: patch.externalLink }),
          manuallyEdited: true,
        },
      })
      .catch(() => null);

    return row ? cachedPlayerToDomain(row) : null;
  },

  /**
   * Nova etapa — exclusão de jogadores custom: resumo de impacto mostrado
   * na confirmação, antes de apagar de fato. Usa os mesmos dados que
   * deletePlayer já precisaria buscar para decidir o que cascateia, então
   * não há custo extra em expor isso separadamente.
   */
  async getDeleteImpact(cachedPlayerId: string) {
    const squadPlayers = await prisma.squadPlayer.findMany({
      where: { cachedPlayerId },
      select: { id: true, season: { select: { squadId: true } } },
    });
    const squadPlayerIds = squadPlayers.map((sp) => sp.id);

    const [statsCount, directTransferCount, career] = await Promise.all([
      squadPlayerIds.length
        ? prisma.playerCompetitionStats.count({ where: { squadPlayerId: { in: squadPlayerIds } } })
        : Promise.resolve(0),
      prisma.transfer.count({ where: { cachedPlayerId } }),
      prisma.playerCareer.findFirst({
        where: { cachedPlayerId },
        include: { _count: { select: { stints: true, transfers: true } } },
      }),
    ]);

    return {
      seasonCount: squadPlayers.length,
      clubCount: new Set(squadPlayers.map((sp) => sp.season.squadId)).size,
      statsCount,
      transferCount: directTransferCount + (career?._count.transfers ?? 0),
      stintCount: career?._count.stints ?? 0,
      hasCareer: !!career,
    };
  },

  /**
   * Apaga o jogador (CachedPlayer) inteiro e tudo que só existe por causa
   * dele — diferente de "remover do elenco" (removePlayerFromSeason), que
   * tira só de UMA temporada. Ordem importa por causa do ON DELETE
   * RESTRICT em SquadPlayer.cachedPlayerId (confirmado nas migrations
   * aplicadas): SquadPlayer precisa sumir antes do CachedPlayer, senão o
   * delete final falha. PlayerCareer é apagado explicitamente (em vez de
   * confiar no ON DELETE SET NULL da FK) para não deixar uma carreira sem
   * cachedPlayerId, o que violaria a invariante da etapa 6 de que toda
   * carreira sempre tem um jogador vinculado — apagar a carreira já
   * cascateia CareerStint/CareerTransfer/CareerTitle/
   * CareerStintCompetitionStats sozinho (mesmo mecanismo de
   * career.service.ts#deleteCareer). Transfer.cachedPlayerId fica como
   * ON DELETE SET NULL mesmo (histórico da temporada, não do jogador).
   * Só afeta linhas filtradas por este cachedPlayerId — nunca outros
   * jogadores, clubes ou temporadas.
   */
  async deletePlayer(cachedPlayerId: string): Promise<boolean> {
    await prisma.$transaction([
      prisma.squadPlayer.deleteMany({ where: { cachedPlayerId } }),
      prisma.playerCareer.deleteMany({ where: { cachedPlayerId } }),
      prisma.cachedPlayer.delete({ where: { id: cachedPlayerId } }),
    ]);
    return true;
  },
};
