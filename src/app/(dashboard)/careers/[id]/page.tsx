import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { careerService } from "@/services/career.service";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { CareerTimeline } from "@/components/careers/career-timeline";
import { CareerSummary } from "@/components/careers/career-summary";
import { Card, CardContent } from "@/components/ui/card";

export default async function CareerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const career = await careerService.getCareer(id);
  if (!career) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/careers"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        Carreiras
      </Link>

      <Card className="gap-0 py-0">
        <CardContent className="flex items-center gap-3 py-4">
          <PlayerAvatar src={career.photoUrl} name={career.name} size="lg" />
          <h1 className="font-heading text-2xl font-bold tracking-tight">{career.name}</h1>
        </CardContent>
      </Card>

      <CareerTimeline
        careerId={career.id}
        initialStints={career.stints.map((s) => ({
          id: s.id,
          seasonId: s.seasonId,
          clubName: s.clubName,
          clubLogoUrl: s.clubLogoUrl,
          startYear: s.startYear,
          calendar: s.calendar,
          appearances: s.appearances,
          goals: s.goals,
          assists: s.assists,
          summary: s.summary,
          order: s.order,
          titles: s.titles.map((t) => ({
            id: t.id,
            competition: {
              id: t.competition.id,
              name: t.competition.name,
              trophyImageUrl: t.competition.trophyImageUrl,
            },
          })),
        }))}
        initialTransfers={career.transfers.map((t) => ({
          id: t.id,
          fromClubName: t.fromClubName,
          toClubName: t.toClubName,
          value: t.value,
          year: t.year,
          order: t.order,
        }))}
      />

      <CareerSummary careerId={career.id} summary={career.summary} />
    </div>
  );
}
