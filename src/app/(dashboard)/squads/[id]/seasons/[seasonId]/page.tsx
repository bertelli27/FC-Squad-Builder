import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { squadService } from "@/services/squad.service";
import { seasonService } from "@/services/season.service";
import { careerService } from "@/services/career.service";
import { SquadEditor } from "@/components/squad-builder/squad-editor";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { ClubThemeScope } from "@/components/squad-builder/club-theme-scope";
import { FormationSelector } from "@/components/squad-builder/formation-selector";
import { SeasonSwitcher } from "@/components/squad-builder/season-switcher";
import { EditSeasonCoachDialog } from "@/components/squad-builder/edit-season-coach-dialog";
import { CoachCard } from "@/components/squad-builder/coach-card";
import { SquadNotes } from "@/components/squad-builder/squad-notes";
import { PerformanceCard } from "@/components/squad-builder/performance-card";
import { SeasonTitlesCard } from "@/components/squad-builder/season-titles-card";
import { TransfersCard } from "@/components/squad-builder/transfers-card";
import { formatSeasonLabel } from "@/lib/season";
import { Card, CardContent } from "@/components/ui/card";

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ id: string; seasonId: string }>;
}) {
  const { id, seasonId } = await params;
  const [squad, season] = await Promise.all([
    squadService.getSquad(id),
    seasonService.getSeason(seasonId),
  ]);
  if (!squad || !season || season.squadId !== squad.id) notFound();

  // §26: "Ver carreira" from a player's profile, when they have one.
  const careerIdByPlayer = await careerService.findCareerIdsByCachedPlayerIds(
    season.players.map((sp) => sp.cachedPlayer.id),
  );

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

        <Card className="gap-0 py-0">
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ClubBadge src={squad.logoUrl} name={squad.name} size="lg" />
              <div className="flex flex-col">
                <h1 className="font-heading text-2xl font-bold tracking-tight">{squad.name}</h1>
                <span className="text-muted-foreground text-sm">
                  Temporada {formatSeasonLabel(season.startYear, squad.seasonCalendar)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SeasonSwitcher
                squadId={squad.id}
                seasonCalendar={squad.seasonCalendar}
                seasons={squad.seasons.map((s) => ({ id: s.id, startYear: s.startYear }))}
                currentSeasonId={season.id}
              />
              <FormationSelector squadId={squad.id} seasonId={season.id} formation={season.formation} />
              <EditSeasonCoachDialog
                squadId={squad.id}
                seasonId={season.id}
                coachName={season.coachName}
                coachPhotoUrl={season.coachPhotoUrl}
                coachExternalLink={season.coachExternalLink}
              />
            </div>
          </CardContent>
          {season.coachName && (
            <CardContent className="border-t py-3">
              <CoachCard
                coachName={season.coachName}
                coachPhotoUrl={season.coachPhotoUrl}
                coachExternalLink={season.coachExternalLink}
              />
            </CardContent>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PerformanceCard
          squadId={squad.id}
          seasonId={season.id}
          wins={season.wins}
          draws={season.draws}
          losses={season.losses}
        />
        <SeasonTitlesCard seasonId={season.id} titles={season.titles} />
      </div>

      <SquadEditor
        key={season.formation}
        seasonId={season.id}
        formation={season.formation}
        baseKind={squad.baseKind}
        ageReference={{ startYear: season.startYear, calendar: squad.seasonCalendar }}
        players={season.players.map((sp) => ({
          id: sp.id,
          cachedPlayerId: sp.cachedPlayer.id,
          source: sp.cachedPlayer.source,
          name: sp.cachedPlayer.name,
          photoUrl: sp.cachedPlayer.photoUrl,
          position: sp.cachedPlayer.position,
          secondaryPositions: sp.cachedPlayer.secondaryPositions,
          nationality: sp.cachedPlayer.nationality,
          dateOfBirth: sp.cachedPlayer.dateOfBirth?.toISOString() ?? null,
          club: sp.cachedPlayer.club,
          overall: sp.cachedPlayer.overall,
          potential: sp.cachedPlayer.potential,
          shirtNumber: sp.shirtNumber,
          isCaptain: sp.isCaptain,
          isStarter: sp.isStarter,
          isWatchlist: sp.isWatchlist,
          isExtra: sp.isExtra,
          positionSlot: sp.positionSlot,
          externalLink: sp.cachedPlayer.externalLink,
          careerId: careerIdByPlayer.get(sp.cachedPlayer.id) ?? null,
        }))}
      />

      <TransfersCard
        seasonId={season.id}
        transfers={season.transfers.map((t) => ({
          id: t.id,
          type: t.type,
          playerName: t.playerName,
          counterpartClub: t.counterpartClub,
          value: t.value,
          dealType: t.dealType,
        }))}
      />

      <SquadNotes squadId={squad.id} seasonId={season.id} notes={season.notes} />
    </ClubThemeScope>
  );
}
