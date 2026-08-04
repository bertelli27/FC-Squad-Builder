import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { careerService } from "@/services/career.service";
import { CareerHeader } from "@/components/careers/career-header";
import { CareerWorkspace } from "@/components/careers/career-workspace";
import { CareerSummary } from "@/components/careers/career-summary";

export default async function CareerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const career = await careerService.getCareer(id);
  if (!career) notFound();

  // Etapa 6 (§24/§32): cachedPlayerId is now always set for careers
  // created going forward, and the etapa's migration backfilled it for any
  // that predate this — cachedPlayer should always exist. Falling back to
  // "" (rather than career.id) if it's ever somehow still missing just
  // hides the edit action (see CareerHeader) instead of pointing "Editar
  // jogador" at a nonexistent CachedPlayer id.
  const cachedPlayerId = career.cachedPlayerId ?? "";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/careers"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        Carreiras
      </Link>

      <CareerHeader
        player={{
          cachedPlayerId,
          source: career.cachedPlayer?.source ?? null,
          name: career.cachedPlayer?.name ?? career.name,
          photoUrl: career.cachedPlayer?.photoUrl ?? career.photoUrl,
          dateOfBirth: career.cachedPlayer?.dateOfBirth?.toISOString() ?? null,
          nationality: career.cachedPlayer?.nationality ?? null,
          position: career.cachedPlayer?.position ?? null,
          secondaryPositions: career.cachedPlayer?.secondaryPositions ?? [],
          overall: career.cachedPlayer?.overall ?? null,
          potential: career.cachedPlayer?.potential ?? null,
          externalLink: career.cachedPlayer?.externalLink ?? null,
        }}
      />

      <CareerWorkspace
        careerId={career.id}
        dateOfBirth={career.cachedPlayer?.dateOfBirth?.toISOString() ?? null}
        initialStints={career.stints.map((s) => ({
          id: s.id,
          kind: s.kind,
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
          competitionStats: s.competitionStats.map((cs) => ({
            id: cs.id,
            competition: {
              id: cs.competition.id,
              name: cs.competition.name,
              trophyImageUrl: cs.competition.trophyImageUrl,
            },
            appearances: cs.appearances,
            goals: cs.goals,
            assists: cs.assists,
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
