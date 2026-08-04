"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, PencilIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { OverallBadge } from "@/components/player-card/overall-badge";
import { EditPlayerForm, type EditablePlayer } from "@/components/player-card/edit-player-form";
import { useDeletePlayer } from "@/hooks/use-delete-player";
import { POSITIONS } from "@/lib/positions";
import { countryFlag } from "@/lib/countries";
import { ageToday } from "@/lib/player-age";

export function ManagementPlayersClient({ players: initialPlayers }: { players: EditablePlayer[] }) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditablePlayer | null>(null);
  const { requestDelete, dialog: confirmDialog } = useDeletePlayer();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, query]);

  async function handleDelete(player: EditablePlayer) {
    const deleted = await requestDelete({ cachedPlayerId: player.cachedPlayerId, name: player.name });
    if (!deleted) return;
    setPlayers((prev) => prev.filter((p) => p.cachedPlayerId !== player.cachedPlayerId));
    // Este jogador pode aparecer numa carreira/elenco em outra página já
    // renderizada no servidor — não há como saber quais sem navegar até
    // lá, então não há nada além desta lista pra atualizar localmente.
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Pesquisar jogador…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {query.trim()
              ? `Nenhum jogador encontrado para "${query.trim()}".`
              : "Você ainda não criou nenhum jogador."}
          </p>
        </div>
      ) : (
        <ul className="divide-border flex flex-col divide-y rounded-lg border">
          {filtered.map((player) => {
            const flag = countryFlag(player.nationality);
            const age = player.dateOfBirth ? ageToday(player.dateOfBirth) : null;
            const positionLabel = POSITIONS.find((p) => p.value === player.position)?.label ?? player.position;
            return (
              <li key={player.cachedPlayerId} className="hover:bg-accent/30 flex items-center gap-3 p-3">
                <PlayerAvatar src={player.photoUrl} name={player.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-heading truncate text-sm font-bold">{player.name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {[
                      positionLabel,
                      flag ? `${flag} ${player.nationality}` : player.nationality,
                      age != null ? `${age} anos` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sem dados cadastrados"}
                  </div>
                </div>
                <OverallBadge overall={player.overall} />
                <button
                  type="button"
                  onClick={() => setEditing(player)}
                  aria-label={`Editar ${player.name}`}
                  className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(player)}
                  aria-label={`Excluir ${player.name}`}
                  className="text-muted-foreground hover:text-destructive flex size-8 items-center justify-center rounded-full"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
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
    </div>
  );
}
