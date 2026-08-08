import { prisma } from "@/lib/prisma";
import { playerProfileService } from "./player-profile.service";
import { formatSeasonLabel, formatMoney } from "@/lib/season";
import { sortTimelineEvents, type TimelineEventVM } from "@/lib/timeline";

type TimelineEventRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  year: number;
  month: number | null;
  day: number | null;
  order: number;
  highlight: boolean;
  imageUrl: string | null;
};

function mapManualEvent(row: TimelineEventRow): TimelineEventVM {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    year: row.year,
    month: row.month,
    day: row.day,
    order: row.order,
    isManual: true,
    highlight: row.highlight,
    imageUrl: row.imageUrl,
    sourceType: null,
    sourceId: null,
  };
}

/**
 * Etapa 10.4 — camada de Timeline/História Oficial sobre a arquitetura já
 * existente. CRUD de eventos MANUAIS (a única coisa que este serviço
 * escreve) + 3 métodos de leitura que MISTURAM esses manuais com eventos
 * AUTOMÁTICOS montados na hora a partir de Season/SeasonTitle/Transfer/
 * CompetitionChampion/CareerStint — nunca uma cópia persistida (§1/§5 da
 * etapa). Cada `get*Timeline` usa um número fixo e pequeno de queries
 * (nunca uma por evento — sem N+1, §27).
 */
export const timelineService = {
  async createEvent(input: {
    squadId?: string | null;
    cachedPlayerId?: string | null;
    competitionId?: string | null;
    type: string;
    title: string;
    description?: string | null;
    year: number;
    month?: number | null;
    day?: number | null;
    highlight?: boolean;
    imageUrl?: string | null;
  }) {
    return prisma.timelineEvent.create({
      data: {
        squadId: input.squadId || null,
        cachedPlayerId: input.cachedPlayerId || null,
        competitionId: input.competitionId || null,
        type: input.type,
        title: input.title,
        description: input.description || null,
        year: input.year,
        month: input.month ?? null,
        day: input.day ?? null,
        highlight: input.highlight ?? false,
        imageUrl: input.imageUrl || null,
      },
    });
  },

  /** Só eventos manuais são endereçáveis por id — automático nunca ganha uma linha de banco pra editar (§14). */
  async updateEvent(
    id: string,
    patch: {
      type?: string;
      title?: string;
      description?: string | null;
      year?: number;
      month?: number | null;
      day?: number | null;
      highlight?: boolean;
      imageUrl?: string | null;
    },
  ) {
    return prisma.timelineEvent
      .update({
        where: { id },
        data: {
          ...(patch.type !== undefined && { type: patch.type }),
          ...(patch.title !== undefined && { title: patch.title }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.year !== undefined && { year: patch.year }),
          ...(patch.month !== undefined && { month: patch.month }),
          ...(patch.day !== undefined && { day: patch.day }),
          ...(patch.highlight !== undefined && { highlight: patch.highlight }),
          ...(patch.imageUrl !== undefined && { imageUrl: patch.imageUrl }),
        },
      })
      .catch(() => null);
  },

  async deleteEvent(id: string) {
    return prisma.timelineEvent
      .delete({ where: { id } })
      .then(() => true)
      .catch(() => false);
  },

  /**
   * Fundação (Squad.foundedYear) + uma temporada por Season (nome vira a
   * competição da convocação quando é seleção — mesmo dado da etapa
   * 10.1) + troca de técnico só quando o coachId muda de uma temporada
   * pra outra (nunca repete "mesmo técnico" ano após ano, nunca inventa
   * intervalo de datas) + um evento por SeasonTitle + transferências com
   * valor informado (só clube — "grande transferência" no espírito do
   * exemplo, evita virar uma segunda TransfersCard) + eventos manuais.
   */
  async getSquadTimeline(squadId: string): Promise<TimelineEventVM[]> {
    const squad = await prisma.squad.findUnique({
      where: { id: squadId },
      select: {
        id: true,
        foundedYear: true,
        baseKind: true,
        seasons: {
          select: {
            id: true,
            startYear: true,
            coachId: true,
            coach: { select: { name: true } },
            competitionId: true,
            competition: { select: { name: true } },
            titles: {
              select: { id: true, competition: { select: { name: true, trophyImageUrl: true } } },
            },
          },
          orderBy: { startYear: "asc" },
        },
      },
    });
    if (!squad) return [];

    const isNationalTeam = squad.baseKind === "nationalTeam";

    const [transfers, manual] = await Promise.all([
      isNationalTeam
        ? Promise.resolve([])
        : prisma.transfer.findMany({
            where: { season: { squadId }, value: { not: null } },
            select: {
              id: true,
              type: true,
              playerName: true,
              value: true,
              counterpartClub: true,
              seasonId: true,
              season: { select: { startYear: true } },
            },
          }),
      prisma.timelineEvent.findMany({ where: { squadId } }),
    ]);

    const events: TimelineEventVM[] = [];

    if (squad.foundedYear) {
      events.push({
        id: `foundation:${squad.id}`,
        type: "foundation",
        title: "Fundação",
        year: squad.foundedYear,
        order: 0,
        isManual: false,
        highlight: true,
        sourceType: "squad",
        sourceId: squad.id,
      });
    }

    let previousCoachId: string | null = null;
    for (const season of squad.seasons) {
      events.push({
        id: `season:${season.id}`,
        type: "season",
        title: isNationalTeam && season.competition ? season.competition.name : `Temporada ${season.startYear}`,
        year: season.startYear,
        order: 0,
        isManual: false,
        highlight: false,
        sourceType: "season",
        sourceId: season.id,
        editHref: `/squads/${squadId}/seasons/${season.id}`,
      });

      if (season.coachId && season.coachId !== previousCoachId && season.coach) {
        events.push({
          id: `coach:${season.id}`,
          type: "coach",
          title: `Novo técnico: ${season.coach.name}`,
          year: season.startYear,
          order: 1,
          isManual: false,
          highlight: false,
          sourceType: "season",
          sourceId: season.id,
          editHref: `/squads/${squadId}/seasons/${season.id}`,
        });
      }
      previousCoachId = season.coachId;

      for (const title of season.titles) {
        events.push({
          id: `title:${title.id}`,
          type: "title",
          title: `Campeão: ${title.competition.name}`,
          year: season.startYear,
          order: 2,
          isManual: false,
          highlight: true,
          imageUrl: title.competition.trophyImageUrl,
          sourceType: "seasonTitle",
          sourceId: title.id,
          editHref: `/squads/${squadId}/seasons/${season.id}`,
        });
      }
    }

    for (const t of transfers) {
      events.push({
        id: `transfer:${t.id}`,
        type: "transfer",
        title: t.type === "in" ? `Contratação: ${t.playerName}` : `Venda: ${t.playerName}`,
        description: [t.counterpartClub, t.value != null ? formatMoney(t.value) : null].filter(Boolean).join(" · ") || null,
        year: t.season.startYear,
        order: 3,
        isManual: false,
        highlight: false,
        sourceType: "transfer",
        sourceId: t.id,
        editHref: `/squads/${squadId}/seasons/${t.seasonId}`,
      });
    }

    for (const m of manual) events.push(mapManualEvent(m));

    return sortTimelineEvents(events);
  },

  /**
   * Reaproveita playerProfileService (já eficiente, zero query nova) pra
   * temporadas/transferências/títulos + CareerStint SEM seasonId (os
   * freeform — os que JÁ têm seasonId viram evento via getSeasons acima,
   * incluir os dois duplicaria) + eventos manuais.
   */
  async getPlayerTimeline(cachedPlayerId: string): Promise<TimelineEventVM[]> {
    const [seasons, transfers, titles, freeformStints, manual] = await Promise.all([
      playerProfileService.getSeasons(cachedPlayerId),
      playerProfileService.getTransfers(cachedPlayerId),
      playerProfileService.getTitles(cachedPlayerId),
      prisma.careerStint.findMany({
        where: { career: { cachedPlayerId }, seasonId: null },
        include: { titles: { include: { competition: true } } },
      }),
      prisma.timelineEvent.findMany({ where: { cachedPlayerId } }),
    ]);

    const events: TimelineEventVM[] = [];

    for (const sp of seasons) {
      events.push({
        id: `squadplayer:${sp.id}`,
        type: "season",
        title: `${sp.season.squad.name} — ${formatSeasonLabel(sp.season.startYear, sp.season.squad.seasonCalendar)}${
          sp.season.competition ? ` — ${sp.season.competition.name}` : ""
        }`,
        year: sp.season.startYear,
        order: 0,
        isManual: false,
        highlight: false,
        sourceType: "season",
        sourceId: sp.season.id,
        editHref: `/squads/${sp.season.squad.id}/seasons/${sp.season.id}`,
      });
    }

    for (const t of transfers) {
      events.push({
        id: `transfer:${t.id}`,
        type: "transfer",
        title: t.type === "in" ? `Contratado pelo ${t.season.squad.name}` : `Transferido do ${t.season.squad.name}`,
        description: [t.counterpartClub, t.value != null ? formatMoney(t.value) : null].filter(Boolean).join(" · ") || null,
        year: t.season.startYear,
        order: 1,
        isManual: false,
        highlight: false,
        sourceType: "transfer",
        sourceId: t.id,
        editHref: `/squads/${t.season.squad.id}/seasons/${t.season.id}`,
      });
    }

    for (const title of [...titles.club, ...titles.nationalTeam]) {
      events.push({
        id: `title:${title.id}`,
        type: "title",
        title: `Campeão: ${title.competition.name} (${title.squad.name})`,
        year: title.season.startYear,
        order: 2,
        isManual: false,
        highlight: true,
        imageUrl: title.competition.trophyImageUrl,
        sourceType: "seasonTitle",
        sourceId: title.id,
        editHref: `/squads/${title.squad.id}/seasons/${title.season.id}`,
      });
    }

    for (const stint of freeformStints) {
      events.push({
        id: `careerstint:${stint.id}`,
        type: "season",
        title: `${stint.clubName} — ${formatSeasonLabel(stint.startYear, stint.calendar)}`,
        description: stint.summary,
        year: stint.startYear,
        order: 0,
        isManual: false,
        highlight: false,
        sourceType: "careerStint",
        sourceId: stint.id,
      });
      for (const t of stint.titles) {
        events.push({
          id: `careertitle:${t.id}`,
          type: "title",
          title: `Campeão: ${t.competition.name} (${stint.clubName})`,
          year: stint.startYear,
          order: 2,
          isManual: false,
          highlight: true,
          imageUrl: t.competition.trophyImageUrl,
          sourceType: "careerTitle",
          sourceId: t.id,
        });
      }
    }

    for (const m of manual) events.push(mapManualEvent(m));

    return sortTimelineEvents(events);
  },

  /** CompetitionChampion já é literalmente o exemplo do pedido ("1985 Campeão: Coritiba") + eventos manuais (ex: "1971 — Primeira edição"). */
  async getCompetitionTimeline(competitionId: string): Promise<TimelineEventVM[]> {
    const [champions, manual] = await Promise.all([
      prisma.competitionChampion.findMany({
        where: { competitionId },
        include: { season: { select: { id: true, squadId: true } } },
        orderBy: { year: "asc" },
      }),
      prisma.timelineEvent.findMany({ where: { competitionId } }),
    ]);

    const events: TimelineEventVM[] = [];
    for (const c of champions) {
      events.push({
        id: `champion:${c.id}`,
        type: "title",
        title: `Campeão: ${c.standaloneName}`,
        year: c.year,
        order: 0,
        isManual: false,
        highlight: true,
        imageUrl: c.standaloneLogoUrl,
        sourceType: "competitionChampion",
        sourceId: c.id,
        editHref: c.season ? `/squads/${c.season.squadId}/seasons/${c.season.id}` : null,
      });
    }
    for (const m of manual) events.push(mapManualEvent(m));

    return sortTimelineEvents(events);
  },
};
