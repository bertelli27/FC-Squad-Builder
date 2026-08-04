"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Unlike useDeletePlayer, this never lets a destructive DELETE fire when
 * the competition is still referenced anywhere — the 4 FKs into
 * Competition are all ON DELETE RESTRICT (títulos/estatísticas
 * históricas), so this checks usage first and just blocks with a clear
 * message instead of offering a confirm that would fail anyway. Shared by
 * both management/competitions and management/trophies, since they edit
 * the exact same Competition rows.
 */
export function useDeleteCompetition() {
  const [deleting, setDeleting] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  async function requestDelete(competition: { id: string; name: string }): Promise<boolean> {
    const usage = await fetch(`/api/competitions/${competition.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.usage ?? null)
      .catch(() => null);

    if (usage && usage.total > 0) {
      const parts: string[] = [];
      if (usage.titleCount > 0) parts.push(`${usage.titleCount} título(s)`);
      if (usage.statsCount > 0) parts.push(`${usage.statsCount} registro(s) de estatística`);
      toast.error(`Não é possível excluir "${competition.name}": usada em ${parts.join(" e ")}.`);
      return false;
    }

    const ok = await confirm({
      title: `Excluir "${competition.name}"?`,
      description: "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return false;

    setDeleting(true);
    const res = await fetch(`/api/competitions/${competition.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error(`Não foi possível excluir "${competition.name}".`);
      return false;
    }
    return true;
  }

  return { requestDelete, deleting, dialog };
}
