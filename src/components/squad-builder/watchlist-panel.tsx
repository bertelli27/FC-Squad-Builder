"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { XIcon, GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupPlayersByPosition } from "@/lib/position-groups";
import { PlayerProfileDialog } from "@/components/player-card/player-profile-dialog";
import { PlayerRowContent } from "./roster-table";
import type { SquadPlayerVM } from "./squad-editor";

/**
 * Mirrors roster-table.tsx's bench (one droppable container for the whole
 * list, no per-row swap target — same reason: there's no fixed "vaga" to
 * land on here either) but drops the number/captain columns, since a
 * scouted player isn't part of the 26 yet. Dragging one onto an occupied
 * pitch slot is what performs the actual swap (handled in squad-editor.tsx).
 */
export function WatchlistPanel({
  players,
  seasonId,
  ageReference,
  onRemove,
  onUpdated,
  onTransferredOut,
}: {
  players: SquadPlayerVM[];
  seasonId: string;
  ageReference?: { startYear: number; calendar: string };
  onRemove: (id: string) => void;
  onUpdated: (id: string, patch: Partial<SquadPlayerVM>) => void;
  onTransferredOut: (id: string, playerName: string, counterpartClub: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "watchlist" });
  const groups = groupPlayersByPosition(players);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-24 rounded-lg border",
        isOver && "border-primary bg-accent/40",
      )}
    >
      {players.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">
          Arraste um jogador do banco para cá, ou adicione um novo observado.
        </p>
      ) : (
        <ul className="divide-y">
          {groups.map(({ group, players: groupPlayers }) => (
            <li key={group}>
              <div className="text-muted-foreground font-heading border-primary/40 border-l-2 bg-muted/30 px-2 py-1 text-[10px] font-semibold tracking-wide uppercase">
                {group}
              </div>
              <ul>
                {groupPlayers.map((player) => (
                  <WatchlistRow
                    key={player.id}
                    player={player}
                    seasonId={seasonId}
                    ageReference={ageReference}
                    onRemove={onRemove}
                    onUpdated={onUpdated}
                    onTransferredOut={onTransferredOut}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WatchlistRow({
  player,
  seasonId,
  ageReference,
  onRemove,
  onUpdated,
  onTransferredOut,
}: {
  player: SquadPlayerVM;
  seasonId: string;
  ageReference?: { startYear: number; calendar: string };
  onRemove: (id: string) => void;
  onUpdated: (id: string, patch: Partial<SquadPlayerVM>) => void;
  onTransferredOut: (id: string, playerName: string, counterpartClub: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: player.id });

  const profileInfo = {
    cachedPlayerId: player.cachedPlayerId,
    source: player.source,
    name: player.name,
    club: player.club,
    position: player.position,
    secondaryPositions: player.secondaryPositions,
    nationality: player.nationality,
    dateOfBirth: player.dateOfBirth,
    photoUrl: player.photoUrl,
    overall: player.overall,
    potential: player.potential,
    externalLink: player.externalLink,
  };

  return (
    <li
      ref={setNodeRef}
      className={cn("hover:bg-accent/30 flex items-center gap-1 px-2 py-1.5", isDragging && "opacity-30")}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Arrastar ${player.name}`}
        className="text-muted-foreground hover:text-foreground flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded outline-none"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <PlayerProfileDialog
        player={profileInfo}
        seasonId={seasonId}
        squadPlayerId={player.id}
        ageReference={ageReference}
        onUpdated={(patch) => onUpdated(player.id, patch)}
        onTransferredOut={(counterpartClub) => onTransferredOut(player.id, player.name, counterpartClub)}
        aria-label={`Ver perfil de ${player.name}`}
        className="block min-w-0 flex-1"
      >
        <PlayerRowContent
          photoUrl={player.photoUrl}
          name={player.name}
          position={player.position}
          overall={player.overall}
        />
      </PlayerProfileDialog>
      <button
        type="button"
        onClick={() => onRemove(player.id)}
        aria-label="Remover dos observados"
        className="text-muted-foreground hover:text-destructive flex size-6 shrink-0 items-center justify-center rounded-full"
      >
        <XIcon className="size-3.5" />
      </button>
    </li>
  );
}
