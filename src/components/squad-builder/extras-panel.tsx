"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVerticalIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GROUP_ORDER, positionGroup } from "@/lib/position-groups";
import { PlayerProfileDialog } from "@/components/player-card/player-profile-dialog";
import { PlayerRowContent } from "./roster-table";
import type { SquadPlayerVM } from "./squad-editor";

/**
 * The part of a real national-team roster beyond the 26 called up (see
 * squad.service.ts's cap at NATIONAL_TEAM_SQUAD_SIZE) — laid out as
 * columns by position, unlike watchlist-panel.tsx's single list, since
 * this is meant to read like an actual squad sheet. The 5 real position
 * groups always render (even empty) so the columns stay aligned; "Outros"
 * is skipped when empty — position is required when creating a custom
 * player now, so that bucket should stay unused in practice, and an
 * always-empty "Outros" column was just clutter. Still rendered if it
 * ever DOES hold someone (e.g. older data from before position was
 * required), so nobody becomes invisible. One droppable for the whole
 * panel (no per-player swap target here, same as the bench's
 * whole-container "bench" id) — dragging FROM here onto a specific pitch
 * slot or bench row is what performs the swap, handled in
 * squad-editor.tsx.
 */
export function ExtrasPanel({
  players,
  seasonId,
  ageReference,
  onRemove,
  onUpdated,
  onTransferredOut,
  onDeleted,
}: {
  players: SquadPlayerVM[];
  seasonId: string;
  ageReference?: { startYear: number; calendar: string };
  onRemove: (id: string) => void;
  onUpdated: (id: string, patch: Partial<SquadPlayerVM>) => void;
  onTransferredOut: (id: string, playerName: string, counterpartClub: string) => void;
  onDeleted: (id: string, playerName: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "extras" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex gap-3 overflow-x-auto rounded-lg border p-2",
        isOver && "border-primary bg-accent/40",
      )}
    >
      {GROUP_ORDER.map((group) => {
        const groupPlayers = players.filter((p) => positionGroup(p.position) === group);
        if (group === "Outros" && groupPlayers.length === 0) return null;
        return (
          <div key={group} className="min-w-36 flex-1">
            <div className="text-muted-foreground font-heading px-1 py-1 text-[10px] font-semibold tracking-wide uppercase">
              {group}
            </div>
            {groupPlayers.length === 0 ? (
              <p className="text-muted-foreground px-1 text-xs">—</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {groupPlayers.map((player) => (
                  <ExtraRow
                    key={player.id}
                    player={player}
                    seasonId={seasonId}
                    ageReference={ageReference}
                    onRemove={onRemove}
                    onUpdated={onUpdated}
                    onTransferredOut={onTransferredOut}
                    onDeleted={onDeleted}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExtraRow({
  player,
  seasonId,
  ageReference,
  onRemove,
  onUpdated,
  onTransferredOut,
  onDeleted,
}: {
  player: SquadPlayerVM;
  seasonId: string;
  ageReference?: { startYear: number; calendar: string };
  onRemove: (id: string) => void;
  onUpdated: (id: string, patch: Partial<SquadPlayerVM>) => void;
  onTransferredOut: (id: string, playerName: string, counterpartClub: string) => void;
  onDeleted: (id: string, playerName: string) => void;
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
    careerId: player.careerId,
  };

  return (
    <li
      ref={setNodeRef}
      className={cn(
        "hover:bg-accent/30 flex items-center gap-1 rounded-md px-1 py-1",
        isDragging && "opacity-30",
      )}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Arrastar ${player.name}`}
        className="text-muted-foreground hover:text-foreground flex size-5 shrink-0 cursor-grab touch-none items-center justify-center rounded outline-none"
      >
        <GripVerticalIcon className="size-3.5" />
      </button>
      <PlayerProfileDialog
        player={profileInfo}
        seasonId={seasonId}
        squadPlayerId={player.id}
        ageReference={ageReference}
        onUpdated={(patch) => onUpdated(player.id, patch)}
        onTransferredOut={(counterpartClub) => onTransferredOut(player.id, player.name, counterpartClub)}
        onDeleted={() => onDeleted(player.id, player.name)}
        aria-label={`Ver perfil de ${player.name}`}
        className="block min-w-0 flex-1"
      >
        <PlayerRowContent photoUrl={player.photoUrl} name={player.name} />
      </PlayerProfileDialog>
      <button
        type="button"
        onClick={() => onRemove(player.id)}
        aria-label="Remover do elenco"
        className="text-muted-foreground hover:text-destructive flex size-5 shrink-0 items-center justify-center rounded-full"
      >
        <XIcon className="size-3" />
      </button>
    </li>
  );
}
