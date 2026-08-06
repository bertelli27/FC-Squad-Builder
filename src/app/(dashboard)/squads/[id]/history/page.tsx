import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trophy } from "lucide-react";
import { squadService } from "@/services/squad.service";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { ClubThemeScope } from "@/components/squad-builder/club-theme-scope";
import { FullHistoryView } from "@/components/squad-builder/full-history-view";

export const dynamic = "force-dynamic";

/** Etapa 9 parte 4 (§8.2/§8.3) — histórico completo do clube, sem o corte de Top 3 da visão geral. */
export default async function SquadHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [squad, historicalStats, topTransfers] = await Promise.all([
    squadService.getSquad(id),
    squadService.getHistoricalStats(id),
    squadService.getTopTransfers(id),
  ]);
  if (!squad) notFound();

  return (
    <ClubThemeScope clubId={squad.id} primaryColor={squad.primaryColor} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/squads/${squad.id}`}
          className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" />
          {squad.name}
        </Link>

        <div className="flex items-center gap-3">
          <ClubBadge src={squad.logoUrl} name={squad.name} size="lg" />
          <div className="flex flex-col">
            <h1 className="font-heading flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Trophy className="text-primary size-5" />
              Histórico completo
            </h1>
            <span className="text-muted-foreground text-sm">{squad.name}</span>
          </div>
        </div>
      </div>

      <FullHistoryView
        topScorers={historicalStats.topScorers}
        topAssists={historicalStats.topAssists}
        mostAppearances={historicalStats.mostAppearances}
        topBuys={topTransfers.topBuys}
        topSales={topTransfers.topSales}
        seasonCalendar={squad.seasonCalendar}
      />
    </ClubThemeScope>
  );
}
