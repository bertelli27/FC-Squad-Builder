import Link from "next/link";
import { squadService } from "@/services/squad.service";
import { Button } from "@/components/ui/button";
import { SquadCard } from "@/components/squad-builder/squad-card";

export default async function HomePage() {
  const squads = await squadService.listSquads();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Meus elencos</h1>
        <Button render={<Link href="/squads/new">Criar elenco</Link>} nativeButton={false} />
      </div>

      {squads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">Você ainda não criou nenhum elenco.</p>
          <Button render={<Link href="/squads/new">Criar meu primeiro elenco</Link>} nativeButton={false} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {squads.map((squad) => (
            <SquadCard
              key={squad.id}
              squad={{
                id: squad.id,
                name: squad.name,
                formation: squad.formation,
                playerCount: squad._count.players,
                logoUrl: squad.logoUrl,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
