"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { EditPlayerForm, type EditablePlayer } from "@/components/player-card/edit-player-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDeletePlayer } from "@/hooks/use-delete-player";
import { Card, CardContent } from "@/components/ui/card";
import { countryFlag } from "@/lib/countries";
import { ageToday } from "@/lib/player-age";

const CUSTOM_SOURCE = "custom";

/**
 * §17/§20/§22/§23: "Editar jogador" reachable straight from the career
 * page, reusing the same EditPlayerForm the squad/season profile uses
 * (§27) — this only ever touches the CachedPlayer's cadastral data, never
 * the career's own temporadas/títulos/transferências/estatísticas (§18).
 */
export function CareerHeader({ player }: { player: EditablePlayer }) {
  const router = useRouter();
  const [current, setCurrent] = useState(player);
  const [editing, setEditing] = useState(false);
  const { requestDelete, deleting, dialog: confirmDialog } = useDeletePlayer();
  const flag = countryFlag(current.nationality);
  const age = current.dateOfBirth ? ageToday(current.dateOfBirth) : null;
  // Nova etapa — exclusão restrita a jogadores criados pelo usuário
  // (source "custom"), mesma regra do player-profile-dialog.tsx.
  const canDelete = current.source === CUSTOM_SOURCE && !!current.cachedPlayerId;

  async function handleDelete() {
    if (!current.cachedPlayerId) return;
    const deleted = await requestDelete({ cachedPlayerId: current.cachedPlayerId, name: current.name });
    if (!deleted) return;
    toast.success(`${current.name} excluído.`);
    router.push("/careers");
  }

  return (
    <>
      <Card className="gap-0 py-0">
        <CardContent className="flex items-center gap-3 py-4">
          <PlayerAvatar src={current.photoUrl} name={current.name} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{current.name}</h1>
            <span className="text-muted-foreground truncate text-sm">
              {[
                current.position,
                flag ? `${flag} ${current.nationality}` : current.nationality,
                age != null ? `${age} anos` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          {current.cachedPlayerId && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Editar jogador"
              className="text-muted-foreground hover:text-foreground"
            >
              <PencilIcon className="size-4" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Excluir jogador"
              className="text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <Trash2Icon className="size-4" />
            </button>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar jogador</DialogTitle>
          </DialogHeader>
          <EditPlayerForm
            player={current}
            onCancel={() => setEditing(false)}
            onSaved={(patch) => {
              setCurrent((prev) => ({ ...prev, ...patch }));
              setEditing(false);
              // CareerWorkspace (a sibling, not a child, of this header)
              // receives dateOfBirth as an initial server-rendered prop —
              // §19's per-stint age recompute needs that prop refreshed,
              // which only a server re-render (not local client state)
              // can do.
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
