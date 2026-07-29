import { prisma } from "@/lib/prisma";
import { cacheRepository } from "@/repositories/cache.repository";
import { getFormationSlots } from "@/lib/formations";
import { normalizePositionCategory } from "@/lib/position-category";
import { clubDataService } from "./club-data.service";
import { nationalTeamDataService } from "./national-team-data.service";
import { playerDataService } from "./player-data.service";
import type { Player } from "@/types/domain";

export interface CreateSquadInput {
  name: string;
  formation?: string;
  /** Auto-loads the base roster from a club or national team, by name (re-resolved live so this doesn't depend on prior cache state). */
  base?: { kind: "club" | "nationalTeam"; name: string };
}

async function resolveBase(
  base: NonNullable<CreateSquadInput["base"]>,
): Promise<{ externalId: string; logoUrl?: string; players: Player[] } | null> {
  if (base.kind === "club") {
    const club = await clubDataService.resolveClub(base.name);
    if (!club) return null;
    return {
      externalId: club.externalId,
      logoUrl: club.logoUrl,
      players: await clubDataService.getClubSquad(club),
    };
  }

  const team = await nationalTeamDataService.resolveNationalTeam(base.name);
  if (!team) return null;
  return {
    externalId: team.externalId,
    logoUrl: team.flagUrl,
    players: await nationalTeamDataService.getNationalTeamSquad(team),
  };
}

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

export const squadService = {
  async listSquads() {
    return prisma.squad.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { players: true } } },
    });
  },

  async getSquad(id: string) {
    return prisma.squad.findUnique({
      where: { id },
      include: { players: { include: { cachedPlayer: true }, orderBy: { order: "asc" } } },
    });
  },

  /**
   * Creates a squad, optionally auto-loading its base roster (§1: "carregando
   * o elenco base automaticamente") and assigning a starting XI across the
   * chosen formation's slots by position. Numbering/captain are left unset
   * — that's the tactical editor's job (roadmap step 11).
   *
   * If loaded from a real club/national team, its badge/flag is copied
   * into `logoUrl` as a one-time convenience default — never re-fetched
   * live afterward (see updateSquad for editing it, including for
   * from-scratch squads that never had one to begin with).
   */
  async createSquad(input: CreateSquadInput) {
    const resolved = input.base ? await resolveBase(input.base) : null;
    const formation = input.formation ?? "4-3-3";

    const squad = await prisma.squad.create({
      data: {
        name: input.name,
        formation,
        baseClubRef: resolved?.externalId,
        logoUrl: resolved?.logoUrl,
      },
    });

    if (resolved && resolved.players.length > 0) {
      const cachedRows = await Promise.all(
        resolved.players.map((p) => cacheRepository.getPlayer(p.source, p.externalId)),
      );
      const validRows = cachedRows.filter((row) => row !== null);

      const assignments = assignStartingXI(
        validRows.map((row) => ({
          cachedPlayerId: row.id,
          position: row.position ?? undefined,
          overall: row.overall ?? undefined,
        })),
        formation,
      );

      if (assignments.length > 0) {
        await prisma.squadPlayer.createMany({
          data: assignments.map((a) => ({ squadId: squad.id, ...a })),
        });
      }
    }

    return squad;
  },

  async updateSquad(
    id: string,
    data: {
      name?: string;
      formation?: string;
      logoUrl?: string | null;
      coachName?: string | null;
      coachPhotoUrl?: string | null;
      coachExternalLink?: string | null;
      notes?: string | null;
    },
  ) {
    return prisma.squad.update({ where: { id }, data });
  },

  async deleteSquad(id: string) {
    await prisma.squad.delete({ where: { id } });
  },

  /** Bulk-persists a new field/bench arrangement after a drag-and-drop change. */
  async updateSquadPlayers(
    squadId: string,
    updates: { id: string; positionSlot: string | null; isStarter: boolean; order: number }[],
  ) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.squadPlayer.update({
          where: { id: u.id, squadId },
          data: { positionSlot: u.positionSlot, isStarter: u.isStarter, order: u.order },
        }),
      ),
    );
  },

  /** Sets shirt number and/or captain for one player. Setting isCaptain clears any previous captain in the squad. */
  async updateSquadPlayer(
    squadId: string,
    playerId: string,
    data: { shirtNumber?: number | null; isCaptain?: boolean },
  ) {
    if (data.isCaptain) {
      await prisma.squadPlayer.updateMany({
        where: { squadId, isCaptain: true },
        data: { isCaptain: false },
      });
    }
    return prisma.squadPlayer.update({ where: { id: playerId, squadId }, data });
  },

  /**
   * Adds any player (identified by source+externalId, from a player
   * search — Kaggle catalog or a live API-Football/TheSportsDB lookup) to
   * the squad's bench. Idempotent: adding a player already in the squad
   * just returns their existing row instead of erroring.
   */
  async addPlayerToSquad(squadId: string, ref: { source: string; externalId: string }) {
    const player = await playerDataService.getPlayer(ref.source, ref.externalId);
    if (!player) return null;

    const cached = await cacheRepository.getPlayer(ref.source, ref.externalId);
    if (!cached) return null;

    const existing = await prisma.squadPlayer.findUnique({
      where: { squadId_cachedPlayerId: { squadId, cachedPlayerId: cached.id } },
      include: { cachedPlayer: true },
    });
    if (existing) return existing;

    const { _max } = await prisma.squadPlayer.aggregate({
      where: { squadId },
      _max: { order: true },
    });

    return prisma.squadPlayer.create({
      data: {
        squadId,
        cachedPlayerId: cached.id,
        isStarter: false,
        order: (_max.order ?? -1) + 1,
      },
      include: { cachedPlayer: true },
    });
  },

  async removePlayerFromSquad(squadId: string, playerId: string) {
    await prisma.squadPlayer.delete({ where: { id: playerId, squadId } });
  },

  async getSquadPlayer(squadId: string, playerId: string) {
    return prisma.squadPlayer.findUnique({
      where: { id: playerId, squadId },
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
    squadId: string,
    squadPlayerId: string,
    patch: {
      name?: string;
      position?: string | null;
      photoUrl?: string | null;
      externalLink?: string | null;
    },
  ) {
    const squadPlayer = await prisma.squadPlayer.findUnique({
      where: { id: squadPlayerId, squadId },
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

    return squadService.getSquadPlayer(squadId, squadPlayerId);
  },

  /**
   * Creates a player that exists only in this app (not backed by any
   * provider) — for when a search across Kaggle/API-Football/TheSportsDB
   * still doesn't find who the user wants. Added straight to the bench;
   * `expiresAt` is set far in the future since there's no source to ever
   * refresh it from.
   */
  async createCustomPlayer(
    squadId: string,
    input: {
      name: string;
      position?: string;
      photoUrl?: string;
      externalLink?: string;
      shirtNumber?: number;
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

    const { _max } = await prisma.squadPlayer.aggregate({
      where: { squadId },
      _max: { order: true },
    });

    return prisma.squadPlayer.create({
      data: {
        squadId,
        cachedPlayerId: cached.id,
        isStarter: false,
        shirtNumber: input.shirtNumber,
        order: (_max.order ?? -1) + 1,
      },
      include: { cachedPlayer: true },
    });
  },

  /**
   * Switches formation and remaps the current starting XI onto the new
   * formation's slots (same greedy category match as initial squad
   * creation), preserving who's a starter — captain/number/bench are
   * untouched. Bench players are left alone.
   */
  async changeFormation(squadId: string, formation: string) {
    const squad = await prisma.squad.findUnique({
      where: { id: squadId },
      include: { players: { include: { cachedPlayer: true } } },
    });
    if (!squad) return null;

    const starters = squad.players.filter((p) => p.isStarter);
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
      prisma.squad.update({ where: { id: squadId }, data: { formation } }),
      ...assignments.map((a) => {
        const original = byCachedPlayerId.get(a.cachedPlayerId)!;
        return prisma.squadPlayer.update({
          where: { id: original.id },
          data: { positionSlot: a.positionSlot, isStarter: a.isStarter, order: a.order },
        });
      }),
    ]);

    return squadService.getSquad(squadId);
  },
};

const CUSTOM_PLAYER_SOURCE = "custom";
const CUSTOM_PLAYER_TTL_MS = 100 * 365 * 24 * 60 * 60 * 1000;
