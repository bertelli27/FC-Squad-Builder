import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { squadService } from "@/services/squad.service";
import { Button } from "@/components/ui/button";
import { SquadListClient } from "@/components/squad-builder/squad-list-client";

// Without this, Next prerenders this page as static HTML at build time
// (it has no params/cookies/etc. to force dynamic rendering on its own) —
// fine for a marketing page, wrong for a private dashboard listing
// whatever squads/logos exist *right now*. That's exactly why an
// uploaded club badge showed correctly on the squad's own page (always
// server-rendered per request) but not here: this route kept serving
// the HTML generated back at deploy time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const squads = await squadService.listSquads();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Meus elencos</h1>
          {squads.length > 0 && (
            <span className="text-muted-foreground text-sm">({squads.length})</span>
          )}
        </div>
        <Button
          render={
            <Link href="/squads/new">
              <PlusIcon className="size-4" />
              Criar elenco
            </Link>
          }
          nativeButton={false}
        />
      </div>

      {squads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">Você ainda não criou nenhum elenco.</p>
          <Button render={<Link href="/squads/new">Criar meu primeiro elenco</Link>} nativeButton={false} />
        </div>
      ) : (
        <SquadListClient
          squads={squads.map((squad) => ({
            id: squad.id,
            name: squad.name,
            formation: squad.formation,
            playerCount: squad._count.players,
            logoUrl: squad.logoUrl,
            isFavorite: squad.isFavorite,
          }))}
        />
      )}
    </div>
  );
}
