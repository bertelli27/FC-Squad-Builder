"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { XIcon, Volleyball, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFormationSlots } from "@/lib/formations";
import { ratingStyle } from "@/lib/rating-tier";
import { PlayerProfileDialog } from "@/components/player-card/player-profile-dialog";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RosterTable } from "./roster-table";
import { AddPlayerDialog } from "./add-player-dialog";

export interface SquadPlayerVM {
  id: string;
  source?: string | null;
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
  // Without a distance threshold, PointerSensor starts tracking a
  // potential drag on the very first pixel of pointer movement from ANY
  // pointerdown on a draggable chip — including pointerdown on a nested
  // button/dialog trigger inside it. That routinely left the sensor in a
  // stuck capture state after opening a player's profile (clicks on the
  // dialog's close button and backdrop stopped registering; drag felt
  // unreliable afterward too, since dnd-kit is this stuck at that point).
  // Requiring 8px of movement before a drag "activates" is dnd-kit's own
  // documented fix for draggable items containing interactive children.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [activePlayer, setActivePlayer] = useState<SquadPlayerVM | null>(null);

  function findPlayer(id: string): SquadPlayerVM | null {
    for (const key of Object.keys(state.slots)) {
      if (state.slots[key]?.id === id) return state.slots[key];
    }
    return state.bench.find((p) => p.id === id) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActivePlayer(findPlayer(String(event.active.id)));
  }

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
    setActivePlayer(null);
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
    const ok = await confirm({
      title: "Remover este jogador do elenco?",
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;

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
    onUpdated: updatePlayerLocal,
  };

  return (
    <DndContext
      id="squad-editor"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActivePlayer(null)}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-3 [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Volleyball className="text-primary size-4" />
              Campo tático
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <div
              className="relative aspect-[2/3] w-full max-w-md overflow-hidden rounded-xl shadow-lg ring-1 ring-black/10"
              style={{
                // Mown-grass stripes instead of a flat gradient — the pitch
                // keeps this same grass tone in both light and dark mode by
                // design (it's meant to read as turf, not follow the app's
                // background token).
                background:
                  "repeating-linear-gradient(180deg, oklch(0.5 0.15 145) 0px, oklch(0.5 0.15 145) 40px, oklch(0.46 0.15 145) 40px, oklch(0.46 0.15 145) 80px)",
              }}
            >
              <PitchLines />
              {formationSlots.map((s) => (
                <DroppableSlot
                  key={s.slot}
                  slotKey={s.slot}
                  label={s.label}
                  x={s.x}
                  y={s.y}
                  player={state.slots[s.slot]}
                  squadId={squadId}
                  {...chipHandlers}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="text-primary size-4" />
              Elenco ({state.bench.length})
            </CardTitle>
            <AddPlayerDialog squadId={squadId} onAdded={handlePlayerAdded} />
          </CardHeader>
          <CardContent className="p-3">
            <RosterTable bench={state.bench} squadId={squadId} {...chipHandlers} />
          </CardContent>
        </Card>
      </div>
      {/* The floating clone that actually follows the cursor during a
          drag. Both drag sources (pitch chip, roster table row) just show
          reduced opacity in place via `isDragging` — neither one moves
          itself anymore. That matters most for the table: CSS transforms
          on <tr> render inconsistently across engines (a table-row box
          isn't a normal transformable element the way a <div> is), which
          is exactly why dragging a bench player used to show no movement
          at all until it dropped. */}
      <DragOverlay dropAnimation={null}>
        {activePlayer ? <DragOverlayChip player={activePlayer} /> : null}
      </DragOverlay>
      {confirmDialog}
    </DndContext>
  );
}

function PitchLines() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-50">
      <div className="absolute inset-3 rounded-sm border border-white/70" />
      <div className="absolute top-1/2 right-3 left-3 border-t border-white/70" />
      <div className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70" />
    </div>
  );
}

function DroppableSlot({
  slotKey,
  label,
  x,
  y,
  player,
  squadId,
  onNumberChange,
  onCaptainToggle,
  onRemove,
  onUpdated,
}: {
  slotKey: string;
  label: string;
  x: number;
  y: number;
  player: SquadPlayerVM | null;
  squadId: string;
  onNumberChange: (id: string, value: string) => void;
  onCaptainToggle: (id: string, value: boolean) => void;
  onRemove: (id: string) => void;
  onUpdated: (id: string, patch: Partial<SquadPlayerVM>) => void;
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
          squadId={squadId}
          onNumberChange={onNumberChange}
          onCaptainToggle={onCaptainToggle}
          onRemove={onRemove}
          onUpdated={onUpdated}
        />
      ) : (
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-full border-2 border-dashed border-white/50 text-xs font-medium text-white/80",
            isOver && "border-primary bg-primary/25 text-white",
          )}
        >
          {label}
        </div>
      )}
    </div>
  );
}

/** Floating clone rendered inside DragOverlay — same look as the pitch chip's avatar+name, without any of its interactive/draggable wiring (the overlay is purely visual). */
function DragOverlayChip({ player }: { player: SquadPlayerVM }) {
  return (
    <div className="flex w-20 cursor-grabbing flex-col items-center gap-1">
      <PlayerAvatar
        src={player.photoUrl}
        name={player.name}
        size="lg"
        className={cn("bg-background shadow-xl ring-2", ratingStyle(player.overall).ring)}
      />
      <span className="font-heading max-w-20 truncate rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white shadow-sm ring-1 ring-white/10 backdrop-blur-sm">
        {player.name}
      </span>
    </div>
  );
}

function PlayerChip({
  player,
  squadId,
  onNumberChange,
  onCaptainToggle,
  onRemove,
  onUpdated,
}: {
  player: SquadPlayerVM;
  squadId: string;
  onNumberChange: (id: string, value: string) => void;
  onCaptainToggle: (id: string, value: boolean) => void;
  onRemove: (id: string) => void;
  onUpdated: (id: string, patch: Partial<SquadPlayerVM>) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: player.id,
  });

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
      className="bg-background/90 text-foreground font-heading w-10 shrink-0 rounded-md py-0.5 text-center text-lg font-bold outline-none"
    />
  );

  const captainButton = (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => onCaptainToggle(player.id, !player.isCaptain)}
      aria-label={player.isCaptain ? "Remover capitão" : "Definir como capitão"}
      className={cn(
        "flex size-4 items-center justify-center rounded-full text-[10px] font-bold backdrop-blur-sm",
        player.isCaptain ? "bg-amber-400 text-amber-950" : "bg-black/35 text-white",
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
      className="flex size-4 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm"
    >
      <XIcon className="size-2.5" />
    </button>
  );

  const profileInfo = {
    source: player.source,
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

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex w-20 cursor-grab touch-none flex-col items-center gap-1",
        isDragging && "opacity-30",
      )}
    >
      <div className="relative">
        <PlayerProfileDialog
          player={profileInfo}
          squadId={squadId}
          squadPlayerId={player.id}
          onUpdated={(patch) => onUpdated(player.id, patch)}
          aria-label={`Ver perfil de ${player.name}`}
          className="block rounded-full"
        >
          <PlayerAvatar
            src={player.photoUrl}
            name={player.name}
            size="lg"
            // Ring color reflects the player's overall tier (gold/green/
            // blue/plain) — same idea as an EA FC card's border color.
            className={cn("bg-background shadow-md ring-2", ratingStyle(player.overall).ring)}
          />
        </PlayerProfileDialog>
        <div className="absolute -top-1 -right-1">{captainButton}</div>
        <div className="absolute -top-1 -left-1">{removeButton}</div>
      </div>
      {numberInput}
      {/* Plain text, not another profile trigger: Base UI's DialogTrigger
          owns pointer events in a way dnd-kit can't see through, even
          without our own stopPropagation — wrapping both the avatar AND
          the name would leave almost no chip surface draggable. The
          avatar above is enough of a click target. */}
      <span className="font-heading max-w-20 truncate rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white shadow-sm ring-1 ring-white/10 backdrop-blur-sm">
        {player.name}
      </span>
    </div>
  );
}
