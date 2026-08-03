import { prisma } from "@/lib/prisma";
import { cacheRepository } from "@/repositories/cache.repository";
import { getFormationSlots } from "@/lib/formations";
import { normalizePositionCategory } from "@/lib/position-category";
import { playerDataService } from "./player-data.service";
import { NATIONAL_TEAM_SQUAD_SIZE } from "@/lib/national-team";
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
      players: { include: { cachedPlayer: true }, orderBy: { order: "asc" } },
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
          coachName: source.coachName,
          coachPhotoUrl: source.coachPhotoUrl,
          coachExternalLink: source.coachExternalLink,
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
      }

      return { season: (await getSeasonById(season.id))! };
    }

    const season = await prisma.season.create({ data: { squadId, startYear: input.startYear } });
    return { season: (await getSeasonById(season.id))! };
  },

  async updateSeason(
    id: string,
    data: {
      formation?: string;
      coachName?: string | null;
      coachPhotoUrl?: string | null;
      coachExternalLink?: string | null;
      notes?: string | null;
    },
  ) {
    return prisma.season.update({ where: { id }, data });
  },

  async deleteSeason(id: string) {
    await prisma.season.delete({ where: { id } });
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

    return prisma.squadPlayer.create({
      data: {
        seasonId,
        cachedPlayerId: cached.id,
        isStarter: false,
        ...bucket,
        order: (_max.order ?? -1) + 1,
      },
      include: { cachedPlayer: true },
    });
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
   * Edits a custom player's own details (name/position/photo/link) — the
   * fields the user typed in by hand when there was no matching provider
   * result. Deliberately refuses to touch anything whose CachedPlayer
   * source isn't "custom": that would violate §7's "cache is only ever a
   * mirror, never edited by the user" guarantee for real provider data.
   * Returns null both when the SquadPlayer doesn't exist and when it does
   * but isn't custom, so the route can 404/403 without leaking which case.
   */
  async updateCustomPlayerDetails(
    seasonId: string,
    squadPlayerId: string,
    patch: {
      name?: string;
      position?: string | null;
      photoUrl?: string | null;
      externalLink?: string | null;
    },
  ) {
    const squadPlayer = await prisma.squadPlayer.findUnique({
      where: { id: squadPlayerId, seasonId },
      include: { cachedPlayer: true },
    });
    if (!squadPlayer || squadPlayer.cachedPlayer.source !== CUSTOM_PLAYER_SOURCE) return null;

    await prisma.cachedPlayer.update({
      where: { id: squadPlayer.cachedPlayerId },
      data: {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.position !== undefined && { position: patch.position }),
        ...(patch.photoUrl !== undefined && { photoUrl: patch.photoUrl }),
        ...(patch.externalLink !== undefined && { externalLink: patch.externalLink }),
      },
    });

    return seasonService.getSeasonPlayer(seasonId, squadPlayerId);
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
      photoUrl?: string;
      externalLink?: string;
      shirtNumber?: number;
      destination?: "bench" | "watchlist";
    },
  ) {
    const externalId = crypto.randomUUID();
    const cached = await cacheRepository.upsertPlayer(CUSTOM_PLAYER_SOURCE, externalId, {
      name: input.name,
      position: input.position,
      photoUrl: input.photoUrl,
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
