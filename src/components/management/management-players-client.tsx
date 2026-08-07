"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Search, PencilIcon, Trash2Icon, ShieldIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { EditPlayerForm, type EditablePlayer as EditablePlayerBase } from "@/components/player-card/edit-player-form";
import { CreatePlayerDialog } from "./create-player-dialog";
import { useDeletePlayer } from "@/hooks/use-delete-player";
import { POSITION_ABBREVIATIONS_PT } from "@/lib/positions";
import { CountryFlag } from "@/components/ui/country-flag";

interface LinkedClub {
  name: string;
  logoUrl: string | null;
}

interface ManagementPlayer extends EditablePlayerBase {
  clubs: LinkedClub[];
}

export function ManagementPlayersClient({ players: initialPlayers }: { players: ManagementPlayer[] }) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ManagementPlayer | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { requestDelete, dialog: confirmDialog } = useDeletePlayer();
  const { confirm, dialog: bulkConfirmDialog } = useConfirmDialog();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, query]);

  async function handleDelete(player: ManagementPlayer) {
    const deleted = await requestDelete({ cachedPlayerId: player.cachedPlayerId, name: player.name });
    if (!deleted) return;
    setPlayers((prev) => prev.filter((p) => p.cachedPlayerId !== player.cachedPlayerId));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(player.cachedPlayerId);
      return next;
    });
    // Este jogador pode aparecer numa carreira/elenco em outra página já
    // renderizada no servidor — não há como saber quais sem navegar até
    // lá, então não há nada além desta lista pra atualizar localmente.
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.cachedPlayerId))));
  }

  async function handleBulkDelete() {
    const targets = players.filter((p) => selected.has(p.cachedPlayerId));
    if (targets.length === 0) return;

    const ok = await confirm({
      title: `Excluir ${targets.length} ${targets.length === 1 ? "jogador" : "jogadores"}?`,
      description: `Os jogadores selecionados serão removidos de acordo com as regras de exclusão do sistema (elencos, carreiras e demais relações). Essa ação não pode ser desfeita.\n\n${targets.map((p) => `• ${p.name}`).join("\n")}`,
      confirmLabel: "Confirmar exclusão",
      destructive: true,
    });
    if (!ok) return;

    setBulkDeleting(true);
    // Mesma rota/regra da exclusão individual (DELETE /api/players/[id]),
    // só chamada em sequência pra cada jogador selecionado — §18: "excluir
    // 1" e "excluir 10" respeitam exatamente as mesmas relações/proteções.
    const results = await Promise.all(
      targets.map((p) => fetch(`/api/players/${p.cachedPlayerId}`, { method: "DELETE" }).then((res) => res.ok)),
    );
    setBulkDeleting(false);

    const succeededIds = new Set(targets.filter((_, i) => results[i]).map((p) => p.cachedPlayerId));
    setPlayers((prev) => prev.filter((p) => !succeededIds.has(p.cachedPlayerId)));
    setSelected(new Set());

    const failedCount = results.filter((ok) => !ok).length;
    if (failedCount > 0) {
      toast.error(`${succeededIds.size} excluído(s), ${failedCount} falharam.`);
    } else {
      toast.success(`${succeededIds.size} ${succeededIds.size === 1 ? "jogador excluído" : "jogadores excluídos"}.`);
    }
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Pesquisar jogador…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <CreatePlayerDialog onCreated={(player) => setPlayers((prev) => [{ ...player, clubs: [] }, ...prev])} />
      </div>

      {selected.size > 0 && (
        <div className="bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-2">
          <span className="text-sm font-medium">
            {selected.size} {selected.size === 1 ? "jogador selecionado" : "jogadores selecionados"}
          </span>
          <Button size="sm" variant="destructive" disabled={bulkDeleting} onClick={handleBulkDelete}>
            <Trash2Icon className="size-4" />
            {bulkDeleting ? "Excluindo…" : "Excluir selecionados"}
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {query.trim()
              ? `Nenhum jogador encontrado para "${query.trim()}".`
              : "Você ainda não criou nenhum jogador."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col rounded-lg border">
          <div className="border-b px-3 py-2">
            <label className="flex w-fit items-center gap-2 text-sm">
              <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Selecionar todos" />
              Selecionar todos
            </label>
          </div>
          <ul className="divide-border flex flex-col divide-y">
            {filtered.map((player) => {
              // Posição principal + secundárias, todas abreviadas em
              // português — a lista respeita exatamente o que está
              // cadastrado (§A.4), sem inventar nem esconder nenhuma.
              const positionCodes = [player.position, ...(player.secondaryPositions ?? [])]
                .filter((p): p is string => !!p)
                .map((p) => POSITION_ABBREVIATIONS_PT[p] ?? p);
              return (
                <li key={player.cachedPlayerId} className="hover:bg-accent/30 flex flex-wrap items-center gap-4 p-4">
                  <Checkbox
                    checked={selected.has(player.cachedPlayerId)}
                    onCheckedChange={() => toggleSelected(player.cachedPlayerId)}
                    aria-label={`Selecionar ${player.name}`}
                  />
                  <PlayerAvatar src={player.photoUrl} name={player.name} size="default" />
                  <div className="min-w-0 flex-1">
                    <div className="font-heading truncate text-base font-bold">{player.name}</div>
                    <div className="flex flex-wrap items-center gap-1 text-xs">
                      <CountryFlag nationality={player.nationality} />
                      {positionCodes.length > 0 ? (
                        positionCodes.map((code, i) => (
                          <span
                            key={`${code}-${i}`}
                            className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-medium"
                          >
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">Sem posição cadastrada</span>
                      )}
                    </div>
                  </div>
                  {player.clubs.length > 0 && (
                    <div className="flex shrink-0 items-center -space-x-1.5">
                      {player.clubs.map((club) =>
                        club.logoUrl ? (
                          <Image
                            key={club.name}
                            src={club.logoUrl}
                            alt={club.name}
                            title={club.name}
                            width={20}
                            height={20}
                            className="ring-background size-5 rounded-full bg-white object-contain ring-2"
                            unoptimized
                          />
                        ) : (
                          <span
                            key={club.name}
                            title={club.name}
                            className="ring-background bg-muted flex size-5 items-center justify-center rounded-full ring-2"
                          >
                            <ShieldIcon className="text-muted-foreground size-3" />
                          </span>
                        ),
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(player)}
                    aria-label={`Editar ${player.name}`}
                    className="text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(player)}
                    aria-label={`Excluir ${player.name}`}
                    className="text-muted-foreground hover:text-destructive flex size-8 shrink-0 items-center justify-center rounded-full"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar jogador</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditPlayerForm
              player={editing}
              onCancel={() => setEditing(null)}
              onSaved={(patch) => {
                setPlayers((prev) =>
                  prev.map((p) => (p.cachedPlayerId === editing.cachedPlayerId ? { ...p, ...patch } : p)),
                );
                setEditing(null);
                // Outras páginas (elencos/carreira) que já mostram este
                // jogador só pegam o dado novo num próximo carregamento —
                // não há como empurrar pra elas daqui.
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
      {bulkConfirmDialog}
    </div>
  );
}
