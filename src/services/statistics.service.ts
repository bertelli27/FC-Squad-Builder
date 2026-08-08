import { prisma } from "@/lib/prisma";
import { sortPlayerAggregates, type PlayerAggregateRow } from "@/lib/statistics";

export type { PlayerAggregateRow } from "@/lib/statistics";

export interface PlayerStatsFilters {
  /** "club" | "nationalTeam" | undefined (todos). Mesmo padrão NULL-safe de squadService.listForManagement — baseKind null conta como clube. */
  kind?: "club" | "nationalTeam";
  squadId?: string;
  competitionId?: string;
  fromYear?: number;
  toYear?: number;
  search?: string;
}

// Mesmo padrão NULL-safe de squadService.listForManagement: SQL "<>
// 'nationalTeam'" exclui linhas com baseKind NULL (a maioria dos clubes
// "do zero") — precisa do OR explícito. Retorna o fragmento `where` do
// Squad inteiro (não só o valor de baseKind), já que o caso "club" exige
// um OR no nível do Squad, não dentro do próprio campo.
function squadKindWhere(kind?: "club" | "nationalTeam") {
  if (!kind) return undefined;
  return kind === "nationalTeam" ? { baseKind: "nationalTeam" } : { OR: [{ baseKind: null }, { baseKind: { not: "nationalTeam" } }] };
}

// BUG real corrigido (achado pelo QA): dois spreads separados escrevendo a
// mesma chave `startYear` (um com `gte`, outro com `lte`) faziam o segundo
// sobrescrever o primeiro — `fromYear` era descartado sempre que `toYear`
// também vinha preenchido. Precisa ser um objeto só.
function yearRangeWhere(fromYear?: number, toYear?: number) {
  if (fromYear === undefined && toYear === undefined) return undefined;
  return { ...(fromYear !== undefined && { gte: fromYear }), ...(toYear !== undefined && { lte: toYear }) };
}

/**
 * Etapa 10.5 — Centro de Estatísticas. Nenhum dado novo é armazenado:
 * todo ranking é agregado ao vivo, sempre a partir de
 * `PlayerCompetitionStats`/`SeasonTitle`/`Season`/`Transfer` — as mesmas
 * tabelas que já alimentam os perfis (etapa 10.2/10.3) e a Timeline
 * (etapa 10.4). Mesmo padrão de agregação já usado no resto do projeto
 * (`findMany` + `Map`/`reduce` em JS — nenhum `groupBy` nativo em código
 * de aplicação em nenhum outro lugar, confirmado por auditoria antes de
 * implementar).
 *
 * Fonte única pro ranking de jogador: `PlayerCompetitionStats` via
 * `SquadPlayer→Season→Squad` — nunca `CareerStint`/
 * `CareerStintCompetitionStats`. `career.service.ts#decorateLinkedStints`
 * já prova que um CareerStint vinculado a uma Season real (clube OU
 * seleção) sempre mostra os números reais de PlayerCompetitionStats, não
 * os de CareerStintCompetitionStats (que podem existir soltos, sem
 * nunca terem sido sincronizados) — somar os dois duplicaria. CareerStint
 * freeform (sem seasonId — história anterior ao que foi cadastrado)
 * fica de fora dos rankings estruturados de propósito: não existe
 * PlayerCompetitionStats pra essa história, e inventar uma regra de
 * mistura é exatamente o que não deve ser feito sem uma regra segura.
 */
export const statisticsService = {
  async getPlayerAggregates(filters: PlayerStatsFilters = {}): Promise<PlayerAggregateRow[]> {
    const rows = await prisma.playerCompetitionStats.findMany({
      where: {
        ...(filters.competitionId && { competitionId: filters.competitionId }),
        squadPlayer: {
          ...(filters.search?.trim() && {
            cachedPlayer: { name: { contains: filters.search.trim(), mode: "insensitive" } },
          }),
          season: {
            ...(filters.squadId && { squadId: filters.squadId }),
            ...(yearRangeWhere(filters.fromYear, filters.toYear) && { startYear: yearRangeWhere(filters.fromYear, filters.toYear) }),
            ...(filters.kind && { squad: squadKindWhere(filters.kind) }),
          },
        },
      },
      select: {
        appearances: true,
        goals: true,
        assists: true,
        squadPlayer: {
          select: {
            cachedPlayer: { select: { id: true, name: true, photoUrl: true } },
            season: { select: { startYear: true, squad: { select: { id: true, name: true, logoUrl: true } } } },
          },
        },
      },
    });

    const byPlayer = new Map<string, PlayerAggregateRow>();
    for (const row of rows) {
      const cp = row.squadPlayer.cachedPlayer;
      const entry = byPlayer.get(cp.id) ?? {
        cachedPlayer: cp,
        appearances: 0,
        goals: 0,
        assists: 0,
        lastSquad: null,
        lastYear: null,
      };
      entry.appearances += row.appearances;
      entry.goals += row.goals;
      entry.assists += row.assists;
      const year = row.squadPlayer.season.startYear;
      if (entry.lastYear === null || year > entry.lastYear) {
        entry.lastYear = year;
        entry.lastSquad = row.squadPlayer.season.squad;
      }
      byPlayer.set(cp.id, entry);
    }
    return [...byPlayer.values()];
  },

  async getTopScorers(filters?: PlayerStatsFilters) {
    return sortPlayerAggregates(await this.getPlayerAggregates(filters), "goals");
  },
  async getTopAssists(filters?: PlayerStatsFilters) {
    return sortPlayerAggregates(await this.getPlayerAggregates(filters), "assists");
  },
  async getMostAppearances(filters?: PlayerStatsFilters) {
    return sortPlayerAggregates(await this.getPlayerAggregates(filters), "appearances");
  },
  async getTopGoalContributions(filters?: PlayerStatsFilters) {
    return sortPlayerAggregates(await this.getPlayerAggregates(filters), "contributions");
  },

  /** Etapa 10.5 (§11) — pronto pra integração futura no perfil do jogador: posição dele num ranking, sem repetir a query. */
  async getPlayerRankPosition(
    cachedPlayerId: string,
    metric: "goals" | "assists" | "appearances" | "contributions",
    filters?: PlayerStatsFilters,
  ): Promise<{ position: number; total: number } | null> {
    const sorted = sortPlayerAggregates(await this.getPlayerAggregates(filters), metric);
    const index = sorted.findIndex((r) => r.cachedPlayer.id === cachedPlayerId);
    if (index === -1) return null;
    return { position: index + 1, total: sorted.length };
  },

  /** Clubes/seleções com mais títulos (§6.1) — também cobre "quem mais venceu X competição" (§9) passando competitionId. */
  async getTopClubsByTitles(filters: { kind?: "club" | "nationalTeam"; competitionId?: string } = {}) {
    const titles = await prisma.seasonTitle.findMany({
      where: {
        ...(filters.competitionId && { competitionId: filters.competitionId }),
        season: { ...(filters.kind && { squad: squadKindWhere(filters.kind) }) },
      },
      select: { season: { select: { squad: { select: { id: true, name: true, logoUrl: true } } } } },
    });

    const bySquad = new Map<string, { squad: { id: string; name: string; logoUrl: string | null }; count: number }>();
    for (const title of titles) {
      const squad = title.season.squad;
      const entry = bySquad.get(squad.id) ?? { squad, count: 0 };
      entry.count += 1;
      bySquad.set(squad.id, entry);
    }
    return [...bySquad.values()].sort((a, b) => b.count - a.count || a.squad.name.localeCompare(b.squad.name));
  },

  /** Clubes/seleções com mais temporadas registradas (§6.2). */
  async getMostSeasons(filters: { kind?: "club" | "nationalTeam" } = {}) {
    const seasons = await prisma.season.findMany({
      where: { ...(filters.kind && { squad: squadKindWhere(filters.kind) }) },
      select: { squad: { select: { id: true, name: true, logoUrl: true } } },
    });

    const bySquad = new Map<string, { squad: { id: string; name: string; logoUrl: string | null }; count: number }>();
    for (const season of seasons) {
      const entry = bySquad.get(season.squad.id) ?? { squad: season.squad, count: 0 };
      entry.count += 1;
      bySquad.set(season.squad.id, entry);
    }
    return [...bySquad.values()].sort((a, b) => b.count - a.count || a.squad.name.localeCompare(b.squad.name));
  },

  /**
   * Maiores transferências (§10) — usa Transfer.value real, nunca
   * converte ausência de valor em zero (§10/§23: `value: { not: null }`
   * exclui, não zera). `counterpartSquad` (etapa 10.3) é incluído quando
   * existir; transferências antigas sem esse vínculo continuam
   * funcionando só com o texto livre `counterpartClub` (§25).
   */
  async getBiggestTransfers(
    filters: { type?: "in" | "out"; squadId?: string; fromYear?: number; toYear?: number; limit?: number } = {},
  ) {
    return prisma.transfer.findMany({
      where: {
        value: { not: null },
        ...(filters.type && { type: filters.type }),
        season: {
          ...(filters.squadId && { squadId: filters.squadId }),
          ...(yearRangeWhere(filters.fromYear, filters.toYear) && { startYear: yearRangeWhere(filters.fromYear, filters.toYear) }),
        },
      },
      orderBy: { value: "desc" },
      take: filters.limit,
      include: {
        cachedPlayer: { select: { id: true, name: true, photoUrl: true } },
        counterpartSquad: { select: { id: true, name: true, logoUrl: true } },
        season: { select: { startYear: true, squad: { select: { id: true, name: true, logoUrl: true } } } },
      },
    });
  },
  async getBiggestPurchases(filters?: { squadId?: string; fromYear?: number; toYear?: number; limit?: number }) {
    return this.getBiggestTransfers({ ...filters, type: "in" });
  },
  async getBiggestSales(filters?: { squadId?: string; fromYear?: number; toYear?: number; limit?: number }) {
    return this.getBiggestTransfers({ ...filters, type: "out" });
  },

  /** Competições com mais títulos registrados (§9). */
  async getCompetitionsByTitleCount() {
    const titles = await prisma.seasonTitle.findMany({
      select: { competition: { select: { id: true, name: true, logoUrl: true, trophyImageUrl: true } } },
    });

    const byCompetition = new Map<
      string,
      { competition: { id: string; name: string; logoUrl: string | null; trophyImageUrl: string | null }; count: number }
    >();
    for (const title of titles) {
      const entry = byCompetition.get(title.competition.id) ?? { competition: title.competition, count: 0 };
      entry.count += 1;
      byCompetition.set(title.competition.id, entry);
    }
    return [...byCompetition.values()].sort((a, b) => b.count - a.count || a.competition.name.localeCompare(b.competition.name));
  },
};
