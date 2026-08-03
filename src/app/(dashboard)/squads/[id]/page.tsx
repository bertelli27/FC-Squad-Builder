import { notFound } from "next/navigation";
import { squadService } from "@/services/squad.service";
import { SquadEditor } from "@/components/squad-builder/squad-editor";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { FormationSelector } from "@/components/squad-builder/formation-selector";
import { EditSquadDialog } from "@/components/squad-builder/edit-squad-dialog";
import { CoachCard } from "@/components/squad-builder/coach-card";
import { SquadNotes } from "@/components/squad-builder/squad-notes";
import { Card, CardContent } from "@/components/ui/card";

export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const squad = await squadService.getSquad(id);
  if (!squad) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ClubBadge src={squad.logoUrl} name={squad.name} size="lg" />
            <h1 className="font-heading text-2xl font-bold tracking-tight">{squad.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <FormationSelector squadId={squad.id} formation={squad.formation} />
            <EditSquadDialog
              squad={{
                id: squad.id,
                name: squad.name,
                logoUrl: squad.logoUrl,
                coachName: squad.coachName,
                coachPhotoUrl: squad.coachPhotoUrl,
                coachExternalLink: squad.coachExternalLink,
                categoryId: squad.categoryId,
                tags: squad.tags,
              }}
            />
          </div>
        </CardContent>
        {squad.coachName && (
          <CardContent className="border-t py-3">
            <CoachCard
              coachName={squad.coachName}
              coachPhotoUrl={squad.coachPhotoUrl}
              coachExternalLink={squad.coachExternalLink}
            />
          </CardContent>
        )}
      </Card>

      <SquadEditor
        key={squad.formation}
        squadId={squad.id}
        formation={squad.formation}
        baseKind={squad.baseKind}
        players={squad.players.map((sp) => ({
          id: sp.id,
          source: sp.cachedPlayer.source,
          name: sp.cachedPlayer.name,
          photoUrl: sp.cachedPlayer.photoUrl,
          position: sp.cachedPlayer.position,
          club: sp.cachedPlayer.club,
          overall: sp.cachedPlayer.overall,
          shirtNumber: sp.shirtNumber,
          isCaptain: sp.isCaptain,
          isStarter: sp.isStarter,
          isWatchlist: sp.isWatchlist,
          isExtra: sp.isExtra,
          positionSlot: sp.positionSlot,
          externalLink: sp.cachedPlayer.externalLink,
        }))}
      />

      <SquadNotes squadId={squad.id} notes={squad.notes} />
    </div>
  );
}
