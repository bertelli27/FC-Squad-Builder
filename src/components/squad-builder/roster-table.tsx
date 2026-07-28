"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVerticalIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupPlayersByPosition } from "@/lib/position-groups";
import { ratingStyle } from "@/lib/rating-tier";
import { PlayerProfileDialog } from "@/components/player-card/player-profile-dialog";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { OverallBadge } from "@/components/player-card/overall-badge";
import type { SquadPlayerVM } from "./squad-editor";

/**
 * Avatar + name + position, shared between the roster table's "Jogador"
 * cell and add-player-dialog.tsx's search results — same visual language,
 * different surrounding actions (drag/number/captain/remove here vs. an
 * "Adicionar" button there).
 */
export function PlayerRowContent({
  photoUrl,
  name,
  position,
  overall,
}: {
  photoUrl?: string | null;
  name: string;
  position?: string | null;
  overall?: number | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <PlayerAvatar
        src={photoUrl}
        name={name}
        size="sm"
        className={cn("ring-2", ratingStyle(overall).ring)}
      />
      <div className="min-w-0 flex-1 text-left">
        <div className="font-heading truncate text-sm font-bold">{name}</div>
        {position && <div className="text-muted-foreground truncate text-xs">{position}</div>}
      </div>
    </div>
  );
}

interface RosterHandlers {
  onNumberChange: (id: string, value: string) => void;
  onCaptainToggle: (id: string, value: boolean) => void;
  onRemove: (id: string) => void;
}

/**
 * Dense table replacement for the old card-list bench: a dedicated grip
 * handle carries the drag listeners instead of the whole row, so every
 * other cell (name, number, captain, remove) is a plain, unambiguous click
 * target — no activationConstraint/stopPropagation choreography needed for
 * those, unlike the pitch chips which still drag by their whole body.
 */
export function RosterTable({ bench, ...handlers }: { bench: SquadPlayerVM[] } & RosterHandlers) {
  const { setNodeRef, isOver } = useDroppable({ id: "bench" });
  const groups = groupPlayersByPosition(bench);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "max-h-[32rem] min-h-24 overflow-y-auto rounded-lg border",
        isOver && "border-primary bg-accent/40",
      )}
    >
      {bench.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">Arraste um jogador para cá.</p>
      ) : (
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className="bg-muted/50 text-muted-foreground font-heading sticky top-0 z-10 text-[11px] uppercase">
            <tr>
              <th className="w-7"></th>
              <th className="px-2 py-2 text-left font-semibold">Jogador</th>
              <th className="w-12 px-1 py-2 text-center font-semibold">OVR</th>
              <th className="w-11 px-1 py-2 text-center font-semibold">#</th>
              <th className="w-7"></th>
              <th className="w-7"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ group, players }) => (
              <RosterGroup key={group} group={group} players={players} {...handlers} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RosterGroup({
  group,
  players,
  ...handlers
}: { group: string; players: SquadPlayerVM[] } & RosterHandlers) {
  return (
    <>
      <tr className="bg-muted/30">
        <td
          colSpan={6}
          className="text-muted-foreground font-heading border-primary/40 border-l-2 px-2 py-1 text-[10px] font-semibold tracking-wide uppercase"
        >
          {group}
        </td>
      </tr>
      {players.map((player) => (
        <RosterRow key={player.id} player={player} {...handlers} />
      ))}
    </>
  );
}

function RosterRow({ player, onNumberChange, onCaptainToggle, onRemove }: { player: SquadPlayerVM } & RosterHandlers) {
  // No transform/translate here on purpose: CSS transforms on <tr> render
  // inconsistently across engines (table-row boxes aren't a normal
  // transformable element the way a <div> is), which is what made
  // dragging a bench player look completely static until it dropped. The
  // actual moving visual comes from DragOverlay in squad-editor.tsx; this
  // row just dims in place while its clone follows the cursor.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: player.id,
  });

  const profileInfo = {
    name: player.name,
    club: player.club,
    position: player.position,
    photoUrl: player.photoUrl,
    overall: player.overall,
    externalLink: player.externalLink,
  };

  return (
    <tr
      ref={setNodeRef}
      className={cn(
        "hover:bg-accent/30 border-t transition-colors",
        isDragging && "opacity-30",
      )}
    >
      <td className="text-center">
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label={`Arrastar ${player.name}`}
          className="text-muted-foreground hover:text-foreground flex size-6 cursor-grab touch-none items-center justify-center rounded outline-none"
        >
          <GripVerticalIcon className="size-4" />
        </button>
      </td>
      <td className="px-2 py-1.5">
        <PlayerProfileDialog
          player={profileInfo}
          aria-label={`Ver perfil de ${player.name}`}
          className="block w-full"
        >
          <PlayerRowContent
            photoUrl={player.photoUrl}
            name={player.name}
            position={player.position}
            overall={player.overall}
          />
        </PlayerProfileDialog>
      </td>
      <td className="px-1 text-center">
        <OverallBadge overall={player.overall} />
      </td>
      <td className="px-1">
        <input
          type="number"
          min={1}
          max={99}
          value={player.shirtNumber ?? ""}
          onChange={(e) => onNumberChange(player.id, e.target.value)}
          placeholder="#"
          autoComplete="off"
          className="bg-background text-foreground font-heading w-full rounded border-0 text-center text-sm font-bold outline-none"
        />
      </td>
      <td className="text-center">
        <button
          type="button"
          onClick={() => onCaptainToggle(player.id, !player.isCaptain)}
          aria-label={player.isCaptain ? "Remover capitão" : "Definir como capitão"}
          className={cn(
            "mx-auto flex size-6 items-center justify-center rounded-full text-[10px] font-bold",
            player.isCaptain ? "bg-amber-400 text-amber-950" : "bg-muted text-muted-foreground",
          )}
        >
          C
        </button>
      </td>
      <td className="text-center">
        <button
          type="button"
          onClick={() => onRemove(player.id)}
          aria-label="Remover do elenco"
          className="text-muted-foreground hover:text-destructive mx-auto flex size-6 items-center justify-center rounded-full"
        >
          <XIcon className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}
