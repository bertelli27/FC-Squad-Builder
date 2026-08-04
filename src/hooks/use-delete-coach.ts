"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Unlike useDeleteCompetition (which blocks outright when a competition is
 * used in irreplaceable historical titles/stats), a coach's only
 * dependents are Season.coachId — a display reference, not history that
 * would be lost (ON DELETE SET NULL: the seasons themselves are untouched,
 * §32). So this always confirms rather than ever blocking, showing the
 * affected season count per §31's mockup ("Este técnico está vinculado a N
 * temporadas... [Cancelar] [Continuar]").
 */
export function useDeleteCoach() {
  const [deleting, setDeleting] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  async function requestDelete(coach: { id: string; name: string }): Promise<boolean> {
    const usage = await fetch(`/api/coaches/${coach.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.usage ?? null)
      .catch(() => null);

    const description =
      usage && usage.seasonCount > 0
        ? `Este técnico está vinculado a ${usage.seasonCount} ${usage.seasonCount === 1 ? "temporada" : "temporadas"}. Excluir o técnico só remove essa referência — as temporadas continuam existindo normalmente.`
        : "Essa ação não pode ser desfeita.";

    const ok = await confirm({
      title: `Excluir ${coach.name}?`,
      description,
      confirmLabel: "Continuar",
      destructive: true,
    });
    if (!ok) return false;

    setDeleting(true);
    const res = await fetch(`/api/coaches/${coach.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error(`Não foi possível excluir ${coach.name}.`);
      return false;
    }
    return true;
  }

  return { requestDelete, deleting, dialog };
}
