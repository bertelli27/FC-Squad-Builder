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

  async updateCompetitionTrophy(id: string, trophyImageUrl: string | null) {
    return prisma.competition.update({ where: { id }, data: { trophyImageUrl } });
  },
};
