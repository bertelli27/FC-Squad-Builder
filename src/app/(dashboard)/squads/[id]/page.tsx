import { notFound } from "next/navigation";
import { squadService } from "@/services/squad.service";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { EditSquadDialog } from "@/components/squad-builder/edit-squad-dialog";
import { ClubThemeScope } from "@/components/squad-builder/club-theme-scope";
import { SeasonsSection } from "@/components/squad-builder/seasons-section";
import { PalmaresCard } from "@/components/squad-builder/palmares-card";
import { HistoryCard } from "@/components/squad-builder/history-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [squad, palmares, historicalStats, topTransfers] = await Promise.all([
    squadService.getSquad(id),
    squadService.getPalmares(id),
    squadService.getHistoricalStats(id, 3),
    squadService.getTopTransfers(id, 3),
  ]);
  if (!squad) notFound();

  return (
    <ClubThemeScope clubId={squad.id} primaryColor={squad.primaryColor} className="flex flex-col gap-6">
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ClubBadge src={squad.logoUrl} name={squad.name} size="lg" />
            <h1 className="font-heading text-2xl font-bold tracking-tight">{squad.name}</h1>
          </div>
          <EditSquadDialog
            squad={{
              id: squad.id,
              name: squad.name,
              logoUrl: squad.logoUrl,
              categoryId: squad.categoryId,
              tags: squad.tags,
              baseKind: squad.baseKind,
              primaryColor: squad.primaryColor,
              seasonCalendar: squad.seasonCalendar,
            }}
          />
        </CardContent>
      </Card>

      <PalmaresCard entries={palmares} />

      <HistoryCard
        squadId={squad.id}
        topScorers={historicalStats.topScorers}
        topAssists={historicalStats.topAssists}
        mostAppearances={historicalStats.mostAppearances}
        topBuys={topTransfers.topBuys}
        topSales={topTransfers.topSales}
        seasonCalendar={squad.seasonCalendar}
      />

      <SeasonsSection
        squadId={squad.id}
        seasonCalendar={squad.seasonCalendar}
        seasons={squad.seasons.map((season) => ({
          id: season.id,
          startYear: season.startYear,
          formation: season.formation,
          coachName: season.coach?.name ?? null,
          playerCount: season._count.players,
        }))}
      />
    </ClubThemeScope>
  );
}
