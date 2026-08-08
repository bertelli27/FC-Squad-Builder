import Link from "next/link";
import { notFound } from "next/navigation";
import { StarIcon } from "lucide-react";
import { squadService } from "@/services/squad.service";
import { timelineService } from "@/services/timeline.service";
import { hallOfFameService } from "@/services/hall-of-fame.service";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { EditSquadDialog } from "@/components/squad-builder/edit-squad-dialog";
import { ClubThemeScope } from "@/components/squad-builder/club-theme-scope";
import { SquadProfileTabs } from "@/components/squad-builder/squad-profile-tabs";
import { ProfileHeader } from "@/components/ui/profile-header";
import { CountryFlag } from "@/components/ui/country-flag";
import { findCountry } from "@/lib/countries";

export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [squad, palmares, historicalStats, topTransfers, currentPlayers, coachesUsed, convocationTree, timelineEvents, hallOfFameCount] =
    await Promise.all([
      squadService.getSquad(id),
      squadService.getPalmares(id),
      squadService.getHistoricalStats(id),
      squadService.getTopTransfers(id),
      squadService.listCurrentPlayers(id),
      squadService.listCoachesUsed(id),
      squadService.listConvocationTree(id),
      timelineService.getSquadTimeline(id),
      hallOfFameService.countBySquad(id),
    ]);
  if (!squad) notFound();

  const isNationalTeam = squad.baseKind === "nationalTeam";

  return (
    <ClubThemeScope clubId={squad.id} primaryColor={squad.primaryColor} className="flex flex-col gap-6">
      <ProfileHeader
        avatar={<ClubBadge src={squad.logoUrl} name={squad.name} size="lg" />}
        title={squad.name}
        facts={[
          squad.country && (
            <>
              <CountryFlag nationality={squad.country} /> {findCountry(squad.country)?.label ?? squad.country}
            </>
          ),
          squad.category?.name,
          !isNationalTeam && squad.city,
          isNationalTeam ? squad.confederation : squad.foundedYear && `Fundado em ${squad.foundedYear}`,
          !isNationalTeam && squad.stadium,
          hallOfFameCount > 0 && (
            <Link href={`/museum/hall-of-fame?squadId=${squad.id}`} className="hover:text-primary flex items-center gap-1 hover:underline">
              <StarIcon className="size-3.5" />
              {hallOfFameCount} no Hall da Fama
            </Link>
          ),
        ]}
        action={
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
              fullName: squad.fullName,
              country: squad.country,
              city: squad.city,
              foundedYear: squad.foundedYear,
              stadium: squad.stadium,
              colors: squad.colors,
              confederation: squad.confederation,
            }}
          />
        }
      />

      <SquadProfileTabs
        squadId={squad.id}
        baseKind={squad.baseKind}
        seasonCalendar={squad.seasonCalendar}
        seasons={squad.seasons.map((season) => ({
          id: season.id,
          startYear: season.startYear,
          formation: season.formation,
          coachId: season.coach?.id ?? null,
          coachName: season.coach?.name ?? null,
          playerCount: season._count.players,
          competitionId: season.competitionId,
          competitionName: season.competition?.name ?? null,
        }))}
        palmares={palmares}
        currentPlayers={currentPlayers}
        coachesUsed={coachesUsed}
        convocationTree={convocationTree}
        historicalStats={historicalStats}
        topTransfers={topTransfers}
        timelineEvents={timelineEvents}
      />
    </ClubThemeScope>
  );
}
