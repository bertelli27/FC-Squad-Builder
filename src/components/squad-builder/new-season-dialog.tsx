"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSeasonLabel } from "@/lib/season";

export interface DuplicateFromSeason {
  id: string;
  startYear: number;
}

interface CompetitionOption {
  id: string;
  name: string;
}

const NO_COMPETITION = "__none__";

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
  isNationalTeam,
  existingSeasons,
  duplicateFrom,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squadId: string;
  seasonCalendar: string;
  /** Etapa 10.1 (§7/§8) — só seleção ganha o seletor de torneio/convocação abaixo. */
  isNationalTeam: boolean;
  existingSeasons: { startYear: number; competitionId: string | null }[];
  duplicateFrom?: DuplicateFromSeason | null;
}) {
  const router = useRouter();
  const existingYears = existingSeasons.map((s) => s.startYear);
  const defaultYear = duplicateFrom
    ? duplicateFrom.startYear + 1
    : existingYears.length > 0
      ? Math.max(...existingYears) + 1
      : new Date().getFullYear();
  const [startYear, setStartYear] = useState(defaultYear);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [competitionId, setCompetitionId] = useState(NO_COMPETITION);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || !isNationalTeam) return;
    fetch("/api/competitions")
      .then((res) => (res.ok ? res.json() : { competitions: [] }))
      .then((data) => setCompetitions(data.competitions ?? []))
      .catch(() => {});
  }, [open, isNationalTeam]);

  // Re-syncs os padrões sempre que o dialog abre pra uma origem
  // (possivelmente diferente) — duplicar 2026 e depois 2027 não deveria
  // continuar mostrando os valores da vez anterior.
  function handleOpenChange(next: boolean) {
    if (next) {
      setStartYear(defaultYear);
      setCompetitionId(NO_COMPETITION);
    }
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isInteger(startYear)) {
      toast.error("Informe um ano válido.");
      return;
    }
    const selectedCompetitionId = competitionId === NO_COMPETITION ? null : competitionId;
    // Etapa 10.1 — clube (isNationalTeam=false) nunca tem competitionId,
    // então essa checagem sozinha já reproduz "só uma por ano" pra eles;
    // seleção só barra a MESMA combinação (ano + torneio) de novo.
    if (existingSeasons.some((s) => s.startYear === startYear && s.competitionId === selectedCompetitionId)) {
      toast.error(
        isNationalTeam
          ? "Já existe uma convocação com esse ano e torneio."
          : "Já existe uma temporada com esse ano neste clube.",
      );
      return;
    }

    setCreating(true);
    fetch(`/api/squads/${squadId}/seasons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startYear,
        duplicateFromSeasonId: duplicateFrom?.id,
        competitionId: selectedCompetitionId ?? undefined,
      }),
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

          {isNationalTeam && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="season-competition">Torneio desta convocação (opcional)</Label>
              <Select value={competitionId} onValueChange={(v) => v && setCompetitionId(v)}>
                <SelectTrigger id="season-competition">
                  <SelectValue>
                    {(v: string) => (v === NO_COMPETITION ? "Nenhum" : (competitions.find((c) => c.id === v)?.name ?? v))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COMPETITION}>Nenhum</SelectItem>
                  {competitions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Marca esta temporada como a convocação pra um torneio específico — permite ter mais de uma no mesmo ano.
              </p>
            </div>
          )}

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
