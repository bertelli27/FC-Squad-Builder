export interface PlayerAggregateRow {
  cachedPlayer: { id: string; name: string; photoUrl: string | null };
  appearances: number;
  goals: number;
  assists: number;
  lastSquad: { id: string; name: string; logoUrl: string | null } | null;
  lastYear: number | null;
}

export type PlayerRankingMetric = "goals" | "assists" | "appearances" | "contributions";

/**
 * Etapa 10.5 — puro (sem Prisma), pra poder ser reaproveitado tanto no
 * servidor (`statistics.service.ts`) quanto no cliente (abas de ranking
 * que reordenam a MESMA lista já buscada, em vez de refazer a query pra
 * cada aba — 1 fetch server-side, N reordenações grátis no browser).
 * Mesmas regras de desempate da §4.1-4.4: métrica DESC, jogos DESC, nome ASC.
 */
export function sortPlayerAggregates(rows: PlayerAggregateRow[], metric: PlayerRankingMetric): PlayerAggregateRow[] {
  const value = (r: PlayerAggregateRow) => (metric === "contributions" ? r.goals + r.assists : r[metric]);
  return [...rows]
    .filter((r) => value(r) > 0)
    .sort((a, b) => value(b) - value(a) || b.appearances - a.appearances || a.cachedPlayer.name.localeCompare(b.cachedPlayer.name));
}
