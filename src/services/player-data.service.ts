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
  await cacheRepository.upsertPlayer(player.source, player.externalId, {
    name: player.name,
    photoUrl: player.photoUrl,
    nationality: player.nationality,
    position: player.position,
    club: player.club,
    league: player.league,
    overall: player.overall,
    potential: player.potential,
    age: player.age,
    externalLink: player.externalLink,
    rawData: toJson(player),
    expiresAt: defaultExpiresAt(),
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
};
