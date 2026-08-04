import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { careerService } from "@/services/career.service";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { CareerStintPageContent } from "@/components/careers/career-stint-page-content";
import { formatSeasonLabel } from "@/lib/season";
import { ageAtSeason } from "@/lib/player-age";
import { countryFlag } from "@/lib/countries";
import { POSITIONS } from "@/lib/positions";

export default async function CareerStintPage({
  params,
}: {
  params: Promise<{ id: string; stintId: string }>;
}) {
  const { id, stintId } = await params;
  const detail = await careerService.getStintDetail(stintId);
  if (!detail || detail.stint.careerId !== id) notFound();

  const { stint, squadPlayer } = detail;
  const player = stint.career.cachedPlayer;
  const flag = countryFlag(player?.nationality);
  const age = player?.dateOfBirth ? ageAtSeason(player.dateOfBirth, stint.startYear, stint.calendar) : null;
  const positionLabel = POSITIONS.find((p) => p.value === player?.position)?.label ?? player?.position;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/careers/${id}`}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        {stint.career.name}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <PlayerAvatar src={player?.photoUrl} name={stint.career.name} size="lg" />
        <div className="flex flex-1 flex-col">
          <h1 className="font-heading text-2xl font-bold tracking-tight">{stint.career.name}</h1>
          <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-sm">
            {flag && <span>{flag}</span>}
            {[positionLabel, age != null ? `${age} anos` : null].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {stint.clubLogoUrl ? (
            <ClubBadge src={stint.clubLogoUrl} name={stint.clubName} size="lg" />
          ) : null}
          <div className="flex flex-col">
            <span className="font-heading text-lg font-bold">{stint.clubName}</span>
            <span className="text-muted-foreground text-sm">{formatSeasonLabel(stint.startYear, stint.calendar)}</span>
          </div>
        </div>
      </div>

      <CareerStintPageContent
        careerId={id}
        stint={{
          id: stint.id,
          kind: stint.kind,
          seasonId: stint.seasonId,
          clubName: stint.clubName,
          clubLogoUrl: stint.clubLogoUrl,
          startYear: stint.startYear,
          calendar: stint.calendar,
          appearances: stint.appearances,
          goals: stint.goals,
          assists: stint.assists,
          summary: stint.summary,
          order: stint.order,
          titles: stint.titles.map((t) => ({
            id: t.id,
            competition: { id: t.competition.id, name: t.competition.name, trophyImageUrl: t.competition.trophyImageUrl },
          })),
          competitionStats: stint.competitionStats.map((cs) => ({
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
        }}
        linkedSeason={
          stint.season
            ? {
                id: stint.season.id,
                squadId: stint.season.squadId,
                squadPlayerId: squadPlayer?.id ?? null,
                titles: stint.season.titles.map((t) => ({
                  id: t.id,
                  competition: {
                    id: t.competition.id,
                    name: t.competition.name,
                    trophyImageUrl: t.competition.trophyImageUrl,
                  },
                })),
              }
            : null
        }
      />
    </div>
  );
}
