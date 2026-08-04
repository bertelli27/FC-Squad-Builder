import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { playerDataService } from "@/services/player-data.service";
import { ManagementPlayersClient } from "@/components/management/management-players-client";

export const dynamic = "force-dynamic";

export default async function ManagementPlayersPage() {
  const players = await playerDataService.listCustomPlayers();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/management"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        Gerenciamento
      </Link>

      <div className="flex items-baseline gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Jogadores criados</h1>
        {players.length > 0 && <span className="text-muted-foreground text-sm">({players.length})</span>}
      </div>

      <ManagementPlayersClient
        players={players.map((p) => ({
          cachedPlayerId: p.id,
          source: p.source,
          name: p.name,
          photoUrl: p.photoUrl,
          dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
          nationality: p.nationality,
          position: p.position,
          secondaryPositions: p.secondaryPositions,
          overall: p.overall,
          potential: p.potential,
          externalLink: p.externalLink,
        }))}
      />
    </div>
  );
}
