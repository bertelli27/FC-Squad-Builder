import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { statisticsService } from "@/services/statistics.service";
import { ClubRankingsTabs } from "@/components/statistics/club-rankings-tabs";
import { RankingFilters } from "@/components/statistics/ranking-filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ kind?: string }>;

/** Etapa 10.5 (§6) — rankings de clube/seleção. */
export default async function ClubStatisticsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const kind = sp.kind === "club" || sp.kind === "nationalTeam" ? sp.kind : undefined;

  const [titles, seasons, purchases, sales] = await Promise.all([
    statisticsService.getTopClubsByTitles({ kind }),
    statisticsService.getMostSeasons({ kind }),
    statisticsService.getBiggestPurchases(),
    statisticsService.getBiggestSales(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/statistics" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ChevronLeft className="size-4" />
        Centro de Estatísticas
      </Link>

      <h1 className="font-heading text-2xl font-semibold tracking-tight">Clubes e Seleções</h1>

      <RankingFilters config={{ kind: true }} />

      <ClubRankingsTabs titles={titles} seasons={seasons} purchases={purchases} sales={sales} />
    </div>
  );
}
