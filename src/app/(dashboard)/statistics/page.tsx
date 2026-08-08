import { UserRoundIcon, ShieldIcon, FlagIcon, TrophyIcon, ArrowRightLeftIcon, FootprintsIcon, UsersRoundIcon } from "lucide-react";
import { statisticsService } from "@/services/statistics.service";
import { sortPlayerAggregates } from "@/lib/statistics";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { RankingCard } from "@/components/statistics/ranking-card";
import { formatMoney } from "@/lib/season";

export const dynamic = "force-dynamic";

/** Etapa 10.5 (§3) — Centro de Estatísticas: dashboard com 5 áreas + rankings em destaque (Top 5, sem filtro). */
export default async function StatisticsPage() {
  const [playerAggregates, topClubsByTitles, biggestTransfers] = await Promise.all([
    // Uma busca só, dois recortes (goals/assists) — evita duas queries idênticas pra mesma tabela (§15).
    statisticsService.getPlayerAggregates(),
    statisticsService.getTopClubsByTitles(),
    statisticsService.getBiggestTransfers({ limit: 5 }),
  ]);
  const topScorers = sortPlayerAggregates(playerAggregates, "goals");
  const topAssists = sortPlayerAggregates(playerAggregates, "assists");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Centro de Estatísticas</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          href="/statistics/players"
          icon={<UserRoundIcon className="text-primary size-5" />}
          title="Jogadores"
          description="Artilheiros, assistências, jogos e participações em gols"
          count="rankings globais"
          actionLabel="Ver jogadores"
        />
        <DashboardCard
          href="/statistics/clubs"
          icon={<ShieldIcon className="text-primary size-5" />}
          title="Clubes"
          description="Títulos, temporadas, maiores compras e vendas"
          count="rankings globais"
          actionLabel="Ver clubes"
        />
        <DashboardCard
          href="/statistics/players?kind=nationalTeam"
          icon={<FlagIcon className="text-primary size-5" />}
          title="Seleções"
          description="Artilheiros, jogos e títulos por seleção"
          count="rankings globais"
          actionLabel="Ver seleções"
        />
        <DashboardCard
          href="/statistics/competitions"
          icon={<TrophyIcon className="text-primary size-5" />}
          title="Competições"
          description="Competições com mais títulos registrados"
          count="rankings globais"
          actionLabel="Ver competições"
        />
        <DashboardCard
          href="/statistics/transfers"
          icon={<ArrowRightLeftIcon className="text-primary size-5" />}
          title="Transferências"
          description="Maiores transferências, compras e vendas"
          count="rankings globais"
          actionLabel="Ver transferências"
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Rankings em destaque</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RankingCard
            icon={<FootprintsIcon className="text-primary size-4" />}
            title="Maiores artilheiros"
            href="/statistics/players"
            entries={topScorers.slice(0, 5).map((r) => ({ key: r.cachedPlayer.id, label: r.cachedPlayer.name, value: `${r.goals} gols` }))}
          />
          <RankingCard
            icon={<UsersRoundIcon className="text-primary size-4" />}
            title="Mais assistências"
            href="/statistics/players"
            entries={topAssists.slice(0, 5).map((r) => ({ key: r.cachedPlayer.id, label: r.cachedPlayer.name, value: `${r.assists} assist.` }))}
          />
          <RankingCard
            icon={<TrophyIcon className="text-primary size-4" />}
            title="Mais títulos"
            href="/statistics/clubs"
            entries={topClubsByTitles.slice(0, 5).map((r) => ({ key: r.squad.id, label: r.squad.name, value: `${r.count}×` }))}
          />
          <RankingCard
            icon={<ArrowRightLeftIcon className="text-primary size-4" />}
            title="Maiores transferências"
            href="/statistics/transfers"
            entries={biggestTransfers.map((t) => ({
              key: t.id,
              label: t.playerName,
              value: t.value != null ? formatMoney(t.value) : "—",
            }))}
          />
        </div>
      </div>
    </div>
  );
}
