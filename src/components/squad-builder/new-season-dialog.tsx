"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSeasonLabel } from "@/lib/season";

export interface DuplicateFromSeason {
  id: string;
  startYear: number;
}

/**
 * Blank or duplicated-from-another-season creation (§4/§6) — same dialog
 * either way, just a different default year and a note about what gets
 * copied. Controlled (open/onOpenChange from the caller) so both the club
 * page's "+ Nova temporada" button and each season card's "Duplicar"
 * action can drive the same dialog without it owning its own trigger.
 */
export function NewSeasonDialog({
  open,
  onOpenChange,
  squadId,
  seasonCalendar,
  existingYears,
  duplicateFrom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squadId: string;
  seasonCalendar: string;
  existingYears: number[];
  duplicateFrom?: DuplicateFromSeason | null;
}) {
  const router = useRouter();
  const defaultYear = duplicateFrom
    ? duplicateFrom.startYear + 1
    : existingYears.length > 0
      ? Math.max(...existingYears) + 1
      : new Date().getFullYear();
  const [startYear, setStartYear] = useState(defaultYear);
  const [creating, setCreating] = useState(false);

  // Re-syncs the default year whenever the dialog opens for a (possibly
  // different) source season — e.g. duplicating 2026 then later 2027
  // shouldn't keep showing 2027 as the default the second time.
  function handleOpenChange(next: boolean) {
    if (next) setStartYear(defaultYear);
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isInteger(startYear)) {
      toast.error("Informe um ano válido.");
      return;
    }
    if (existingYears.includes(startYear)) {
      toast.error("Já existe uma temporada com esse ano neste clube.");
      return;
    }

    setCreating(true);
    fetch(`/api/squads/${squadId}/seasons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startYear, duplicateFromSeasonId: duplicateFrom?.id }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        toast.success(`Temporada ${formatSeasonLabel(startYear, seasonCalendar)} criada.`);
        onOpenChange(false);
        router.push(`/squads/${squadId}/seasons/${data.season.id}`);
      })
      .catch(() => toast.error("Não foi possível criar a temporada."))
      .finally(() => setCreating(false));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {duplicateFrom
              ? `Duplicar temporada ${formatSeasonLabel(duplicateFrom.startYear, seasonCalendar)}`
              : "Nova temporada"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="season-year">Ano</Label>
            <Input
              id="season-year"
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              required
            />
            <p className="text-muted-foreground text-xs">
              Rótulo: <span className="text-foreground font-medium">{formatSeasonLabel(startYear, seasonCalendar)}</span>
            </p>
          </div>

          {duplicateFrom && (
            <p className="text-muted-foreground text-sm">
              Elenco, número da camisa, técnico e formação vêm da temporada{" "}
              {formatSeasonLabel(duplicateFrom.startYear, seasonCalendar)} — títulos, estatísticas e
              observações ficam de fora, começam do zero. Editar esta temporada depois não muda a
              outra.
            </p>
          )}

          <Button type="submit" disabled={creating} className="w-fit">
            {creating ? "Criando…" : duplicateFrom ? "Duplicar" : "Criar temporada"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
