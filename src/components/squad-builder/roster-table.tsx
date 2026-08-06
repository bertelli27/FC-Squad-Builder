"use client";

import { useCallback } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVerticalIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { groupPlayersByPosition } from "@/lib/position-groups";
import { ratingStyle } from "@/lib/rating-tier";
import { PlayerProfileDialog } from "@/components/player-card/player-profile-dialog";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { OverallBadge } from "@/components/player-card/overall-badge";
import { NumberField } from "@/components/ui/number-field";
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
  onNumberChange: (id: string, value: number | null) => void;
  onCaptainToggle: (id: string, value: boolean) => void;
  onRemove: (id: string) => void;
  onUpdated: (id: string, patch: Partial<SquadPlayerVM>) => void;
  onTransferredOut: (id: string, playerName: string, counterpartClub: string) => void;
  onDeleted: (id: string, playerName: string) => void;
}

/**
 * Dense table replacement for the old card-list bench: a dedicated grip
 * handle carries the drag listeners instead of the whole row, so every
 * other cell (name, number, captain, remove) is a plain, unambiguous click
 * target — no activationConstraint/stopPropagation choreography needed for
 * those, unlike the pitch chips which still drag by their whole body.
 */
export function RosterTable({
  bench,
  seasonId,
  duplicateNumbers,
  ageReference,
  ...handlers
}: {
  bench: SquadPlayerVM[];
  seasonId: string;
  /** Shirt numbers that appear more than once across starters+bench — flagged with a red ring wherever they're shown. */
  duplicateNumbers: Set<number>;
  ageReference?: { startYear: number; calendar: string };
} & RosterHandlers) {
  const { setNodeRef, isOver } = useDroppable({ id: "bench" });
  const groups = groupPlayersByPosition(bench);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Absolutely positioned only from lg: up, matching squad-editor.tsx's
        // CardContent (`relative`, padded on mobile, unpadded + lg:p-0 on
        // desktop where this inset-3 stands in for that padding instead) —
        // see the comment there for why: this keeps the table's own content
        // height from ever influencing the panel's size on desktop, so it
        // just fills whatever height the panel ends up being and scrolls.
        // Below lg the two panels stack (no sibling to stretch this Card's
        // height against), so the table stays in normal flow there instead —
        // sized by its own content, capped with its own max-height so a long
        // bench still scrolls internally rather than growing forever.
        "static max-h-[28rem] min-h-24 overflow-y-auto rounded-lg border lg:absolute lg:inset-3 lg:max-h-none",
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
              <RosterGroup
                key={group}
                group={group}
                players={players}
                seasonId={seasonId}
                duplicateNumbers={duplicateNumbers}
                ageReference={ageReference}
                {...handlers}
              />
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
  seasonId,
  duplicateNumbers,
  ageReference,
  ...handlers
}: {
  group: string;
  players: SquadPlayerVM[];
  seasonId: string;
  duplicateNumbers: Set<number>;
  ageReference?: { startYear: number; calendar: string };
} & RosterHandlers) {
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
        <RosterRow
          key={player.id}
          player={player}
          seasonId={seasonId}
          isDuplicateNumber={player.shirtNumber != null && duplicateNumbers.has(player.shirtNumber)}
          ageReference={ageReference}
          {...handlers}
        />
      ))}
    </>
  );
}

function RosterRow({
  player,
  seasonId,
  isDuplicateNumber,
  ageReference,
  onNumberChange,
  onCaptainToggle,
  onRemove,
  onUpdated,
  onTransferredOut,
  onDeleted,
}: {
  player: SquadPlayerVM;
  seasonId: string;
  isDuplicateNumber: boolean;
  ageReference?: { startYear: number; calendar: string };
} & RosterHandlers) {
  // No transform/translate here on purpose: CSS transforms on <tr> render
  // inconsistently across engines (table-row boxes aren't a normal
  // transformable element the way a <div> is), which is what made
  // dragging a bench player look completely static until it dropped. The
  // actual moving visual comes from DragOverlay in squad-editor.tsx; this
  // row just dims in place while its clone follows the cursor.
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: player.id,
  });
  // A second, row-specific droppable target alongside the whole-table one
  // above ("bench") — only meaningful when an extras/observado player is
  // dragged onto this exact row (squad-editor.tsx's handleDragEnd treats
  // it as "swap with this player"); dropping a pitch/bench player here
  // falls back to the same plain-append behavior as the table-wide target.
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `benchPlayer:${player.id}` });
  // setDragRef/setDropRef are themselves stable (memoized inside dnd-kit),
  // but an inline arrow function here would still be a brand-new closure
  // every render — React tears down and reattaches the ref on each one,
  // which was silently breaking dnd-kit's rect measurement for this row's
  // droppable (it never registered as a valid drop target). useCallback
  // keeps the combined setter itself stable across renders.
  const setNodeRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

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
    careerId: player.careerId,
  };

  return (
    <tr
      ref={setNodeRef}
      className={cn(
        "hover:bg-accent/30 border-t transition-colors",
        isDragging && "opacity-30",
        isOver && "bg-primary/15",
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
          seasonId={seasonId}
          squadPlayerId={player.id}
          ageReference={ageReference}
          onUpdated={(patch) => onUpdated(player.id, patch)}
          onTransferredOut={(counterpartClub) => onTransferredOut(player.id, player.name, counterpartClub)}
          onDeleted={() => onDeleted(player.id, player.name)}
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
        <NumberField
          min={1}
          max={99}
          value={player.shirtNumber ?? null}
          onChange={(value) => onNumberChange(player.id, value)}
          placeholder="#"
          className={cn(
            "bg-background text-foreground font-heading h-auto w-full rounded border-0 px-1 text-center text-sm font-bold outline-none",
            isDuplicateNumber && "ring-2 ring-destructive",
          )}
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
