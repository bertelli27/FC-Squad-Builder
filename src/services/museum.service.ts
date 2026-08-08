import { prisma } from "@/lib/prisma";
import { statisticsService } from "./statistics.service";
import { sortPlayerAggregates } from "@/lib/statistics";
import { formatMoney } from "@/lib/season";
import type { MuseumRecordVM, MuseumMomentVM } from "@/lib/museum";

/** Categorias relevantes pra "Grandes Momentos" (Museu §12) — deliberadamente sem "season"/"competition" (eventos rotineiros, não marcantes). */
const GREAT_MOMENT_TYPES = ["foundation", "title", "campaign", "record", "history", "stadium", "crest", "kit", "coach"];

export interface AutomaticRecordFilters {
  kind?: "club" | "nationalTeam";
  squadId?: string;
  competitionId?: string;
  fromYear?: number;
  toYear?: number;
}

type MomentEventRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  year: number;
  month: number | null;
  day: number | null;
  highlight: boolean;
  imageUrl: string | null;
  squad: { id: string; name: string } | null;
  cachedPlayer: { id: string; name: string } | null;
  competition: { id: string; name: string } | null;
};

function mapMomentEvent(event: MomentEventRow): MuseumMomentVM {
  const entity = event.squad
    ? { name: event.squad.name, href: `/squads/${event.squad.id}` }
    : event.cachedPlayer
      ? { name: event.cachedPlayer.name, href: `/players/${event.cachedPlayer.id}` }
      : event.competition
        ? { name: event.competition.name, href: `/management/competitions/${event.competition.id}` }
        : { name: "—", href: "/museum" };

  return {
    id: event.id,
    type: event.type,
    title: event.title,
    description: event.description,
    year: event.year,
    month: event.month,
    day: event.day,
    highlight: event.highlight,
    imageUrl: event.imageUrl,
    entity,
  };
}

/**
 * Etapa 10.6 — Museu. Camada de apresentação histórica que só COMPÕE dado
 * já existente — nenhum número é recalculado ou copiado aqui:
 * - Recordes automáticos → `statisticsService` (mesmo motor da etapa 10.5).
 * - Grandes Momentos / Recordes Históricos → leitura direta (nova, cross-
 *   entity) de `TimelineEvent` — só eventos MANUAIS viram linha ali
 *   (automáticos são calculados em memória por `timelineService` e nunca
 *   persistidos), então esta query já é, por construção, só história
 *   registrada à mão, sem precisar filtrar nada a mais.
 */
export const museumService = {
  async getAutomaticRecords(filters: AutomaticRecordFilters = {}): Promise<MuseumRecordVM[]> {
    const playerFilters = {
      kind: filters.kind,
      squadId: filters.squadId,
      competitionId: filters.competitionId,
      fromYear: filters.fromYear,
      toYear: filters.toYear,
    };

    const [aggregates, titleCounts, topClubs, purchases, sales] = await Promise.all([
      statisticsService.getPlayerAggregates(playerFilters),
      statisticsService.getPlayerTitleCounts(playerFilters),
      statisticsService.getTopClubsByTitles({ kind: filters.kind, competitionId: filters.competitionId }),
      statisticsService.getBiggestPurchases({ squadId: filters.squadId, fromYear: filters.fromYear, toYear: filters.toYear, limit: 1 }),
      statisticsService.getBiggestSales({ squadId: filters.squadId, fromYear: filters.fromYear, toYear: filters.toYear, limit: 1 }),
    ]);

    const topScorer = sortPlayerAggregates(aggregates, "goals")[0];
    const topAssist = sortPlayerAggregates(aggregates, "assists")[0];
    const mostAppearances = sortPlayerAggregates(aggregates, "appearances")[0];
    const topContributions = sortPlayerAggregates(aggregates, "contributions")[0];
    const topClub = topClubs[0];
    const topTitlePlayer = titleCounts[0];
    const purchase = purchases[0];
    const sale = sales[0];

    return [
      {
        key: "topScorer",
        valueLabel: topScorer ? `${topScorer.goals} gols` : "Sem dados ainda",
        entity: topScorer
          ? { name: topScorer.cachedPlayer.name, imageUrl: topScorer.cachedPlayer.photoUrl, href: `/players/${topScorer.cachedPlayer.id}` }
          : null,
      },
      {
        key: "topAssist",
        valueLabel: topAssist ? `${topAssist.assists} assistências` : "Sem dados ainda",
        entity: topAssist
          ? { name: topAssist.cachedPlayer.name, imageUrl: topAssist.cachedPlayer.photoUrl, href: `/players/${topAssist.cachedPlayer.id}` }
          : null,
      },
      {
        key: "mostAppearances",
        valueLabel: mostAppearances ? `${mostAppearances.appearances} jogos` : "Sem dados ainda",
        entity: mostAppearances
          ? {
              name: mostAppearances.cachedPlayer.name,
              imageUrl: mostAppearances.cachedPlayer.photoUrl,
              href: `/players/${mostAppearances.cachedPlayer.id}`,
            }
          : null,
      },
      {
        key: "topContributions",
        valueLabel: topContributions ? `${topContributions.goals + topContributions.assists} participações em gols` : "Sem dados ainda",
        entity: topContributions
          ? {
              name: topContributions.cachedPlayer.name,
              imageUrl: topContributions.cachedPlayer.photoUrl,
              href: `/players/${topContributions.cachedPlayer.id}`,
            }
          : null,
      },
      {
        key: "mostClubTitles",
        valueLabel: topClub ? `${topClub.count}× título${topClub.count === 1 ? "" : "s"}` : "Sem dados ainda",
        entity: topClub ? { name: topClub.squad.name, imageUrl: topClub.squad.logoUrl, href: `/squads/${topClub.squad.id}` } : null,
      },
      {
        key: "mostPlayerTitles",
        valueLabel: topTitlePlayer ? `${topTitlePlayer.count}× título${topTitlePlayer.count === 1 ? "" : "s"}` : "Sem dados ainda",
        entity: topTitlePlayer
          ? {
              name: topTitlePlayer.cachedPlayer.name,
              imageUrl: topTitlePlayer.cachedPlayer.photoUrl,
              href: `/players/${topTitlePlayer.cachedPlayer.id}`,
            }
          : null,
      },
      {
        key: "biggestPurchase",
        valueLabel: purchase?.value != null ? formatMoney(purchase.value) : "Sem dados ainda",
        entity: purchase
          ? {
              name: purchase.playerName,
              imageUrl: purchase.cachedPlayer?.photoUrl ?? null,
              href: purchase.cachedPlayer ? `/players/${purchase.cachedPlayer.id}` : null,
            }
          : null,
      },
      {
        key: "biggestSale",
        valueLabel: sale?.value != null ? formatMoney(sale.value) : "Sem dados ainda",
        entity: sale
          ? { name: sale.playerName, imageUrl: sale.cachedPlayer?.photoUrl ?? null, href: sale.cachedPlayer ? `/players/${sale.cachedPlayer.id}` : null }
          : null,
      },
    ];
  },

  /** "Grandes Momentos" (§12) — eventos manuais em destaque OU de categoria marcante, de qualquer entidade. */
  async getGreatMoments(limit = 12): Promise<MuseumMomentVM[]> {
    const events = await prisma.timelineEvent.findMany({
      where: { OR: [{ highlight: true }, { type: { in: GREAT_MOMENT_TYPES } }] },
      orderBy: [{ year: "desc" }, { month: "desc" }, { day: "desc" }, { order: "desc" }],
      take: limit,
      include: {
        squad: { select: { id: true, name: true } },
        cachedPlayer: { select: { id: true, name: true } },
        competition: { select: { id: true, name: true } },
      },
    });
    return events.map(mapMomentEvent);
  },

  /** "Recordes Históricos" (§3/§11) — eventos manuais tipo "record" (ex: "Maior público — 65.000 — 1983"), nunca calculados. */
  async getHistoricalRecords(limit?: number): Promise<MuseumMomentVM[]> {
    const events = await prisma.timelineEvent.findMany({
      where: { type: "record" },
      orderBy: [{ year: "desc" }, { month: "desc" }, { day: "desc" }, { order: "desc" }],
      take: limit,
      include: {
        squad: { select: { id: true, name: true } },
        cachedPlayer: { select: { id: true, name: true } },
        competition: { select: { id: true, name: true } },
      },
    });
    return events.map(mapMomentEvent);
  },

  /** Composição pra `/museum` (hub) — uma chamada só, sem N+1. */
  async getOverview() {
    const [records, moments, historicalRecords, biggestTransfers, topClubsByTitles] = await Promise.all([
      this.getAutomaticRecords(),
      this.getGreatMoments(6),
      this.getHistoricalRecords(4),
      statisticsService.getBiggestTransfers({ limit: 5 }),
      statisticsService.getTopClubsByTitles(),
    ]);
    return { records, moments, historicalRecords, biggestTransfers, topClubsByTitles };
  },
};
