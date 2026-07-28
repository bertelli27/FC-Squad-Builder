import { notFound } from "next/navigation";
import { squadService } from "@/services/squad.service";
import { SquadEditor } from "@/components/squad-builder/squad-editor";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { FormationSelector } from "@/components/squad-builder/formation-selector";

export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const squad = await squadService.getSquad(id);
  if (!squad) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <ClubBadge src={squad.baseClubLogoUrl} name={squad.name} />
        <h1 className="text-2xl font-semibold tracking-tight">{squad.name}</h1>
        <FormationSelector squadId={squad.id} formation={squad.formation} />
      </div>

      <SquadEditor
        key={squad.formation}
        squadId={squad.id}
        formation={squad.formation}
        players={squad.players.map((sp) => ({
          id: sp.id,
          name: sp.cachedPlayer.name,
          photoUrl: sp.cachedPlayer.photoUrl,
          position: sp.cachedPlayer.position,
          club: sp.cachedPlayer.club,
          overall: sp.cachedPlayer.overall,
          shirtNumber: sp.shirtNumber,
          isCaptain: sp.isCaptain,
          isStarter: sp.isStarter,
          positionSlot: sp.positionSlot,
          externalLink: sp.cachedPlayer.externalLink,
        }))}
      />
    </div>
  );
}
