import { prisma } from "@/lib/prisma";
import { cacheRepository } from "@/repositories/cache.repository";
import { competitionService } from "./competition.service";

/**
 * Standalone (see season.service.ts's getSeasonById for why) so other
 * methods below can reference its return type without a circular
 * `typeof careerService` self-reference.
 */
function getCareerById(id: string) {
  return prisma.playerCareer.findUnique({
    where: { id },
    include: {
      stints: {
        include: {
          titles: { include: { competition: true } },
          competitionStats: { include: { competition: true }, orderBy: { competition: { name: "asc" } } },
          season: { select: { id: true, squadId: true } },
        },
        orderBy: { order: "asc" },
      },
      transfers: { orderBy: { order: "asc" } },
    },
  });
}

async function nextOrder(careerId: string): Promise<number> {
  const [stintMax, transferMax] = await Promise.all([
    prisma.careerStint.aggregate({ where: { careerId }, _max: { order: true } }),
    prisma.careerTransfer.aggregate({ where: { careerId }, _max: { order: true } }),
  ]);
  return Math.max(stintMax._max.order ?? -1, transferMax._max.order ?? -1) + 1;
}

export const careerService = {
  async listCareers() {
    return prisma.playerCareer.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { stints: true } } },
    });
  },

  getCareer: getCareerById,

  /**
   * §14: `playerRef` (source+externalId, from the same player search used
   * everywhere else — see add-player-dialog.tsx) resolves to an existing
   * CachedPlayer instead of creating a disconnected identity when the
   * player is already known. Name/photo are copied once into the career's
   * own fields (never synced afterward) — a career doesn't share
   * CachedPlayer's lifecycle, it can be renamed/re-photographed on its own.
   */
  async createCareer(input: {
    name: string;
    photoUrl?: string | null;
    playerRef?: { source: string; externalId: string };
  }) {
    let cachedPlayerId: string | undefined;
    let photoUrl = input.photoUrl ?? undefined;
    if (input.playerRef) {
      const cached = await cacheRepository.getPlayer(input.playerRef.source, input.playerRef.externalId);
      if (cached) {
        cachedPlayerId = cached.id;
        if (!photoUrl) photoUrl = cached.photoUrl ?? undefined;
      }
    }
    return prisma.playerCareer.create({ data: { name: input.name, photoUrl, cachedPlayerId } });
  },

  async updateCareer(id: string, data: { name?: string; photoUrl?: string | null; summary?: string | null }) {
    return prisma.playerCareer.update({ where: { id }, data });
  },

  async deleteCareer(id: string) {
    await prisma.playerCareer.delete({ where: { id } });
  },

  /**
   * Adds a stint — either linked to an existing club Season (§5/§6: copies
   * its club name/logo/year/calendar once so they don't need retyping,
   * and so the stint survives even if that Season is later deleted — see
   * schema.prisma's comment on CareerStint) or fully manual for a club
   * that was never modeled in the Clubes module.
   */
  async addStint(
    careerId: string,
    input: {
      kind?: "club" | "nationalTeam";
      seasonId?: string;
      clubName?: string;
      clubLogoUrl?: string;
      startYear?: number;
      calendar?: string;
    },
  ) {
    let clubName = input.clubName;
    let clubLogoUrl = input.clubLogoUrl;
    let startYear = input.startYear;
    let calendar = input.calendar ?? "brasileiro";
    let seasonId: string | undefined;
    const kind = input.kind ?? "club";

    if (input.seasonId) {
      const season = await prisma.season.findUnique({
        where: { id: input.seasonId },
        include: { squad: true },
      });
      if (!season) return null;
      seasonId = season.id;
      clubName = season.squad.name;
      clubLogoUrl = season.squad.logoUrl ?? undefined;
      startYear = season.startYear;
      calendar = season.squad.seasonCalendar;
    }

    if (!clubName?.trim() || startYear === undefined) return null;

    const order = await nextOrder(careerId);
    return prisma.careerStint.create({
      data: { careerId, seasonId, kind, clubName, clubLogoUrl, startYear, calendar, order },
      include: {
        titles: { include: { competition: true } },
        competitionStats: { include: { competition: true } },
      },
    });
  },

  async updateStint(
    stintId: string,
    data: {
      clubName?: string;
      clubLogoUrl?: string | null;
      startYear?: number;
      calendar?: string;
      appearances?: number;
      goals?: number;
      assists?: number;
      summary?: string | null;
    },
  ) {
    return prisma.careerStint.update({ where: { id: stintId }, data });
  },

  async removeStint(careerId: string, stintId: string) {
    await prisma.careerStint.delete({ where: { id: stintId, careerId } });
  },

  /** Same resolve-or-create-competition pattern as seasonService.addTitle. */
  async addStintTitle(
    stintId: string,
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

    const existing = await prisma.careerTitle.findUnique({
      where: { stintId_competitionId: { stintId, competitionId } },
      include: { competition: true },
    });
    if (existing) return existing;

    return prisma.careerTitle.create({
      data: { stintId, competitionId },
      include: { competition: true },
    });
  },

  async removeStintTitle(stintId: string, titleId: string) {
    await prisma.careerTitle.delete({ where: { id: titleId, stintId } });
  },

  /**
   * §3/§4: starts tracking a competition for a national-team stint (zeroed
   * row) — same resolve-or-create-competition + idempotent-per-competition
   * pattern as addStintTitle/seasonService.addTitle/playerStatsService.
   */
  async addStintCompetitionStats(
    stintId: string,
    input: { competitionId?: string; competitionName?: string },
  ) {
    let competitionId = input.competitionId;
    if (!competitionId) {
      if (!input.competitionName?.trim()) return null;
      const competition = await competitionService.findOrCreateCompetition(input.competitionName);
      competitionId = competition.id;
    }

    const existing = await prisma.careerStintCompetitionStats.findUnique({
      where: { stintId_competitionId: { stintId, competitionId } },
      include: { competition: true },
    });
    if (existing) return existing;

    return prisma.careerStintCompetitionStats.create({
      data: { stintId, competitionId },
      include: { competition: true },
    });
  },

  async updateStintCompetitionStats(
    statsId: string,
    data: { appearances?: number; goals?: number; assists?: number },
  ) {
    return prisma.careerStintCompetitionStats.update({ where: { id: statsId }, data });
  },

  async removeStintCompetitionStats(stintId: string, statsId: string) {
    await prisma.careerStintCompetitionStats.delete({ where: { id: statsId, stintId } });
  },

  /** §2/§3: a "Clube A → Clube B, €valor" event sitting in the timeline between two stints. */
  async addTransfer(
    careerId: string,
    input: { fromClubName?: string; toClubName: string; value?: number; year: number },
  ) {
    const order = await nextOrder(careerId);
    return prisma.careerTransfer.create({
      data: {
        careerId,
        fromClubName: input.fromClubName?.trim() || null,
        toClubName: input.toClubName.trim(),
        value: input.value ?? null,
        year: input.year,
        order,
      },
    });
  },

  async removeTransfer(careerId: string, transferId: string) {
    await prisma.careerTransfer.delete({ where: { id: transferId, careerId } });
  },
};
