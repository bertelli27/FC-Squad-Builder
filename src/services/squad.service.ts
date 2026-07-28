import { prisma } from "@/lib/prisma";
import { cacheRepository } from "@/repositories/cache.repository";
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

export const squadService = {
  async listSquads() {
    return prisma.squad.findMany({ orderBy: { updatedAt: "desc" } });
  },

  async getSquad(id: string) {
    return prisma.squad.findUnique({
      where: { id },
      include: { players: { include: { cachedPlayer: true }, orderBy: { order: "asc" } } },
    });
  },

  /**
   * Creates a squad, optionally auto-loading its base roster (§1: "carregando
   * o elenco base automaticamente"). Loaded players are inserted as
   * starters with no shirt number/captain — customizing those is the
   * editor's job (roadmap step 11), not squad creation.
   */
  async createSquad(input: CreateSquadInput) {
    const resolved = input.base ? await resolveBase(input.base) : null;

    const squad = await prisma.squad.create({
      data: {
        name: input.name,
        formation: input.formation ?? "4-3-3",
        baseClubRef: resolved?.externalId,
      },
    });

    if (resolved && resolved.players.length > 0) {
      const cachedRows = await Promise.all(
        resolved.players.map((p) => cacheRepository.getPlayer(p.source, p.externalId)),
      );
      const data = cachedRows.flatMap((row, index) =>
        row ? [{ squadId: squad.id, cachedPlayerId: row.id, order: index }] : [],
      );
      if (data.length > 0) await prisma.squadPlayer.createMany({ data });
    }

    return squad;
  },

  async updateSquad(id: string, data: { name?: string; formation?: string }) {
    return prisma.squad.update({ where: { id }, data });
  },

  async deleteSquad(id: string) {
    await prisma.squad.delete({ where: { id } });
  },
};
