import { prisma } from "@/lib/prisma";
import { cacheRepository } from "@/repositories/cache.repository";
import { getFormationSlots } from "@/lib/formations";
import { normalizePositionCategory } from "@/lib/position-category";
import { playerDataService } from "./player-data.service";
import { competitionService } from "./competition.service";
import { NATIONAL_TEAM_SQUAD_SIZE } from "@/lib/national-team";
import { KIT_TYPES } from "@/lib/kits";
import type { Player } from "@/types/domain";

interface SquadPlayerAssignment {
  cachedPlayerId: string;
  positionSlot: string | null;
  isStarter: boolean;
  order: number;
}

/**
 * Greedily fills each formation slot with the best remaining player whose
 * position matches the slot's category (GK/DEF/MID/ATT), falling back to
 * any remaining player if the category is exhausted. Whatever's left over
 * becomes the bench. Not an optimal assignment (no swapping to fix a
 * mismatch elsewhere) — good enough for an initial lineup the user then
 * edits by hand in the tactical editor.
 */
function assignStartingXI(
  players: { cachedPlayerId: string; position?: string; overall?: number }[],
  formation: string,
): SquadPlayerAssignment[] {
  const pool = players
    .map((p) => ({ ...p, category: normalizePositionCategory(p.position) }))
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));

  const used = new Set<number>();
  const starters: SquadPlayerAssignment[] = [];

  getFormationSlots(formation).forEach((slot, order) => {
    let index = pool.findIndex((p, i) => !used.has(i) && p.category === slot.category);
    if (index === -1) index = pool.findIndex((_, i) => !used.has(i));
    if (index === -1) return;

    used.add(index);
    starters.push({
      cachedPlayerId: pool[index].cachedPlayerId,
      positionSlot: slot.slot,
      isStarter: true,
      order,
    });
  });

  const bench: SquadPlayerAssignment[] = pool
    .filter((_, i) => !used.has(i))
    .map((p, i) => ({
      cachedPlayerId: p.cachedPlayerId,
      positionSlot: null,
      isStarter: false,
      order: starters.length + i,
    }));

  return [...starters, ...bench];
}

/**
 * Manual additions respect the same 26-man cap as the automatic load
 * (§ createInitialSeason): once a national-team season already has 26
 * official members (starter or bench, i.e. neither watchlist nor extra), a
 * new bench-bound addition becomes an "extra" instead. Watchlist additions
 * are never capped — observados were never part of the 26 to begin with.
 */
async function resolveDestinationBucket(
  seasonId: string,
  destination: "bench" | "watchlist",
): Promise<{ isWatchlist: boolean; isExtra: boolean }> {
  if (destination === "watchlist") return { isWatchlist: true, isExtra: false };

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { squad: { select: { baseKind: true } } },
  });
  if (season?.squad.baseKind !== "nationalTeam") return { isWatchlist: false, isExtra: false };

  const officialCount = await prisma.squadPlayer.count({
    where: { seasonId, isWatchlist: false, isExtra: false },
  });
  return { isWatchlist: false, isExtra: officialCount >= NATIONAL_TEAM_SQUAD_SIZE };
}

/** Shared by mirrorTransferOnCareer and ensureCareerStintForSeason below — both append to the same timeline sequence. */
async function nextCareerOrder(careerId: string): Promise<number> {
  const [stintMax, transferMax] = await Promise.all([
    prisma.careerStint.aggregate({ where: { careerId }, _max: { order: true } }),
    prisma.careerTransfer.aggregate({ where: { careerId }, _max: { order: true } }),
  ]);
  return Math.max(stintMax._max.order ?? -1, transferMax._max.order ?? -1) + 1;
}

/**
 * §22/§23: mirrors a club-side Transfer into the player's PlayerCareer, if
 * they have one linked to the same CachedPlayer — a no-op otherwise (a
 * career is opt-in, most players don't have one). Copied once at creation,
 * same "reference not sync" principle as CareerStint.seasonId: later
 * edits/deletes of the source Transfer never touch this row.
 */
async function mirrorTransferOnCareer(
  transferId: string,
  cachedPlayerId: string,
  input: { fromClubName: string | null; toClubName: string; value: number | null; year: number },
) {
  const career = await prisma.playerCareer.findFirst({ where: { cachedPlayerId } });
  if (!career) return;

  const order = await nextCareerOrder(career.id);

  await prisma.careerTransfer.create({
    data: {
      careerId: career.id,
      fromClubName: input.fromClubName,
      toClubName: input.toClubName,
      value: input.value,
      year: input.year,
      order,
      sourceTransferId: transferId,
    },
  });
}

/**
 * CORREÇÃO — sincronização bidirecional: até agora só existia a direção
 * carreira → clube (career.service.ts#addStint criava o SquadPlayer). Um
 * jogador adicionado a um elenco diretamente pelo Modo Clubes
 * (addPlayerToSeason/createCustomPlayer/signPlayer) nunca refletia na
 * carreira dele, mesmo já tendo uma. Esta função é a única responsável
 * por criar esse vínculo, chamada dos dois lados — tanto daqui (clube →
 * carreira) quanto de career.service.ts#addStint (carreira → clube, que
 * internamente chama signPlayer/addPlayerToSeason e por isso já dispara
 * esta mesma função) — então não importa qual lado agiu primeiro, o
 * `findFirst` abaixo garante que nunca se cria uma segunda CareerStint
 * para o mesmo par (carreira, temporada). Não faz nada se o jogador não
 * tiver carreira (a maioria não tem — carreira é opt-in, §"não quero uma
 * integração automática de todos os jogadores existentes").
 */
export async function ensureCareerStintForSeason(cachedPlayerId: string, seasonId: string) {
  const career = await prisma.playerCareer.findFirst({ where: { cachedPlayerId } });
  if (!career) return null;

  const existing = await prisma.careerStint.findFirst({ where: { careerId: career.id, seasonId } });
  if (existing) return existing;

  const season = await prisma.season.findUnique({ where: { id: seasonId }, include: { squad: true } });
  if (!season) return null;

  const order = await nextCareerOrder(career.id);
  return prisma.careerStint.create({
    data: {
      careerId: career.id,
      seasonId: season.id,
      kind: season.squad.baseKind === "nationalTeam" ? "nationalTeam" : "club",
      clubName: season.squad.name,
      clubLogoUrl: season.squad.logoUrl,
      startYear: season.startYear,
      calendar: season.squad.seasonCalendar,
      order,
    },
  });
}

/**
 * Standalone (not a `seasonService` method) so `createSeason`'s return type
 * below can reference its result without a circular `typeof seasonService`
 * self-reference — TypeScript can't infer an object literal's own type
 * while a property inside it depends on that same type.
 */
function getSeasonById(id: string) {
  return prisma.season.findUnique({
    where: { id },
    include: {
      squad: true,
      coach: true,
      players: { include: { cachedPlayer: true }, orderBy: { order: "asc" } },
      titles: { include: { competition: true }, orderBy: { createdAt: "asc" } },
      transfers: { orderBy: { order: "asc" } },
      kits: true,
    },
  });
}

export const seasonService = {
  async listSeasons(squadId: string) {
    return prisma.season.findMany({
      where: { squadId },
      orderBy: { startYear: "desc" },
      include: { _count: { select: { players: { where: { isWatchlist: false, isExtra: false } } } } },
    });
  },

  getSeason: getSeasonById,

  /**
   * The season created alongside a brand-new club (§squad.service.ts
   * createSquad) — optionally auto-loading a real club/national team's
   * roster and assigning a starting XI, same greedy logic `changeFormation`
   * reuses later. A real national team's registered squad is easily
   * 30-40+ names (not just the current 26-man call-up), so anything past
   * NATIONAL_TEAM_SQUAD_SIZE becomes an "extra" instead of dumping the
   * whole pool onto the bench; club seasons are uncapped.
   */
  async createInitialSeason(
    squadId: string,
    input: { startYear: number; formation: string; isNationalTeam: boolean; players: Player[] },
  ) {
    const season = await prisma.season.create({
      data: { squadId, startYear: input.startYear, formation: input.formation },
    });

    if (input.players.length > 0) {
      const cachedRows = await Promise.all(
        input.players.map((p) => cacheRepository.getPlayer(p.source, p.externalId)),
      );
      const validRows = cachedRows.filter((row) => row !== null);

      const assignments = assignStartingXI(
        validRows.map((row) => ({
          cachedPlayerId: row.id,
          position: row.position ?? undefined,
          overall: row.overall ?? undefined,
        })),
        input.formation,
      );

      const cap = input.isNationalTeam ? NATIONAL_TEAM_SQUAD_SIZE : Infinity;

      if (assignments.length > 0) {
        await prisma.squadPlayer.createMany({
          data: assignments.map((a, i) => ({
            seasonId: season.id,
            cachedPlayerId: a.cachedPlayerId,
            positionSlot: i < cap ? a.positionSlot : null,
            isStarter: i < cap && a.isStarter,
            isExtra: i >= cap,
            order: a.order,
          })),
        });
      }
    }

    return season;
  },

  /**
   * A season built from scratch, or based on another season of the same
   * club (§6 "duplicar temporada"): copies the lineup/coach/formation as a
   * starting point the user then edits — new, independent SquadPlayer
   * rows, never a reference back to the source (editing 2027 must never
   * touch 2026). `notes` is deliberately NOT copied: it reads more like a
   * season-specific summary/journal (in the same spirit as the stats/
   * títulos/transferências §7 explicitly keeps out of duplication) than
   * part of the roster's "base" worth reusing.
   */
  async createSeason(
    squadId: string,
    input: { startYear: number; duplicateFromSeasonId?: string },
  ): Promise<
    | { season: NonNullable<Awaited<ReturnType<typeof getSeasonById>>> }
    | { error: "duplicate-year" | "source-not-found" }
  > {
    const clash = await prisma.season.findUnique({
      where: { squadId_startYear: { squadId, startYear: input.startYear } },
    });
    if (clash) return { error: "duplicate-year" };

    if (input.duplicateFromSeasonId) {
      const source = await prisma.season.findUnique({
        where: { id: input.duplicateFromSeasonId, squadId },
        include: { players: true },
      });
      if (!source) return { error: "source-not-found" };

      const season = await prisma.season.create({
        data: {
          squadId,
          startYear: input.startYear,
          formation: source.formation,
          // Coach agora é uma entidade compartilhada (§ nova etapa) — a
          // temporada duplicada começa com o MESMO técnico (referência),
          // não uma cópia independente de texto como antes; editável
          // depois igual qualquer outra temporada.
          coachId: source.coachId,
        },
      });

      if (source.players.length > 0) {
        await prisma.squadPlayer.createMany({
          data: source.players.map((p) => ({
            seasonId: season.id,
            cachedPlayerId: p.cachedPlayerId,
            shirtNumber: p.shirtNumber,
            isCaptain: p.isCaptain,
            isStarter: p.isStarter,
            isWatchlist: p.isWatchlist,
            isExtra: p.isExtra,
            positionSlot: p.positionSlot,
            order: p.order,
          })),
        });

        // CORREÇÃO — duplicar temporada criava os SquadPlayer diretamente
        // via createMany acima, sem passar por addPlayerToSeason/signPlayer
        // (os únicos dois lugares que chamavam ensureCareerStintForSeason
        // até agora) — por isso um jogador copiado pra temporada duplicada
        // nunca ganhava a passagem correspondente na carreira dele. Mesma
        // função, mesma idempotência (não cria uma segunda CareerStint se
        // o jogador não tiver carreira, ou se essa temporada já estiver
        // vinculada a uma).
        await Promise.all(
          source.players.map((p) => ensureCareerStintForSeason(p.cachedPlayerId, season.id)),
        );
      }

      // Kits (§1.5 da etapa) — deliberadamente NÃO copiados pra temporada
      // duplicada, diferente de formation/coachId acima. O motivo é o
      // oposto do de coachId: formation/técnico tendem a se repetir de um
      // ano pro outro e valem como "base" reaproveitável, mas o uniforme é
      // exatamente o tipo de dado que MUDA a cada temporada — é a própria
      // razão da feature existir (§1.1/§1.4: Coritiba 2019 ≠ 2020 ≠ 2021).
      // Copiar arriscaria deixar o kit de 2026 mostrando o de 2025 até o
      // usuário notar e trocar manualmente; ficar em branco (mesmo
      // comportamento de qualquer temporada nova, §1.8) é o padrão seguro.
      // Mesmo tratamento de `notes` acima: específico da temporada, não
      // parte da base copiada.

      return { season: (await getSeasonById(season.id))! };
    }

    const season = await prisma.season.create({ data: { squadId, startYear: input.startYear } });
    return { season: (await getSeasonById(season.id))! };
  },

  async updateSeason(
    id: string,
    data: {
      formation?: string;
      coachId?: string | null;
      notes?: string | null;
      wins?: number;
      draws?: number;
      losses?: number;
    },
  ) {
    return prisma.season.update({ where: { id }, data });
  },

  async deleteSeason(id: string) {
    await prisma.season.delete({ where: { id } });
  },

  /**
   * Adds a title to this season, resolving the competition either by an
   * existing id or by name (creating it if new — see
   * competitionService.findOrCreateCompetition). Idempotent per
   * competition (§1: a season can't have the same title twice — the
   * SeasonTitle unique constraint would reject a plain duplicate insert,
   * so this just returns the existing row instead of erroring).
   */
  async addTitle(
    seasonId: string,
    input: { competitionId?: string; competitionName?: string; trophyImageUrl?: string | null },
  ) {
    let competitionId = input.competitionId;
    if (!competitionId) {
      if (!input.competitionName?.trim()) return null;
      const competition = await competitionService.findOrCreateCompetition(
        input.competitionName,
        input.trophyImageUrl,
      );
      competitionId = competition.id;
    }

    const existing = await prisma.seasonTitle.findUnique({
      where: { seasonId_competitionId: { seasonId, competitionId } },
      include: { competition: true },
    });
    if (existing) return existing;

    return prisma.seasonTitle.create({
      data: { seasonId, competitionId },
      include: { competition: true },
    });
  },

  async removeTitle(seasonId: string, titleId: string) {
    await prisma.seasonTitle.delete({ where: { id: titleId, seasonId } });
  },

  /**
   * Etapa 9 parte 3 — minikits: adiciona OU substitui (upsert por
   * [seasonId, type], §1.7 "adicionar"/"substituir" são a mesma ação do
   * ponto de vista do dado). Nunca cria os outros tipos junto — cada
   * chamada afeta só o `type` passado.
   */
  async setKit(seasonId: string, type: string, imageUrl: string) {
    if (!KIT_TYPES.some((k) => k.value === type) || !imageUrl.trim()) return null;
    return prisma.seasonKit.upsert({
      where: { seasonId_type: { seasonId, type } },
      create: { seasonId, type, imageUrl: imageUrl.trim() },
      update: { imageUrl: imageUrl.trim() },
    });
  },

  /** Remove só este tipo de kit — nunca a temporada, nunca os outros kits dela (§1.7). */
  async removeKit(seasonId: string, type: string) {
    await prisma.seasonKit.deleteMany({ where: { seasonId, type } });
  },

  /**
   * Legacy free-text entry — kept only so pre-etapa-7 transfers (created
   * before a transfer was linked to a real CachedPlayer) keep working.
   * `transferPlayerOut`/`signPlayer` below are the real, elenco-integrated
   * paths etapa 7 adds; nothing in the current UI calls this anymore for
   * new transfers.
   */
  async addTransfer(
    seasonId: string,
    input: { type: "in" | "out"; playerName: string; counterpartClub?: string | null; value?: number | null },
  ) {
    const { _max } = await prisma.transfer.aggregate({ where: { seasonId }, _max: { order: true } });
    return prisma.transfer.create({
      data: {
        seasonId,
        type: input.type,
        playerName: input.playerName.trim(),
        counterpartClub: input.counterpartClub?.trim() || null,
        value: input.value ?? null,
        order: (_max.order ?? -1) + 1,
      },
    });
  },

  async removeTransfer(seasonId: string, transferId: string) {
    await prisma.transfer.delete({ where: { id: transferId, seasonId } });
  },

  /**
   * §2-§7: a real "saída" — a player picked from the season's own roster
   * (must already be a SquadPlayer here, §33's "transferência de jogador
   * que não pertence ao elenco"), removed from it, with a Transfer("out")
   * recorded in the same action. `dealType` is orthogonal to §18's "livre":
   * a free transfer is just `value: null` on a "permanent" deal, no
   * separate type needed.
   */
  async transferPlayerOut(
    seasonId: string,
    squadPlayerId: string,
    input: { counterpartClub: string; value?: number | null; dealType?: "permanent" | "loan" },
  ): Promise<{ transfer: Awaited<ReturnType<typeof prisma.transfer.create>> } | { error: "not-in-squad" | "missing-club" }> {
    const counterpartClub = input.counterpartClub?.trim();
    if (!counterpartClub) return { error: "missing-club" };

    const squadPlayer = await prisma.squadPlayer.findUnique({
      where: { id: squadPlayerId, seasonId },
      include: { cachedPlayer: true, season: { include: { squad: true } } },
    });
    if (!squadPlayer) return { error: "not-in-squad" };

    const dealType = input.dealType === "loan" ? "loan" : "permanent";
    const { _max } = await prisma.transfer.aggregate({ where: { seasonId }, _max: { order: true } });

    const transfer = await prisma.transfer.create({
      data: {
        seasonId,
        type: "out",
        playerName: squadPlayer.cachedPlayer.name,
        counterpartClub,
        value: input.value ?? null,
        dealType,
        cachedPlayerId: squadPlayer.cachedPlayerId,
        order: (_max.order ?? -1) + 1,
      },
    });

    // Delete after creating the Transfer — the Transfer only needs
    // cachedPlayerId (not the SquadPlayer row itself), so order here
    // doesn't matter for that, but doing it in this sequence means a
    // failure while creating the Transfer never leaves the roster missing
    // a player with nothing recorded.
    await prisma.squadPlayer.delete({ where: { id: squadPlayerId } });

    await mirrorTransferOnCareer(transfer.id, squadPlayer.cachedPlayerId, {
      fromClubName: squadPlayer.season.squad.name,
      toClubName: counterpartClub,
      value: input.value ?? null,
      year: squadPlayer.season.startYear,
    });

    return { transfer };
  },

  /**
   * §8-§13: a real "entrada"/contratação — either an existing player
   * (§9 opção A, same source+externalId resolution addPlayerToSeason
   * uses) or a brand new one created in the same action (§9 opção B, same
   * "custom" CachedPlayer creation createCustomPlayer uses) — either way,
   * ending with that player added to the roster and a Transfer("in")
   * recorded together, never as two separate steps (§13).
   */
  async signPlayer(
    seasonId: string,
    input: {
      playerRef?: { source: string; externalId: string };
      newPlayer?: {
        name: string;
        position?: string;
        secondaryPositions?: string[];
        photoUrl?: string;
        dateOfBirth?: Date;
        nationality?: string;
        overall?: number;
        potential?: number;
        externalLink?: string;
      };
      shirtNumber?: number;
      counterpartClub?: string | null;
      value?: number | null;
      dealType?: "permanent" | "loan";
    },
  ): Promise<
    | { player: Awaited<ReturnType<typeof prisma.squadPlayer.create>>; transfer: Awaited<ReturnType<typeof prisma.transfer.create>> }
    | { error: "already-in-squad" | "player-not-found" | "missing-player" }
  > {
    const season = await prisma.season.findUnique({ where: { id: seasonId }, include: { squad: true } });
    if (!season) return { error: "player-not-found" };

    let cachedPlayerId: string;
    if (input.playerRef) {
      const player = await playerDataService.getPlayer(input.playerRef.source, input.playerRef.externalId);
      const cached = player && (await cacheRepository.getPlayer(input.playerRef.source, input.playerRef.externalId));
      if (!cached) return { error: "player-not-found" };
      cachedPlayerId = cached.id;
    } else if (input.newPlayer) {
      const externalId = crypto.randomUUID();
      const cached = await cacheRepository.upsertPlayer(CUSTOM_PLAYER_SOURCE, externalId, {
        name: input.newPlayer.name,
        position: input.newPlayer.position,
        secondaryPositions: input.newPlayer.secondaryPositions ?? [],
        photoUrl: input.newPlayer.photoUrl,
        dateOfBirth: input.newPlayer.dateOfBirth,
        nationality: input.newPlayer.nationality,
        overall: input.newPlayer.overall,
        potential: input.newPlayer.potential,
        externalLink: input.newPlayer.externalLink,
        rawData: { custom: true },
        expiresAt: new Date(Date.now() + CUSTOM_PLAYER_TTL_MS),
      });
      cachedPlayerId = cached.id;
    } else {
      return { error: "missing-player" };
    }

    const existing = await prisma.squadPlayer.findUnique({
      where: { seasonId_cachedPlayerId: { seasonId, cachedPlayerId } },
    });
    if (existing) return { error: "already-in-squad" };

    const [{ _max: playerMax }, bucket, { _max: transferMax }] = await Promise.all([
      prisma.squadPlayer.aggregate({ where: { seasonId }, _max: { order: true } }),
      resolveDestinationBucket(seasonId, "bench"),
      prisma.transfer.aggregate({ where: { seasonId }, _max: { order: true } }),
    ]);

    const squadPlayer = await prisma.squadPlayer.create({
      data: {
        seasonId,
        cachedPlayerId,
        isStarter: false,
        ...bucket,
        shirtNumber: input.shirtNumber,
        order: (playerMax.order ?? -1) + 1,
      },
      include: { cachedPlayer: true },
    });

    const dealType = input.dealType === "loan" ? "loan" : "permanent";
    const counterpartClub = input.counterpartClub?.trim() || null;
    const transfer = await prisma.transfer.create({
      data: {
        seasonId,
        type: "in",
        playerName: squadPlayer.cachedPlayer.name,
        counterpartClub,
        value: input.value ?? null,
        dealType,
        cachedPlayerId,
        order: (transferMax.order ?? -1) + 1,
      },
    });

    await mirrorTransferOnCareer(transfer.id, cachedPlayerId, {
      fromClubName: counterpartClub,
      toClubName: season.squad.name,
      value: input.value ?? null,
      year: season.startYear,
    });

    // CORREÇÃO: reflete a contratação na carreira do jogador, se ele
    // tiver uma. Chamada depois do espelho da transferência acima de
    // propósito, pra manter a ordem certa na timeline (a transferência
    // aparece antes da nova passagem, não depois).
    await ensureCareerStintForSeason(cachedPlayerId, seasonId);

    return { player: squadPlayer, transfer };
  },

  /**
   * Switches formation and remaps the current starting XI onto the new
   * formation's slots (same greedy category match as initial season
   * creation), preserving who's a starter — captain/number/bench are
   * untouched. Bench players are left alone.
   */
  async changeFormation(seasonId: string, formation: string) {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: { players: { include: { cachedPlayer: true } } },
    });
    if (!season) return null;

    const starters = season.players.filter((p) => p.isStarter);
    const assignments = assignStartingXI(
      starters.map((p) => ({
        cachedPlayerId: p.cachedPlayerId,
        position: p.cachedPlayer.position ?? undefined,
        overall: p.cachedPlayer.overall ?? undefined,
      })),
      formation,
    );
    const byCachedPlayerId = new Map(starters.map((p) => [p.cachedPlayerId, p]));

    await prisma.$transaction([
      prisma.season.update({ where: { id: seasonId }, data: { formation } }),
      ...assignments.map((a) => {
        const original = byCachedPlayerId.get(a.cachedPlayerId)!;
        return prisma.squadPlayer.update({
          where: { id: original.id },
          data: { positionSlot: a.positionSlot, isStarter: a.isStarter, order: a.order },
        });
      }),
    ]);

    return getSeasonById(seasonId);
  },

  /**
   * Bulk-persists a new field/bench/extras/watchlist arrangement after a
   * drag-and-drop change. Always includes `shirtNumber` (not just the
   * bucket/position fields) because a swap that pulls someone in from
   * extras/watchlist makes them inherit the displaced player's number —
   * client computes the new value, this just needs to save whatever it's
   * given (a no-op resend of the same number for plain reordering).
   */
  async updateSeasonPlayers(
    seasonId: string,
    updates: {
      id: string;
      positionSlot: string | null;
      isStarter: boolean;
      isWatchlist: boolean;
      isExtra: boolean;
      shirtNumber: number | null;
      order: number;
    }[],
  ) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.squadPlayer.update({
          where: { id: u.id, seasonId },
          data: {
            positionSlot: u.positionSlot,
            isStarter: u.isStarter,
            isWatchlist: u.isWatchlist,
            isExtra: u.isExtra,
            shirtNumber: u.shirtNumber,
            order: u.order,
          },
        }),
      ),
    );
  },

  /** Sets shirt number and/or captain for one player. Setting isCaptain clears any previous captain in the season. */
  async updateSeasonPlayer(
    seasonId: string,
    playerId: string,
    data: { shirtNumber?: number | null; isCaptain?: boolean },
  ) {
    if (data.isCaptain) {
      await prisma.squadPlayer.updateMany({
        where: { seasonId, isCaptain: true },
        data: { isCaptain: false },
      });
    }
    return prisma.squadPlayer.update({ where: { id: playerId, seasonId }, data });
  },

  /**
   * Adds any player (identified by source+externalId, from a player
   * search — Kaggle catalog or a live API-Football/TheSportsDB lookup) to
   * the season's bench (or, for national-team seasons, its watchlist).
   * Idempotent: adding a player already in the season just returns their
   * existing row instead of erroring.
   */
  async addPlayerToSeason(
    seasonId: string,
    ref: { source: string; externalId: string },
    destination: "bench" | "watchlist" = "bench",
  ) {
    const player = await playerDataService.getPlayer(ref.source, ref.externalId);
    if (!player) return null;

    const cached = await cacheRepository.getPlayer(ref.source, ref.externalId);
    if (!cached) return null;

    const existing = await prisma.squadPlayer.findUnique({
      where: { seasonId_cachedPlayerId: { seasonId, cachedPlayerId: cached.id } },
      include: { cachedPlayer: true },
    });
    if (existing) return existing;

    const [{ _max }, bucket] = await Promise.all([
      prisma.squadPlayer.aggregate({ where: { seasonId }, _max: { order: true } }),
      resolveDestinationBucket(seasonId, destination),
    ]);

    const squadPlayer = await prisma.squadPlayer.create({
      data: {
        seasonId,
        cachedPlayerId: cached.id,
        isStarter: false,
        ...bucket,
        order: (_max.order ?? -1) + 1,
      },
      include: { cachedPlayer: true },
    });

    // CORREÇÃO: reflete essa entrada no elenco na carreira do jogador,
    // se ele tiver uma — ver comentário em ensureCareerStintForSeason.
    await ensureCareerStintForSeason(cached.id, seasonId);

    return squadPlayer;
  },

  async removePlayerFromSeason(seasonId: string, playerId: string) {
    await prisma.squadPlayer.delete({ where: { id: playerId, seasonId } });
  },

  async getSeasonPlayer(seasonId: string, playerId: string) {
    return prisma.squadPlayer.findUnique({
      where: { id: playerId, seasonId },
      include: { cachedPlayer: true },
    });
  },

  /**
   * Creates a player that exists only in this app (not backed by any
   * provider) — for when a search across Kaggle/API-Football/TheSportsDB
   * still doesn't find who the user wants. Added straight to the bench
   * (or, for national-team seasons, the watchlist); `expiresAt` is set far
   * in the future since there's no source to ever refresh it from.
   */
  async createCustomPlayer(
    seasonId: string,
    input: {
      name: string;
      position?: string;
      secondaryPositions?: string[];
      photoUrl?: string;
      dateOfBirth?: Date;
      nationality?: string;
      overall?: number;
      potential?: number;
      externalLink?: string;
      shirtNumber?: number;
      destination?: "bench" | "watchlist";
    },
  ) {
    const externalId = crypto.randomUUID();
    const cached = await cacheRepository.upsertPlayer(CUSTOM_PLAYER_SOURCE, externalId, {
      name: input.name,
      position: input.position,
      secondaryPositions: input.secondaryPositions ?? [],
      photoUrl: input.photoUrl,
      dateOfBirth: input.dateOfBirth,
      nationality: input.nationality,
      overall: input.overall,
      potential: input.potential,
      externalLink: input.externalLink,
      rawData: { custom: true },
      expiresAt: new Date(Date.now() + CUSTOM_PLAYER_TTL_MS),
    });

    const [{ _max }, bucket] = await Promise.all([
      prisma.squadPlayer.aggregate({ where: { seasonId }, _max: { order: true } }),
      resolveDestinationBucket(seasonId, input.destination ?? "bench"),
    ]);

    return prisma.squadPlayer.create({
      data: {
        seasonId,
        cachedPlayerId: cached.id,
        isStarter: false,
        ...bucket,
        shirtNumber: input.shirtNumber,
        order: (_max.order ?? -1) + 1,
      },
      include: { cachedPlayer: true },
    });
  },
};

const CUSTOM_PLAYER_SOURCE = "custom";
const CUSTOM_PLAYER_TTL_MS = 100 * 365 * 24 * 60 * 60 * 1000;
