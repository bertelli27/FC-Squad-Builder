import { notFound } from "next/navigation";
import { squadService } from "@/services/squad.service";
import { Badge } from "@/components/ui/badge";
import { SquadEditor } from "@/components/squad-builder/squad-editor";

export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const squad = await squadService.getSquad(id);
  if (!squad) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{squad.name}</h1>
        <Badge variant="secondary">{squad.formation}</Badge>
      </div>

      {squad.players.length === 0 ? (
        <p className="text-muted-foreground">Este elenco ainda não tem jogadores.</p>
      ) : (
        <SquadEditor
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
          }))}
        />
      )}
    </div>
  );
}
