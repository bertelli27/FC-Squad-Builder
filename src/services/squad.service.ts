import { prisma } from "@/lib/prisma";
import { cacheRepository } from "@/repositories/cache.repository";
import { getFormationSlots } from "@/lib/formations";
import { normalizePositionCategory } from "@/lib/position-category";
import { clubDataService } from "./club-data.service";
import { nationalTeamDataService } from "./national-team-data.service";
import type { Player } from "@/types/domain";

export interface CreateSquadInput {
  name: string;
  formation?: string;
  /** Auto-loads the base roster from a club or national team, by name (re-resolved live so this doesn't depend on prior cache state). */
  base?: { kind: "club" | "nationalTeam"; name: string };
}

async function resolveBase(
  base: NonNullable<CreateSquadInput["base"]>,
): Promise<{ externalId: string; players: Player[] } | null> {
  if (base.kind === "club") {
    const club = await clubDataService.resolveClub(base.name);
    if (!club) return null;
    return { externalId: club.externalId, players: await clubDataService.getClubSquad(club) };
  }

  const team = await nationalTeamDataService.resolveNationalTeam(base.name);
  if (!team) return null;
  return {
    externalId: team.externalId,
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
   */
  async createSquad(input: CreateSquadInput) {
    const resolved = input.base ? await resolveBase(input.base) : null;
    const formation = input.formation ?? "4-3-3";

    const squad = await prisma.squad.create({
      data: { name: input.name, formation, baseClubRef: resolved?.externalId },
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

  async updateSquad(id: string, data: { name?: string; formation?: string }) {
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
};
