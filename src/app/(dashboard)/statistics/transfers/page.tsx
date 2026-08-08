import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { statisticsService } from "@/services/statistics.service";
import { squadService } from "@/services/squad.service";
import { TransferRankingsTabs } from "@/components/statistics/transfer-rankings-tabs";
import { RankingFilters } from "@/components/statistics/ranking-filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ squadId?: string; fromYear?: string; toYear?: string }>;

/** Etapa 10.5 (§10) — maiores transferências globais. */
export default async function TransferStatisticsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters = {
    squadId: sp.squadId,
    fromYear: sp.fromYear ? Number(sp.fromYear) : undefined,
    toYear: sp.toYear ? Number(sp.toYear) : undefined,
  };

  const [all, purchases, sales, squads] = await Promise.all([
    statisticsService.getBiggestTransfers(filters),
    statisticsService.getBiggestPurchases(filters),
    statisticsService.getBiggestSales(filters),
    squadService.searchSquads(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/statistics" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ChevronLeft className="size-4" />
        Centro de Estatísticas
      </Link>

      <h1 className="font-heading text-2xl font-semibold tracking-tight">Transferências</h1>

      <RankingFilters config={{ squads: squads.map((s) => ({ id: s.id, name: s.name })), yearRange: true }} />

      <TransferRankingsTabs all={all} purchases={purchases} sales={sales} />
    </div>
  );
}
