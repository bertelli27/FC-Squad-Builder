import { ChartNoAxesColumnIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface StatBlock {
  appearances: number;
  goals: number;
  assists: number;
}

/** Etapa 10.2 — aba "Estatísticas": PlayerCompetitionStats do jogador, somado e dividido Clubes/Seleções/Total Geral. */
export function PlayerStatsTab({
  club,
  nationalTeam,
  total,
}: {
  club: StatBlock;
  nationalTeam: StatBlock;
  total: StatBlock;
}) {
  if (total.appearances === 0 && total.goals === 0 && total.assists === 0) {
    return <EmptyState icon={ChartNoAxesColumnIcon} label="Nenhuma estatística registrada ainda." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard title="Clubes" stats={club} />
      <StatCard title="Seleções" stats={nationalTeam} />
      <StatCard title="Total Geral" stats={total} highlight />
    </div>
  );
}

function StatCard({ title, stats, highlight }: { title: string; stats: StatBlock; highlight?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-4 ${highlight ? "bg-primary/5 border-primary/30" : ""}`}>
      <h3 className="font-heading text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="font-heading text-xl font-bold">{stats.appearances}</div>
          <div className="text-muted-foreground text-xs">Jogos</div>
        </div>
        <div>
          <div className="font-heading text-xl font-bold">{stats.goals}</div>
          <div className="text-muted-foreground text-xs">Gols</div>
        </div>
        <div>
          <div className="font-heading text-xl font-bold">{stats.assists}</div>
          <div className="text-muted-foreground text-xs">Assist.</div>
        </div>
      </div>
    </div>
  );
}
