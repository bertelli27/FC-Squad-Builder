import { prisma } from "@/lib/prisma";

/**
 * A competition (Brasileirão, Paranaense, Copa do Brasil...) exists once
 * and is reused by every SeasonTitle across every club/season that won it
 * — so its trophy image (user-provided, never invented) only needs to be
 * set once and every title referencing it shows the same trophy.
 */
export const competitionService = {
  async listCompetitions() {
    return prisma.competition.findMany({ orderBy: { name: "asc" } });
  },

  /**
   * Creates a brand-new competition. If the name already exists, returns
   * the existing row untouched (including its trophy) rather than
   * silently overwriting it — a typed name matching an existing
   * competition means "reuse that one", not "replace its trophy".
   */
  async findOrCreateCompetition(name: string, trophyImageUrl?: string | null) {
    const trimmed = name.trim();
    const existing = await prisma.competition.findUnique({ where: { name: trimmed } });
    if (existing) return existing;
    return prisma.competition.create({
      data: { name: trimmed, trophyImageUrl: trophyImageUrl || null },
    });
  },

  /**
   * Nova etapa — Gerenciamento: general edit (name and/or trophy image) on
   * an existing competition — the gap the etapa exists to close, since
   * until now a competition's trophy could only ever be set once, at
   * creation time (findOrCreateCompetition above leaves an existing row's
   * trophy untouched). Every SeasonTitle/CareerTitle/*CompetitionStats
   * joins to Competition live (never copies name/trophyImageUrl), so this
   * propagates everywhere the competition is shown without touching any
   * of those rows. Returns null on a name collision (the `name` unique
   * constraint) instead of throwing, same convention as
   * playerDataService.updatePlayer.
   */
  async updateCompetition(
    id: string,
    patch: { name?: string; logoUrl?: string | null; trophyImageUrl?: string | null },
  ) {
    return prisma.competition
      .update({
        where: { id },
        data: {
          ...(patch.name !== undefined && { name: patch.name.trim() }),
          ...(patch.logoUrl !== undefined && { logoUrl: patch.logoUrl }),
          ...(patch.trophyImageUrl !== undefined && { trophyImageUrl: patch.trophyImageUrl }),
        },
      })
      .catch(() => null);
  },

  /**
   * How many historical records reference this competition — shown as an
   * impact summary before a delete is even attempted (the 4 FKs into
   * Competition are all ON DELETE RESTRICT, so the DB would refuse the
   * delete anyway; this just turns that into a clear message instead of a
   * raw constraint-violation error, and lets the UI skip even offering
   * the destructive action when it can't succeed).
   */
  async getCompetitionUsage(id: string) {
    const [titleCount, careerTitleCount, statsCount, careerStatsCount] = await Promise.all([
      prisma.seasonTitle.count({ where: { competitionId: id } }),
      prisma.careerTitle.count({ where: { competitionId: id } }),
      prisma.playerCompetitionStats.count({ where: { competitionId: id } }),
      prisma.careerStintCompetitionStats.count({ where: { competitionId: id } }),
    ]);
    return {
      titleCount: titleCount + careerTitleCount,
      statsCount: statsCount + careerStatsCount,
      total: titleCount + careerTitleCount + statsCount + careerStatsCount,
    };
  },

  /** Only ever called after getCompetitionUsage confirms zero dependents — see the API route. */
  async deleteCompetition(id: string): Promise<boolean> {
    return prisma.competition
      .delete({ where: { id } })
      .then(() => true)
      .catch(() => false);
  },
};
