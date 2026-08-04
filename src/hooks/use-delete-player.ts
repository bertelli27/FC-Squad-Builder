"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Shared "excluir jogador" flow (impact summary → confirm → DELETE
 * /api/players/[id]) — was duplicated inline in player-profile-dialog.tsx
 * and career-header.tsx; management/players reuses the exact same one
 * instead of a third copy, per the standing rule of never having two
 * different deletion logics for the same entity.
 */
export function useDeletePlayer() {
  const [deleting, setDeleting] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  async function requestDelete(player: { cachedPlayerId: string; name: string }): Promise<boolean> {
    const impact = await fetch(`/api/players/${player.cachedPlayerId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.impact ?? null)
      .catch(() => null);

    const parts: string[] = [];
    if (impact) {
      if (impact.seasonCount > 0) {
        parts.push(
          `${impact.seasonCount} temporada${impact.seasonCount > 1 ? "s" : ""} em ${impact.clubCount} elenco${impact.clubCount > 1 ? "s" : ""}`,
        );
      }
      if (impact.statsCount > 0) parts.push(`${impact.statsCount} registro(s) de estatística`);
      if (impact.stintCount > 0) parts.push(`${impact.stintCount} passagem(ns) na carreira`);
      if (impact.transferCount > 0) parts.push(`${impact.transferCount} transferência(s)`);
    }
    const description = `${parts.length ? `Vai remover ${player.name} de: ${parts.join(", ")}. ` : ""}Essa ação não pode ser desfeita.`;

    const ok = await confirm({
      title: `Excluir ${player.name}?`,
      description,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return false;

    setDeleting(true);
    const res = await fetch(`/api/players/${player.cachedPlayerId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Não foi possível excluir o jogador.");
      return false;
    }
    return true;
  }

  return { requestDelete, deleting, dialog };
}
