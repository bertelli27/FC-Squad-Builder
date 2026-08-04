"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { XIcon, Volleyball, Users, Eye, LayersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFormationSlots } from "@/lib/formations";
import { ratingStyle } from "@/lib/rating-tier";
import { NATIONAL_TEAM_SQUAD_SIZE } from "@/lib/national-team";
import { PlayerProfileDialog } from "@/components/player-card/player-profile-dialog";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RosterTable } from "./roster-table";
import { AddPlayerDialog } from "./add-player-dialog";
import { WatchlistPanel } from "./watchlist-panel";
import { ExtrasPanel } from "./extras-panel";

export interface SquadPlayerVM {
  id: string;
  cachedPlayerId: string;
  source?: string | null;
  name: string;
  photoUrl?: string | null;
  position?: string | null;
  secondaryPositions?: string[] | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  club?: string | null;
  overall?: number | null;
  potential?: number | null;
  shirtNumber?: number | null;
  isCaptain: boolean;
  isStarter: boolean;
  isWatchlist: boolean;
  isExtra: boolean;
  positionSlot?: string | null;
  externalLink?: string | null;
  /** §26 etapa 8 — set when this player has a linked PlayerCareer, to show "Ver carreira" in the profile. */
  careerId?: string | null;
}

interface EditorState {
  slots: Record<string, SquadPlayerVM | null>;
  bench: SquadPlayerVM[];
  watchlist: SquadPlayerVM[];
  extras: SquadPlayerVM[];
}

/**
 * Plain `closestCenter` gets ambiguous with many small, densely-packed
 * droppables (the bench has one per row, ~36px tall) — it occasionally
 * resolves to an ADJACENT row instead of the one actually under the
 * cursor, since it only compares rect centers, not whether the pointer is
 * literally inside a rect. `pointerWithin` is precise (pointer must be
 * inside the rect) but too strict for the pitch's small circular slots,
 * so try it first and fall back to `closestCenter` when it finds nothing
 * — the standard dnd-kit pattern for mixing precise and forgiving targets
 * in the same context.
 */
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return closestCenter(args);
};

function buildInitialState(players: SquadPlayerVM[], formation: string): EditorState {
  const formationSlots = getFormationSlots(formation);
  const slotKeys = new Set(formationSlots.map((s) => s.slot));
  const slots: Record<string, SquadPlayerVM | null> = Object.fromEntries(
    formationSlots.map((s) => [s.slot, null]),
  );
  const bench: SquadPlayerVM[] = [];
  const watchlist: SquadPlayerVM[] = [];
  const extras: SquadPlayerVM[] = [];

  for (const player of players) {
    if (player.isWatchlist) {
      watchlist.push(player);
    } else if (player.isExtra) {
      extras.push(player);
    } else if (
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

  return { slots, bench, watchlist, extras };
}

export function SquadEditor({
  seasonId,
  formation,
  players,
  baseKind,
  ageReference,
}: {
  seasonId: string;
  formation: string;
  players: SquadPlayerVM[];
  baseKind?: string | null;
  /** Season the player's age (§5/§19) should be computed as of. */
  ageReference?: { startYear: number; calendar: string };
}) {
  const formationSlots = getFormationSlots(formation);
  const [state, setState] = useState<EditorState>(() => buildInitialState(players, formation));
  const router = useRouter();
  // Etapa 7: `players` only ever changes reference after a router.refresh()
  // (this component's own DND/edit handlers all mutate `state` locally,
  // never re-render page.tsx) — so this only fires when something OUTSIDE
  // this editor changed the roster server-side, e.g. TransfersCard signing
  // a player in (§8-§13). Safe to fully re-derive from it: every local
  // edit already persists via its own fetch immediately, so the fresh
  // server data reflects those same edits plus whatever changed elsewhere.
  // Adjusting state during render (not in an effect) per React's own
  // guidance for "resetting state when a prop changes" — avoids an extra
  // commit/flash of stale data that a useEffect-based reset would cause.
  const [prevPlayers, setPrevPlayers] = useState(players);
  if (players !== prevPlayers) {
    setPrevPlayers(players);
    setState(buildInitialState(players, formation));
  }
  const isNationalTeam = baseKind === "nationalTeam";
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
    return (
      state.bench.find((p) => p.id === id) ??
      state.watchlist.find((p) => p.id === id) ??
      state.extras.find((p) => p.id === id) ??
      null
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActivePlayer(findPlayer(String(event.active.id)));
  }

  async function persistArrangement(next: EditorState) {
    const payload = [
      ...formationSlots.flatMap((s, i) => {
        const p = next.slots[s.slot];
        return p
          ? [
              {
                id: p.id,
                positionSlot: s.slot,
                isStarter: true,
                isWatchlist: false,
                isExtra: false,
                shirtNumber: p.shirtNumber ?? null,
                order: i,
              },
            ]
          : [];
      }),
      ...next.bench.map((p, i) => ({
        id: p.id,
        positionSlot: null,
        isStarter: false,
        isWatchlist: false,
        isExtra: false,
        shirtNumber: p.shirtNumber ?? null,
        order: formationSlots.length + i,
      })),
      ...next.watchlist.map((p, i) => ({
        id: p.id,
        positionSlot: null,
        isStarter: false,
        isWatchlist: true,
        isExtra: false,
        shirtNumber: p.shirtNumber ?? null,
        order: formationSlots.length + next.bench.length + i,
      })),
      ...next.extras.map((p, i) => ({
        id: p.id,
        positionSlot: null,
        isStarter: false,
        isWatchlist: false,
        isExtra: true,
        shirtNumber: p.shirtNumber ?? null,
        order: formationSlots.length + next.bench.length + next.watchlist.length + i,
      })),
    ];

    const res = await fetch(`/api/seasons/${seasonId}/players`, {
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
    const fromWatchlist = !fromSlotKey && state.watchlist.some((p) => p.id === activeId);
    const fromExtras = !fromSlotKey && !fromWatchlist && state.extras.some((p) => p.id === activeId);
    const draggedPlayer = fromSlotKey
      ? state.slots[fromSlotKey]
      : fromWatchlist
        ? state.watchlist.find((p) => p.id === activeId)
        : fromExtras
          ? state.extras.find((p) => p.id === activeId)
          : state.bench.find((p) => p.id === activeId);
    if (!draggedPlayer) return;

    const slots = { ...state.slots };
    let bench = [...state.bench];
    let watchlist = [...state.watchlist];
    let extras = [...state.extras];

    if (overId === "bench") {
      if (!fromSlotKey && !fromWatchlist && !fromExtras) return; // already on bench
      if (fromSlotKey) slots[fromSlotKey] = null;
      if (fromWatchlist) watchlist = watchlist.filter((p) => p.id !== activeId);
      if (fromExtras) extras = extras.filter((p) => p.id !== activeId);
      bench = [...bench, draggedPlayer];
    } else if (overId === "watchlist") {
      if (fromWatchlist) return; // already there
      if (fromSlotKey) slots[fromSlotKey] = null;
      else if (fromExtras) extras = extras.filter((p) => p.id !== activeId);
      else bench = bench.filter((p) => p.id !== activeId);
      watchlist = [...watchlist, draggedPlayer];
    } else if (overId === "extras") {
      if (fromExtras) return; // already there
      if (fromSlotKey) slots[fromSlotKey] = null;
      else if (fromWatchlist) watchlist = watchlist.filter((p) => p.id !== activeId);
      else bench = bench.filter((p) => p.id !== activeId);
      extras = [...extras, draggedPlayer];
    } else if (overId.startsWith("slot:")) {
      const targetSlotKey = overId.slice("slot:".length);
      if (targetSlotKey === fromSlotKey) return;
      const displaced = slots[targetSlotKey];
      // Calling up a scouted/extra player makes them inherit the shirt
      // number of whoever they're replacing, instead of keeping their own.
      const incoming =
        displaced && (fromWatchlist || fromExtras)
          ? { ...draggedPlayer, shirtNumber: displaced.shirtNumber }
          : draggedPlayer;

      slots[targetSlotKey] = incoming;
      if (fromSlotKey) {
        // Swap within the pitch: the displaced starter takes the dragged
        // player's old slot.
        slots[fromSlotKey] = displaced ?? null;
      } else if (fromWatchlist) {
        // The "call up a scouted player" swap: whoever was starting there
        // becomes the observado, not a bench reserve.
        watchlist = watchlist.filter((p) => p.id !== activeId);
        if (displaced) watchlist = [...watchlist, displaced];
      } else if (fromExtras) {
        extras = extras.filter((p) => p.id !== activeId);
        if (displaced) extras = [...extras, displaced];
      } else {
        bench = bench.filter((p) => p.id !== activeId);
        if (displaced) bench = [...bench, displaced];
      }
    } else if (overId.startsWith("benchPlayer:")) {
      const targetPlayerId = overId.slice("benchPlayer:".length);
      if (!fromWatchlist && !fromExtras) {
        // No special meaning yet for a pitch/bench-origin drag landing on
        // a specific bench row — same as dropping anywhere else in the
        // table.
        if (!fromSlotKey) return; // already on bench
        slots[fromSlotKey] = null;
        bench = [...bench, draggedPlayer];
      } else {
        const targetIndex = bench.findIndex((p) => p.id === targetPlayerId);
        if (targetIndex === -1) return;
        const displaced = bench[targetIndex];
        // Same "inherit the number of whoever's leaving" rule as the
        // pitch-slot swap above.
        const incoming = { ...draggedPlayer, shirtNumber: displaced.shirtNumber };
        bench = bench.map((p, i) => (i === targetIndex ? incoming : p));
        if (fromWatchlist) {
          watchlist = watchlist.filter((p) => p.id !== activeId);
          watchlist = [...watchlist, displaced];
        } else {
          extras = extras.filter((p) => p.id !== activeId);
          extras = [...extras, displaced];
        }
      }
    } else {
      return;
    }

    const next = { slots, bench, watchlist, extras };
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
      const watchlist = prev.watchlist.map((p) =>
        p.id === playerId ? { ...p, ...patch } : patch.isCaptain ? { ...p, isCaptain: false } : p,
      );
      const extras = prev.extras.map((p) =>
        p.id === playerId ? { ...p, ...patch } : patch.isCaptain ? { ...p, isCaptain: false } : p,
      );
      return { slots, bench, watchlist, extras };
    });
  }

  async function handleNumberChange(playerId: string, value: string) {
    const shirtNumber = value === "" ? null : Number(value);
    if (shirtNumber !== null && (Number.isNaN(shirtNumber) || shirtNumber < 1 || shirtNumber > 99)) {
      return;
    }
    updatePlayerLocal(playerId, { shirtNumber });
    const res = await fetch(`/api/seasons/${seasonId}/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shirtNumber }),
    });
    if (!res.ok) toast.error("Não foi possível salvar o número.");
  }

  async function handleCaptainToggle(playerId: string, isCaptain: boolean) {
    updatePlayerLocal(playerId, { isCaptain });
    const res = await fetch(`/api/seasons/${seasonId}/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCaptain }),
    });
    if (!res.ok) toast.error("Não foi possível definir o capitão.");
  }

  function removePlayerLocal(playerId: string) {
    setState((prev) => {
      const slots = { ...prev.slots };
      for (const key of Object.keys(slots)) {
        if (slots[key]?.id === playerId) slots[key] = null;
      }
      return {
        slots,
        bench: prev.bench.filter((p) => p.id !== playerId),
        watchlist: prev.watchlist.filter((p) => p.id !== playerId),
        extras: prev.extras.filter((p) => p.id !== playerId),
      };
    });
  }

  async function handleRemove(playerId: string) {
    const ok = await confirm({
      title: "Remover este jogador do elenco?",
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;

    removePlayerLocal(playerId);

    const res = await fetch(`/api/seasons/${seasonId}/players/${playerId}`, { method: "DELETE" });
    if (!res.ok) toast.error("Não foi possível remover o jogador.");
  }

  // Etapa 7 (§2-§7): the transfer-out endpoint already deletes the
  // SquadPlayer server-side as part of recording the Transfer — this only
  // needs to mirror that locally, no confirm/fetch of its own (unlike
  // handleRemove, which is a standalone destructive action).
  function handleTransferredOut(playerId: string, playerName: string, counterpartClub: string) {
    removePlayerLocal(playerId);
    toast.success(`${playerName} transferido para ${counterpartClub}.`);
    // TransfersCard (a sibling, not a child, of this editor) needs to pick
    // up the new "out" Transfer this created — same cross-sibling refresh
    // used for the reverse direction (signing a player in TransfersCard
    // updating this editor's roster). This editor's own local state is
    // already updated above, so the refresh only affects the sibling.
    router.refresh();
  }

  function handlePlayerAdded(player: SquadPlayerVM) {
    // The backend itself decides isExtra (26-man cap check) — a national
    // team squad already at 26 routes a fresh addition into extras
    // instead of the bench.
    if (player.isExtra) {
      setState((prev) => ({ ...prev, extras: [...prev.extras, player] }));
      toast.success(`${player.name} adicionado ao elenco ampliado (os 26 já estão completos).`);
    } else {
      setState((prev) => ({ ...prev, bench: [...prev.bench, player] }));
      toast.success(`${player.name} adicionado ao elenco.`);
    }
  }

  function handleWatchlistPlayerAdded(player: SquadPlayerVM) {
    setState((prev) => ({ ...prev, watchlist: [...prev.watchlist, player] }));
    toast.success(`${player.name} adicionado aos observados.`);
  }

  // Numbers shared by more than one starter/bench player — bench+starters
  // are the only surfaces with an editable number field, so that's all
  // that's checked (extras/observados never show one).
  const duplicateNumbers = useMemo(() => {
    const counts = new Map<number, number>();
    for (const p of Object.values(state.slots)) {
      if (p?.shirtNumber != null) counts.set(p.shirtNumber, (counts.get(p.shirtNumber) ?? 0) + 1);
    }
    for (const p of state.bench) {
      if (p.shirtNumber != null) counts.set(p.shirtNumber, (counts.get(p.shirtNumber) ?? 0) + 1);
    }
    const duplicates = new Set<number>();
    for (const [number, count] of counts) {
      if (count > 1) duplicates.add(number);
    }
    return duplicates;
  }, [state.slots, state.bench]);

  const chipHandlers = {
    onNumberChange: handleNumberChange,
    onCaptainToggle: handleCaptainToggle,
    onRemove: handleRemove,
    onUpdated: updatePlayerLocal,
    onTransferredOut: handleTransferredOut,
  };

  return (
    <DndContext
      id="squad-editor"
      sensors={sensors}
      collisionDetection={collisionDetection}
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
                  seasonId={seasonId}
                  duplicateNumbers={duplicateNumbers}
                  ageReference={ageReference}
                  {...chipHandlers}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-0 gap-0 py-0">
          <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="text-primary size-4" />
              Elenco ({state.bench.length})
              {isNationalTeam && (
                <span className="text-muted-foreground text-xs font-normal">
                  · {Object.values(state.slots).filter(Boolean).length + state.bench.length}/
                  {NATIONAL_TEAM_SQUAD_SIZE} convocados
                </span>
              )}
            </CardTitle>
            <AddPlayerDialog seasonId={seasonId} onAdded={handlePlayerAdded} />
          </CardHeader>
          {/* relative + the roster table absolutely positioned (inset-3)
              inside it: min-h-0/flex-1 alone weren't enough, because CSS
              Grid's auto row-height is driven by each item's *max-content*
              size regardless of min-height — a long bench list was still
              inflating the grid row (and dragging the pitch panel along
              with it) even with min-h-0 set everywhere in the chain.
              Taking the scrollable table out of normal flow entirely means
              it can't contribute to that sizing at all: this Card's own
              natural height collapses to just its header, so the row ends
              up sized by the pitch alone, and the table fills whatever
              height this panel is then stretched to, scrolling inside it.

              This only works because the grid stretches this Card to match
              the pitch panel's height — which only happens in the lg:
              side-by-side layout below. Below lg the two panels stack in
              separate grid rows (no sibling to stretch against), so this
              Card's height would collapse to just its header and the
              absolutely-positioned table — contributing nothing to that
              collapsed height — would vanish entirely. p-3 here (padding
              instead of the desktop inset-3 trick) reserves real space for
              it on mobile; see roster-table.tsx's matching lg: override. */}
          <CardContent className="relative min-h-0 flex-1 p-3 lg:p-0">
            <RosterTable
              bench={state.bench}
              seasonId={seasonId}
              duplicateNumbers={duplicateNumbers}
              ageReference={ageReference}
              {...chipHandlers}
            />
          </CardContent>
        </Card>
      </div>

      {isNationalTeam && (
        <Card className="mt-6 gap-0 py-0">
          <CardHeader className="border-b py-3 [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayersIcon className="text-primary size-4" />
              Elenco ampliado ({state.extras.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <ExtrasPanel
              players={state.extras}
              seasonId={seasonId}
              ageReference={ageReference}
              onRemove={handleRemove}
              onUpdated={updatePlayerLocal}
              onTransferredOut={handleTransferredOut}
            />
          </CardContent>
        </Card>
      )}

      {isNationalTeam && (
        <Card className="mt-6 gap-0 py-0">
          <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="text-primary size-4" />
              Observados ({state.watchlist.length})
            </CardTitle>
            <AddPlayerDialog
              seasonId={seasonId}
              onAdded={handleWatchlistPlayerAdded}
              destination="watchlist"
              triggerLabel="+ Observar"
            />
          </CardHeader>
          <CardContent className="p-3">
            <WatchlistPanel
              players={state.watchlist}
              seasonId={seasonId}
              ageReference={ageReference}
              onRemove={handleRemove}
              onUpdated={updatePlayerLocal}
              onTransferredOut={handleTransferredOut}
            />
          </CardContent>
        </Card>
      )}

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
  seasonId,
  duplicateNumbers,
  ageReference,
  onNumberChange,
  onCaptainToggle,
  onRemove,
  onUpdated,
  onTransferredOut,
}: {
  slotKey: string;
  label: string;
  x: number;
  y: number;
  player: SquadPlayerVM | null;
  seasonId: string;
  duplicateNumbers: Set<number>;
  ageReference?: { startYear: number; calendar: string };
  onNumberChange: (id: string, value: string) => void;
  onCaptainToggle: (id: string, value: boolean) => void;
  onRemove: (id: string) => void;
  onUpdated: (id: string, patch: Partial<SquadPlayerVM>) => void;
  onTransferredOut: (id: string, playerName: string, counterpartClub: string) => void;
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
          seasonId={seasonId}
          isDuplicateNumber={player.shirtNumber != null && duplicateNumbers.has(player.shirtNumber)}
          ageReference={ageReference}
          onNumberChange={onNumberChange}
          onCaptainToggle={onCaptainToggle}
          onRemove={onRemove}
          onUpdated={onUpdated}
          onTransferredOut={onTransferredOut}
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
      <span className="font-heading max-w-24 rounded-lg bg-black/60 px-2 py-1 text-center text-xs leading-tight font-bold text-white shadow-sm ring-1 ring-white/10 backdrop-blur-sm">
        {player.name}
      </span>
    </div>
  );
}

function PlayerChip({
  player,
  seasonId,
  isDuplicateNumber,
  ageReference,
  onNumberChange,
  onCaptainToggle,
  onRemove,
  onUpdated,
  onTransferredOut,
}: {
  player: SquadPlayerVM;
  seasonId: string;
  isDuplicateNumber: boolean;
  ageReference?: { startYear: number; calendar: string };
  onNumberChange: (id: string, value: string) => void;
  onCaptainToggle: (id: string, value: boolean) => void;
  onRemove: (id: string) => void;
  onUpdated: (id: string, patch: Partial<SquadPlayerVM>) => void;
  onTransferredOut: (id: string, playerName: string, counterpartClub: string) => void;
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
      className={cn(
        "bg-background/90 text-foreground font-heading w-10 shrink-0 rounded-md py-0.5 text-center text-lg font-bold outline-none",
        isDuplicateNumber && "ring-2 ring-destructive",
      )}
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
          seasonId={seasonId}
          squadPlayerId={player.id}
          ageReference={ageReference}
          onUpdated={(patch) => onUpdated(player.id, patch)}
          onTransferredOut={(counterpartClub) => onTransferredOut(player.id, player.name, counterpartClub)}
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
          avatar above is enough of a click target.
          No truncate: the whole name should always be readable on the
          pitch, so a long one wraps onto a second line instead of
          getting cut short with an ellipsis. */}
      <span className="font-heading max-w-24 rounded-lg bg-black/60 px-2 py-1 text-center text-xs leading-tight font-bold text-white shadow-sm ring-1 ring-white/10 backdrop-blur-sm">
        {player.name}
      </span>
    </div>
  );
}
