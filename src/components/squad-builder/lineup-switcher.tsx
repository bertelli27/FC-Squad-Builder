"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, SettingsIcon, PencilIcon, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export interface LineupOption {
  id: string;
  name: string;
  formation: string;
}

/**
 * Etapa "escalações múltiplas" — várias táticas salvas por temporada
 * (como as formações salvas do FIFA), cada uma com seu próprio nome,
 * formação, titulares e posições no campo. O elenco (banco, números,
 * capitão, selo de base) é um só, compartilhado — só isso troca entre
 * escalações.
 *
 * Navega trocando o search param `?lineup=<id>` da própria página da
 * temporada (nunca muda de rota) — a página server-side lê esse param
 * pra decidir qual escalação mesclar no elenco antes de montar o
 * SquadEditor.
 */
export function LineupSwitcher({
  seasonId,
  lineups,
  activeLineupId,
}: {
  seasonId: string;
  lineups: LineupOption[];
  activeLineupId: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  function goToLineup(lineupId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("lineup", lineupId);
    router.push(`${url.pathname}${url.search}`);
  }

  // Sem `?lineup=` a página cai na escalação padrão (menor order) sozinha
  // — usado quando a que estava aberta acabou de ser excluída.
  function goToDefaultLineup() {
    const url = new URL(window.location.href);
    url.searchParams.delete("lineup");
    router.push(`${url.pathname}${url.search}`);
  }

  function handleSwitch(value: string | null) {
    if (!value || value === activeLineupId) return;
    goToLineup(value);
  }

  // "+ Nova escalação" sempre parte da que está aberta no momento —
  // duplicar é o ponto de partida mais útil (ajustar em cima de algo
  // pronto), não montar do zero.
  function handleCreate() {
    setCreating(true);
    fetch(`/api/seasons/${seasonId}/lineups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Formação ${lineups.length + 1}`,
        formation: lineups.find((l) => l.id === activeLineupId)?.formation ?? "4-3-3",
        duplicateFromLineupId: activeLineupId,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => goToLineup(data.lineup.id))
      .catch(() => toast.error("Não foi possível criar a escalação."))
      .finally(() => setCreating(false));
  }

  return (
    <div className="flex items-center gap-1">
      <Select value={activeLineupId} onValueChange={handleSwitch}>
        <SelectTrigger className="w-40" size="sm">
          <SelectValue>{(v: string) => lineups.find((l) => l.id === v)?.name ?? v}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {lineups.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" aria-label="Nova escalação" disabled={creating} onClick={handleCreate}>
        <PlusIcon className="size-4" />
      </Button>
      <Button variant="outline" size="icon" aria-label="Gerenciar escalações" onClick={() => setManageOpen(true)}>
        <SettingsIcon className="size-4" />
      </Button>

      <ManageLineupsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        seasonId={seasonId}
        lineups={lineups}
        activeLineupId={activeLineupId}
        onDeletedActive={goToDefaultLineup}
      />
    </div>
  );
}

function ManageLineupsDialog({
  open,
  onOpenChange,
  seasonId,
  lineups,
  activeLineupId,
  onDeletedActive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonId: string;
  lineups: LineupOption[];
  activeLineupId: string;
  /** A exclusão da escalação atualmente aberta deixa o `?lineup=` da URL apontando pra um id que não existe mais — chamado pra tirar o param e cair na padrão. */
  onDeletedActive: () => void;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setEditingId(null);
  }

  function startEditing(lineup: LineupOption) {
    setEditingId(lineup.id);
    setEditingName(lineup.name);
  }

  function saveRename(id: string) {
    const name = editingName.trim();
    if (!name) return;

    fetch(`/api/seasons/${seasonId}/lineups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        setEditingId(null);
        router.refresh();
      })
      .catch(() => toast.error("Não foi possível renomear."));
  }

  async function handleDelete(lineup: LineupOption) {
    if (lineups.length <= 1) {
      toast.error("A temporada precisa de pelo menos uma escalação.");
      return;
    }

    const ok = await confirm({
      title: `Excluir a escalação "${lineup.name}"?`,
      description: "O elenco (banco, números, capitão) não é afetado — só essa arrumação tática some.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/seasons/${seasonId}/lineups/${lineup.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Não foi possível excluir a escalação.");
      return;
    }
    toast.success(`Escalação "${lineup.name}" excluída.`);
    if (lineup.id === activeLineupId) onDeletedActive();
    else router.refresh();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar escalações</DialogTitle>
          </DialogHeader>

          <ul className="flex flex-col gap-1">
            {lineups.map((lineup) => (
              <li key={lineup.id} className="hover:bg-accent/40 flex items-center gap-2 rounded-lg p-2">
                {editingId === lineup.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveRename(lineup.id)}
                      autoFocus
                      className="h-8 flex-1"
                    />
                    <Button variant="ghost" size="icon-sm" aria-label="Salvar" onClick={() => saveRename(lineup.id)}>
                      <Check className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Cancelar" onClick={() => setEditingId(null)}>
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">
                      {lineup.name} <span className="text-muted-foreground text-xs">({lineup.formation})</span>
                    </span>
                    <Button variant="ghost" size="icon-sm" aria-label={`Renomear ${lineup.name}`} onClick={() => startEditing(lineup)}>
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${lineup.name}`} onClick={() => handleDelete(lineup)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
