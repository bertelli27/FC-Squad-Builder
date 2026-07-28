import { notFound } from "next/navigation";
import { squadService } from "@/services/squad.service";
import { Badge } from "@/components/ui/badge";
import { PlayerCard } from "@/components/player-card/player-card";

export default async function SquadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const squad = await squadService.getSquad(id);
  if (!squad) notFound();

  const starters = squad.players.filter((p) => p.isStarter);
  const bench = squad.players.filter((p) => !p.isStarter);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{squad.name}</h1>
        <Badge variant="secondary">{squad.formation}</Badge>
      </div>

      {squad.players.length === 0 ? (
        <p className="text-muted-foreground">Este elenco ainda não tem jogadores.</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-medium">
              Titulares ({starters.length})
            </h2>
            <div className="flex flex-col gap-2">
              {starters.map((sp) => (
                <PlayerCard
                  key={sp.id}
                  player={{
                    name: sp.cachedPlayer.name,
                    photoUrl: sp.cachedPlayer.photoUrl,
                    position: sp.cachedPlayer.position,
                    club: sp.cachedPlayer.club,
                    overall: sp.cachedPlayer.overall,
                    shirtNumber: sp.shirtNumber,
                    isCaptain: sp.isCaptain,
                  }}
                />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-medium">
              Reservas ({bench.length})
            </h2>
            <div className="flex flex-col gap-2">
              {bench.map((sp) => (
                <PlayerCard
                  key={sp.id}
                  player={{
                    name: sp.cachedPlayer.name,
                    photoUrl: sp.cachedPlayer.photoUrl,
                    position: sp.cachedPlayer.position,
                    club: sp.cachedPlayer.club,
                    overall: sp.cachedPlayer.overall,
                    shirtNumber: sp.shirtNumber,
                    isCaptain: sp.isCaptain,
                  }}
                />
              ))}
              {bench.length === 0 && (
                <p className="text-muted-foreground text-sm">Nenhum jogador no banco.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
