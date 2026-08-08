import { notFound } from "next/navigation";
import { playerProfileService } from "@/services/player-profile.service";
import { timelineService } from "@/services/timeline.service";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { OverallBadge } from "@/components/player-card/overall-badge";
import { PlayerProfileTabs } from "@/components/player-card/player-profile-tabs";
import { ProfileHeader } from "@/components/ui/profile-header";
import { CountryFlag } from "@/components/ui/country-flag";
import { ageToday } from "@/lib/player-age";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({ params }: { params: Promise<{ cachedPlayerId: string }> }) {
  const { cachedPlayerId } = await params;
  const player = await playerProfileService.getProfile(cachedPlayerId);
  if (!player) notFound();

  const [career, stats, seasons, callups, transfers, titles, timelineEvents] = await Promise.all([
    player.careerId ? playerProfileService.getCareerSummary(player.careerId) : Promise.resolve(null),
    playerProfileService.getStats(cachedPlayerId),
    playerProfileService.getSeasons(cachedPlayerId),
    playerProfileService.getNationalTeamCallups(cachedPlayerId),
    playerProfileService.getTransfers(cachedPlayerId),
    playerProfileService.getTitles(cachedPlayerId),
    timelineService.getPlayerTimeline(cachedPlayerId),
  ]);

  const age = player.dateOfBirth ? ageToday(player.dateOfBirth) : null;

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader
        avatar={<PlayerAvatar src={player.photoUrl} name={player.name} size="lg" />}
        title={player.name}
        facts={[
          player.position,
          player.nationality && (
            <>
              <CountryFlag nationality={player.nationality} /> {player.nationality}
            </>
          ),
          age != null && `${age} anos`,
        ]}
        action={<OverallBadge overall={player.overall} className="h-8 px-3 text-lg" />}
      />

      <PlayerProfileTabs
        cachedPlayerId={cachedPlayerId}
        overview={{
          heightCm: player.heightCm,
          weightKg: player.weightKg,
          preferredFoot: player.preferredFoot,
          currentClub: player.currentClub,
          currentNationalTeam: player.currentNationalTeam,
        }}
        careerId={player.careerId}
        career={career}
        stats={stats}
        seasons={seasons.map((sp) => ({
          id: sp.id,
          shirtNumber: sp.shirtNumber,
          season: {
            id: sp.season.id,
            startYear: sp.season.startYear,
            competition: sp.season.competition,
            squad: sp.season.squad,
          },
        }))}
        callups={callups.map((sp) => ({
          id: sp.id,
          shirtNumber: sp.shirtNumber,
          season: {
            id: sp.season.id,
            startYear: sp.season.startYear,
            competition: sp.season.competition,
            squad: sp.season.squad,
          },
        }))}
        transfers={transfers.map((t) => ({
          id: t.id,
          type: t.type,
          counterpartClub: t.counterpartClub,
          value: t.value,
          season: { startYear: t.season.startYear, squad: t.season.squad },
        }))}
        titles={titles}
        timelineEvents={timelineEvents}
      />
    </div>
  );
}
