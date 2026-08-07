import { prisma } from "@/lib/prisma";

/**
 * A coach (§ nova etapa) exists once and is reused by every Season that
 * assigns them (Season.coachId) — editing one propagates everywhere they're
 * used, same "reference not sync" principle as Competition/CachedPlayer.
 */
export const coachService = {
  async listCoaches(query?: string) {
    return prisma.coach.findMany({
      where: query?.trim() ? { name: { contains: query.trim(), mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
    });
  },

  /** Nova etapa — Gerenciamento: distinct clubs this coach has been assigned to, deduped by Squad.id (mirrors playerDataService.getLinkedClubsByPlayer). */
  async listCoachesWithClubs(query?: string) {
    const coaches = await prisma.coach.findMany({
      where: query?.trim() ? { name: { contains: query.trim(), mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
      include: { seasons: { select: { squad: { select: { id: true, name: true, logoUrl: true } } } } },
    });
    return coaches.map((coach) => {
      const seen = new Map<string, { name: string; logoUrl: string | null }>();
      for (const season of coach.seasons) seen.set(season.squad.id, season.squad);
      return {
        id: coach.id,
        name: coach.name,
        photoUrl: coach.photoUrl,
        externalLink: coach.externalLink,
        clubs: [...seen.values()],
      };
    });
  },

  /** Etapa 10.2 — perfil do técnico (/coaches/[id]): temporadas em que atuou, mais recente primeiro, cada uma linkando pra /squads/[squadId]/seasons/[seasonId]. */
  async getCoachDetail(id: string) {
    return prisma.coach.findUnique({
      where: { id },
      include: {
        seasons: {
          include: { squad: { select: { id: true, name: true, logoUrl: true, seasonCalendar: true } } },
          orderBy: { startYear: "desc" },
        },
      },
    });
  },

  /**
   * Plain create — used by the season's "Técnico" editor's "+ Novo
   * técnico" (EditSeasonCoachDialog already lists every existing coach to
   * pick from; if the user still chose "novo" and typed a name that
   * matches one of them, that's presumably a different person with the
   * same name, never silently merged — see the Coach model comment on
   * name not being unique).
   */
  async createCoach(name: string, photoUrl?: string | null, externalLink?: string | null) {
    return prisma.coach.create({
      data: { name: name.trim(), photoUrl: photoUrl || null, externalLink: externalLink || null },
    });
  },

  /**
   * Find-or-create BY NAME — only for squad import (§ squad-transfer.
   * service.ts), mirroring competitionService.findOrCreateCompetition so
   * re-importing the same export file doesn't pile up duplicate coaches.
   * Reuses the first match; name isn't unique so this is a best-effort
   * default for that one scenario, not a general "same name = same
   * person" rule (see createCoach above for the opposite default).
   */
  async findOrCreateCoach(name: string, photoUrl?: string | null, externalLink?: string | null) {
    const trimmed = name.trim();
    const existing = await prisma.coach.findFirst({ where: { name: trimmed } });
    if (existing) return existing;
    return prisma.coach.create({
      data: { name: trimmed, photoUrl: photoUrl || null, externalLink: externalLink || null },
    });
  },

  async updateCoach(id: string, patch: { name?: string; photoUrl?: string | null; externalLink?: string | null }) {
    return prisma.coach
      .update({
        where: { id },
        data: {
          ...(patch.name !== undefined && { name: patch.name.trim() }),
          ...(patch.photoUrl !== undefined && { photoUrl: patch.photoUrl }),
          ...(patch.externalLink !== undefined && { externalLink: patch.externalLink }),
        },
      })
      .catch(() => null);
  },

  /** How many temporadas reference this coach — shown before offering "excluir" (§31: confirmar, nunca apagar histórico automaticamente). */
  async getCoachUsage(id: string) {
    const seasonCount = await prisma.season.count({ where: { coachId: id } });
    return { seasonCount };
  },

  /**
   * Deleting a coach only clears Season.coachId (ON DELETE SET NULL) —
   * never removes the seasons themselves, clubs, stats, titles, etc. §32:
   * "excluir técnico" and "remover/trocar o técnico de uma temporada" stay
   * two separate actions.
   */
  async deleteCoach(id: string): Promise<boolean> {
    return prisma.coach
      .delete({ where: { id } })
      .then(() => true)
      .catch(() => false);
  },
};
