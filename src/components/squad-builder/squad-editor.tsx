"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getFormationSlots } from "@/lib/formations";
import { groupPlayersByPosition } from "@/lib/position-groups";
import { PlayerProfileDialog } from "@/components/player-card/player-profile-dialog";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { AddPlayerDialog } from "./add-player-dialog";

export interface SquadPlayerVM {
  id: string;
  name: string;
  photoUrl?: string | null;
  position?: string | null;
  club?: string | null;
  overall?: number | null;
  shirtNumber?: number | null;
  isCaptain: boolean;
  isStarter: boolean;
  positionSlot?: string | null;
  externalLink?: string | null;
}

interface EditorState {
  slots: Record<string, SquadPlayerVM | null>;
  bench: SquadPlayerVM[];
}

function buildInitialState(players: SquadPlayerVM[], formation: string): EditorState {
  const formationSlots = getFormationSlots(formation);
  const slotKeys = new Set(formationSlots.map((s) => s.slot));
  const slots: Record<string, SquadPlayerVM | null> = Object.fromEntries(
    formationSlots.map((s) => [s.slot, null]),
  );
  const bench: SquadPlayerVM[] = [];

  for (const player of players) {
    if (
      player.isStarter &&
      player.positionSlot &&
      slotKeys.has(player.positionSlot) &&
      !slots[player.positionSlot]
    ) {
      slots[player.positionSlot] = player;
    } else {
      bench.push(player);
    }
  }

  return { slots, bench };
}

export function SquadEditor({
  squadId,
  formation,
  players,
}: {
  squadId: string;
  formation: string;
  players: SquadPlayerVM[];
}) {
  const formationSlots = getFormationSlots(formation);
  const [state, setState] = useState<EditorState>(() => buildInitialState(players, formation));

  async function persistArrangement(next: EditorState) {
    const payload = [
      ...formationSlots.flatMap((s, i) => {
        const p = next.slots[s.slot];
        return p ? [{ id: p.id, positionSlot: s.slot, isStarter: true, order: i }] : [];
      }),
      ...next.bench.map((p, i) => ({
        id: p.id,
        positionSlot: null,
        isStarter: false,
        order: formationSlots.length + i,
      })),
    ];

    const res = await fetch(`/api/squads/${squadId}/players`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players: payload }),
    });
    if (!res.ok) toast.error("Não foi possível salvar a formação.");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const fromSlotKey = Object.keys(state.slots).find((k) => state.slots[k]?.id === activeId);
    const draggedPlayer = fromSlotKey
      ? state.slots[fromSlotKey]
      : state.bench.find((p) => p.id === activeId);
    if (!draggedPlayer) return;

    const slots = { ...state.slots };
    let bench = [...state.bench];

    if (overId === "bench") {
      if (!fromSlotKey) return; // already on bench
      slots[fromSlotKey] = null;
      bench = [...bench, draggedPlayer];
    } else if (overId.startsWith("slot:")) {
      const targetSlotKey = overId.slice("slot:".length);
      if (targetSlotKey === fromSlotKey) return;
      const displaced = slots[targetSlotKey];

      slots[targetSlotKey] = draggedPlayer;
      if (fromSlotKey) {
        slots[fromSlotKey] = displaced ?? null;
      } else {
        bench = bench.filter((p) => p.id !== activeId);
        if (displaced) bench = [...bench, displaced];
      }
    } else {
      return;
    }

    const next = { slots, bench };
    setState(next);
    persistArrangement(next);
  }

  function updatePlayerLocal(playerId: string, patch: Partial<SquadPlayerVM>) {
    setState((prev) => {
      const slots = { ...prev.slots };
      for (const key of Object.keys(slots)) {
        const p = slots[key];
        if (!p) continue;
        slots[key] =
          p.id === playerId
            ? { ...p, ...patch }
            : patch.isCaptain
              ? { ...p, isCaptain: false }
              : p;
      }
      const bench = prev.bench.map((p) =>
        p.id === playerId ? { ...p, ...patch } : patch.isCaptain ? { ...p, isCaptain: false } : p,
      );
      return { slots, bench };
    });
  }

  async function handleNumberChange(playerId: string, value: string) {
    const shirtNumber = value === "" ? null : Number(value);
    if (shirtNumber !== null && (Number.isNaN(shirtNumber) || shirtNumber < 1 || shirtNumber > 99)) {
      return;
    }
    updatePlayerLocal(playerId, { shirtNumber });
    const res = await fetch(`/api/squads/${squadId}/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shirtNumber }),
    });
    if (!res.ok) toast.error("Não foi possível salvar o número.");
  }

  async function handleCaptainToggle(playerId: string, isCaptain: boolean) {
    updatePlayerLocal(playerId, { isCaptain });
    const res = await fetch(`/api/squads/${squadId}/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCaptain }),
    });
    if (!res.ok) toast.error("Não foi possível definir o capitão.");
  }

  async function handleRemove(playerId: string) {
    if (!confirm("Remover este jogador do elenco?")) return;

    setState((prev) => {
      const slots = { ...prev.slots };
      for (const key of Object.keys(slots)) {
        if (slots[key]?.id === playerId) slots[key] = null;
      }
      return { slots, bench: prev.bench.filter((p) => p.id !== playerId) };
    });

    const res = await fetch(`/api/squads/${squadId}/players/${playerId}`, { method: "DELETE" });
    if (!res.ok) toast.error("Não foi possível remover o jogador.");
  }

  function handlePlayerAdded(player: SquadPlayerVM) {
    setState((prev) => ({ ...prev, bench: [...prev.bench, player] }));
    toast.success(`${player.name} adicionado ao elenco.`);
  }

  const chipHandlers = {
    onNumberChange: handleNumberChange,
    onCaptainToggle: handleCaptainToggle,
    onRemove: handleRemove,
  };

  return (
    <DndContext id="squad-editor" collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative aspect-[2/3] max-w-md justify-self-center overflow-hidden rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 lg:justify-self-start">
          <PitchLines />
          {formationSlots.map((s) => (
            <DroppableSlot
              key={s.slot}
              slotKey={s.slot}
              label={s.label}
              x={s.x}
              y={s.y}
              player={state.slots[s.slot]}
              {...chipHandlers}
            />
          ))}
        </div>

        <BenchPanel
          squadId={squadId}
          bench={state.bench}
          onPlayerAdded={handlePlayerAdded}
          {...chipHandlers}
        />
      </div>
    </DndContext>
  );
}

function PitchLines() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-40">
      <div className="absolute inset-3 rounded-sm border border-white/60" />
      <div className="absolute top-1/2 right-3 left-3 border-t border-white/60" />
      <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60" />
    </div>
  );
}

function DroppableSlot({
  slotKey,
  label,
  x,
  y,
  player,
  onNumberChange,
  onCaptainToggle,
  onRemove,
}: {
  slotKey: string;
  label: string;
  x: number;
  y: number;
  player: SquadPlayerVM | null;
  onNumberChange: (id: string, value: string) => void;
  onCaptainToggle: (id: string, value: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${slotKey}` });

  return (
    <div
      ref={setNodeRef}
      style={{ left: `${x}%`, top: `${y}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
    >
      {player ? (
        <PlayerChip
          player={player}
          variant="pitch"
          onNumberChange={onNumberChange}
          onCaptainToggle={onCaptainToggle}
          onRemove={onRemove}
        />
      ) : (
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-full border-2 border-dashed border-white/50 text-xs font-medium text-white/80",
            isOver && "border-white bg-white/10",
          )}
        >
          {label}
        </div>
      )}
    </div>
  );
}

function BenchPanel({
  squadId,
  bench,
  onNumberChange,
  onCaptainToggle,
  onRemove,
  onPlayerAdded,
}: {
  squadId: string;
  bench: SquadPlayerVM[];
  onNumberChange: (id: string, value: string) => void;
  onCaptainToggle: (id: string, value: boolean) => void;
  onRemove: (id: string) => void;
  onPlayerAdded: (player: SquadPlayerVM) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "bench" });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-medium">Reservas ({bench.length})</h2>
        <AddPlayerDialog squadId={squadId} onAdded={onPlayerAdded} />
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-col gap-2 rounded-xl border border-dashed p-2",
          isOver && "border-primary bg-accent",
        )}
      >
        {bench.length === 0 && (
          <p className="text-muted-foreground p-2 text-sm">Arraste um jogador para cá.</p>
        )}
        {groupPlayersByPosition(bench).map(({ group, players }) => (
          <div key={group} className="flex flex-col gap-2">
            <h3 className="text-muted-foreground px-1 text-xs font-semibold tracking-wide uppercase">
              {group}
            </h3>
            {players.map((player) => (
              <PlayerChip
                key={player.id}
                player={player}
                variant="bench"
                onNumberChange={onNumberChange}
                onCaptainToggle={onCaptainToggle}
                onRemove={onRemove}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerChip({
  player,
  variant,
  onNumberChange,
  onCaptainToggle,
  onRemove,
}: {
  player: SquadPlayerVM;
  variant: "pitch" | "bench";
  onNumberChange: (id: string, value: string) => void;
  onCaptainToggle: (id: string, value: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const numberInput = (
    <input
      type="number"
      min={1}
      max={99}
      value={player.shirtNumber ?? ""}
      onChange={(e) => onNumberChange(player.id, e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      placeholder="#"
      autoComplete="off"
      className="bg-background/90 text-foreground w-9 rounded text-center text-xs outline-none"
    />
  );

  const captainButton = (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => onCaptainToggle(player.id, !player.isCaptain)}
      aria-label={player.isCaptain ? "Remover capitão" : "Definir como capitão"}
      className={cn(
        "flex size-4 items-center justify-center rounded-full text-[10px] font-bold",
        player.isCaptain ? "bg-yellow-400 text-black" : "bg-black/30 text-white",
      )}
    >
      C
    </button>
  );

  const removeButton = (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => onRemove(player.id)}
      aria-label="Remover do elenco"
      className="flex size-4 items-center justify-center rounded-full bg-black/30 text-white"
    >
      <XIcon className="size-2.5" />
    </button>
  );

  const profileInfo = {
    name: player.name,
    club: player.club,
    position: player.position,
    photoUrl: player.photoUrl,
    overall: player.overall,
    externalLink: player.externalLink,
  };
  // No onPointerDown/stopPropagation here on purpose: dnd-kit only starts a
  // drag past a small movement threshold, and doesn't fire a `click` event
  // after a drag completes — so a plain click already reaches this trigger
  // untouched, and an actual drag never does. That's what makes "click
  // opens the profile, drag moves the player" work without extra state.

  if (variant === "pitch") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={cn(
          "flex w-16 cursor-grab touch-none flex-col items-center gap-1",
          isDragging && "z-50 opacity-50",
        )}
      >
        <div className="relative">
          <PlayerProfileDialog
            player={profileInfo}
            aria-label={`Ver perfil de ${player.name}`}
            className="block rounded-full"
          >
            <PlayerAvatar
              src={player.photoUrl}
              name={player.name}
              size="lg"
              className="bg-background ring-2 ring-white"
            />
          </PlayerProfileDialog>
          <div className="absolute -top-1 -right-1">{captainButton}</div>
          <div className="absolute -top-1 -left-1">{removeButton}</div>
        </div>
        {numberInput}
        <PlayerProfileDialog
          player={profileInfo}
          aria-label={`Ver perfil de ${player.name}`}
          className="max-w-16 truncate rounded bg-black/60 px-1 text-[10px] text-white"
        >
          {player.name}
        </PlayerProfileDialog>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-card flex cursor-grab touch-none items-center gap-3 rounded-lg border p-2",
        isDragging && "z-50 opacity-50",
      )}
    >
      <PlayerProfileDialog
        player={profileInfo}
        aria-label={`Ver perfil de ${player.name}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <PlayerAvatar src={player.photoUrl} name={player.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{player.name}</span>
          <span className="text-muted-foreground truncate text-xs">{player.position}</span>
        </div>
      </PlayerProfileDialog>
      {captainButton}
      {numberInput}
      {player.overall != null && <Badge variant="secondary">{player.overall}</Badge>}
      {removeButton}
    </div>
  );
}
