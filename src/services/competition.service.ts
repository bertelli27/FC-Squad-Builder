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

  async getCompetition(id: string) {
    return prisma.competition.findUnique({
      where: { id },
      include: {
        champions: {
          orderBy: { year: "asc" }, // §52: cronológico, mais antigo primeiro
          include: { season: { select: { id: true, squadId: true, startYear: true } } },
        },
      },
    });
  },

  /**
   * Etapa 9 — Gerenciamento: cria uma competição já com a classificação
   * completa (kind/category/organizer/country/description), diferente de
   * findOrCreateCompetition (usado pelos fluxos de título/estatística, que
   * só conhecem nome + eventualmente troféu).
   */
  async createCompetition(input: {
    name: string;
    logoUrl?: string | null;
    trophyImageUrl?: string | null;
    kind?: string | null;
    category?: string | null;
    organizer?: string | null;
    country?: string | null;
    description?: string | null;
  }) {
    return prisma.competition
      .create({
        data: {
          name: input.name.trim(),
          logoUrl: input.logoUrl || null,
          trophyImageUrl: input.trophyImageUrl || null,
          kind: input.kind || null,
          category: input.category || null,
          organizer: input.organizer || null,
          country: input.country || null,
          description: input.description || null,
        },
      })
      .catch(() => null);
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
   * Nova etapa — Gerenciamento: general edit on an existing competition —
   * the gap the etapa exists to close, since until now a competition's
   * trophy could only ever be set once, at creation time
   * (findOrCreateCompetition above leaves an existing row's trophy
   * untouched). Every SeasonTitle/CareerTitle/*CompetitionStats joins to
   * Competition live (never copies name/trophyImageUrl), so this
   * propagates everywhere the competition is shown without touching any
   * of those rows. Returns null on a name collision (the `name` unique
   * constraint) instead of throwing, same convention as
   * playerDataService.updatePlayer.
   */
  async updateCompetition(
    id: string,
    patch: {
      name?: string;
      logoUrl?: string | null;
      trophyImageUrl?: string | null;
      kind?: string | null;
      category?: string | null;
      organizer?: string | null;
      country?: string | null;
      description?: string | null;
    },
  ) {
    return prisma.competition
      .update({
        where: { id },
        data: {
          ...(patch.name !== undefined && { name: patch.name.trim() }),
          ...(patch.logoUrl !== undefined && { logoUrl: patch.logoUrl }),
          ...(patch.trophyImageUrl !== undefined && { trophyImageUrl: patch.trophyImageUrl }),
          ...(patch.kind !== undefined && { kind: patch.kind }),
          ...(patch.category !== undefined && { category: patch.category }),
          ...(patch.organizer !== undefined && { organizer: patch.organizer }),
          ...(patch.country !== undefined && { country: patch.country }),
          ...(patch.description !== undefined && { description: patch.description }),
        },
      })
      .catch(() => null);
  },

  /** Distinct organizer values already in use, for the "+ novo organizador" autocomplete (§33/35) — not a real entity, just reused free text. */
  async listOrganizers() {
    const rows = await prisma.competition.findMany({
      where: { organizer: { not: null } },
      select: { organizer: true },
      distinct: ["organizer"],
      orderBy: { organizer: "asc" },
    });
    return rows.map((r) => r.organizer!).filter(Boolean);
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

  // ── Histórico de campeões (etapa 9, §40-53) ──────────────────────────

  /**
   * Modo A (standalone) quando `seasonId` não é passado — o chamador já
   * deve ter validado que veio nome/logo/país digitados. Modo B (vinculado)
   * quando `seasonId` é passado: copia nome/logo do Squad no momento do
   * vínculo (snapshot, nunca sincronizado depois — mesmo princípio de
   * CareerStint.clubName) para standaloneName/standaloneLogoUrl, que
   * seguem funcionando como legenda de exibição mesmo se a Season for
   * apagada depois (onDelete: SetNull só limpa seasonId).
   */
  async addChampion(
    competitionId: string,
    input:
      | { year: number; seasonId: string }
      | { year: number; standaloneName: string; standaloneLogoUrl?: string | null; standaloneCountry?: string | null },
  ) {
    if ("seasonId" in input) {
      const season = await prisma.season.findUnique({ where: { id: input.seasonId }, include: { squad: true } });
      if (!season) return null;
      return prisma.competitionChampion
        .create({
          data: {
            competitionId,
            year: input.year,
            seasonId: season.id,
            standaloneName: season.squad.name,
            standaloneLogoUrl: season.squad.logoUrl,
          },
        })
        .catch(() => null);
    }

    if (!input.standaloneName.trim()) return null;
    return prisma.competitionChampion
      .create({
        data: {
          competitionId,
          year: input.year,
          standaloneName: input.standaloneName.trim(),
          standaloneLogoUrl: input.standaloneLogoUrl || null,
          standaloneCountry: input.standaloneCountry || null,
        },
      })
      .catch(() => null);
  },

  /**
   * Editar um campeão — pode trocar o ano, re-vincular a outra Season
   * (copiando nome/logo dela de novo, mesmo princípio de addChampion), ou
   * desvincular e virar standalone (passando seasonId: null explicitamente
   * junto com os campos standalone*).
   */
  async updateChampion(
    id: string,
    patch: {
      year?: number;
      seasonId?: string | null;
      standaloneName?: string;
      standaloneLogoUrl?: string | null;
      standaloneCountry?: string | null;
    },
  ) {
    if (patch.seasonId) {
      const season = await prisma.season.findUnique({ where: { id: patch.seasonId }, include: { squad: true } });
      if (!season) return null;
      return prisma.competitionChampion
        .update({
          where: { id },
          data: {
            ...(patch.year !== undefined && { year: patch.year }),
            seasonId: season.id,
            standaloneName: season.squad.name,
            standaloneLogoUrl: season.squad.logoUrl,
            standaloneCountry: null,
          },
        })
        .catch(() => null);
    }

    return prisma.competitionChampion
      .update({
        where: { id },
        data: {
          ...(patch.year !== undefined && { year: patch.year }),
          ...(patch.seasonId === null && { seasonId: null }),
          ...(patch.standaloneName !== undefined && { standaloneName: patch.standaloneName.trim() }),
          ...(patch.standaloneLogoUrl !== undefined && { standaloneLogoUrl: patch.standaloneLogoUrl }),
          ...(patch.standaloneCountry !== undefined && { standaloneCountry: patch.standaloneCountry }),
        },
      })
      .catch(() => null);
  },

  /** Remove só o registro do histórico — nunca o Squad/Season vinculado (§51). */
  async removeChampion(id: string) {
    await prisma.competitionChampion.delete({ where: { id } }).catch(() => null);
  },
};
