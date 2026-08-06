"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrophyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SeasonCompetitionVM } from "./season-competitions-card";

interface CompetitionOption {
  id: string;
  name: string;
  logoUrl: string | null;
}

const NEW_COMPETITION = "__new__";

/** Etapa 9 parte 4 (§1.2) — "Competições disputadas nesta temporada": mesma UX de AddTitleDialog, sem troféu (não é conquista, é participação). */
export function AddSeasonCompetitionDialog({
  seasonId,
  existingCompetitionIds,
  open,
  onOpenChange,
  onAdded,
}: {
  seasonId: string;
  existingCompetitionIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (seasonCompetition: SeasonCompetitionVM) => void;
}) {
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [selected, setSelected] = useState<string>(NEW_COMPETITION);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/competitions")
      .then((res) => (res.ok ? res.json() : { competitions: [] }))
      .then((data) => setCompetitions(data.competitions ?? []))
      .catch(() => {});
  }, [open]);

  const availableCompetitions = competitions.filter((c) => !existingCompetitionIds.includes(c.id));

  function reset() {
    setSelected(NEW_COMPETITION);
    setNewName("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const isNew = selected === NEW_COMPETITION;
    if (isNew && !newName.trim()) {
      toast.error("Dê um nome à competição.");
      return;
    }

    setSaving(true);
    fetch(`/api/seasons/${seasonId}/competitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isNew ? { competitionName: newName } : { competitionId: selected }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onAdded(data.seasonCompetition);
        toast.success(`${data.seasonCompetition.competition.name} adicionada à temporada.`);
        reset();
        onOpenChange(false);
      })
      .catch(() => toast.error("Não foi possível adicionar a competição."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <TrophyIcon className="size-4" />
            Adicionar competição à temporada
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Competição</Label>
            <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
              <SelectTrigger>
                <SelectValue>
                  {(v: string) =>
                    v === NEW_COMPETITION
                      ? "Nova competição"
                      : (competitions.find((c) => c.id === v)?.name ?? v)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_COMPETITION}>+ Nova competição</SelectItem>
                {availableCompetitions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected === NEW_COMPETITION && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-season-competition-name">Nome da competição</Label>
              <Input
                id="new-season-competition-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Campeonato Paranaense"
                required
                autoFocus
              />
            </div>
          )}

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Adicionando…" : "Adicionar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
