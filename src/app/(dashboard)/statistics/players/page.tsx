import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { statisticsService } from "@/services/statistics.service";
import { squadService } from "@/services/squad.service";
import { competitionService } from "@/services/competition.service";
import { PlayerRankingsTabs } from "@/components/statistics/player-rankings-tabs";
import { RankingFilters } from "@/components/statistics/ranking-filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  kind?: string;
  squadId?: string;
  competitionId?: string;
  fromYear?: string;
  toYear?: string;
}>;

/** Etapa 10.5 (§4/§5/§7) — rankings globais de jogador; `?kind=nationalTeam` cobre a Parte 7 (Seleções) reaproveitando a mesma página, sem duplicar. */
export default async function PlayerStatisticsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const kind = sp.kind === "club" || sp.kind === "nationalTeam" ? sp.kind : undefined;

  const [rows, squads, competitions] = await Promise.all([
    statisticsService.getPlayerAggregates({
      kind,
      squadId: sp.squadId,
      competitionId: sp.competitionId,
      fromYear: sp.fromYear ? Number(sp.fromYear) : undefined,
      toYear: sp.toYear ? Number(sp.toYear) : undefined,
    }),
    squadService.searchSquads(),
    competitionService.listCompetitions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/statistics" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ChevronLeft className="size-4" />
        Centro de Estatísticas
      </Link>

      <h1 className="font-heading text-2xl font-semibold tracking-tight">Jogadores</h1>

      <RankingFilters
        config={{
          kind: true,
          squads: squads.map((s) => ({ id: s.id, name: s.name })),
          competitions: competitions.map((c) => ({ id: c.id, name: c.name })),
          yearRange: true,
        }}
      />

      <PlayerRankingsTabs rows={rows} />
    </div>
  );
}
