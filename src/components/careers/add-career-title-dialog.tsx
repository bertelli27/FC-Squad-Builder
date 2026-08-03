"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrophyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CareerTitleVM } from "./career-timeline";

interface CompetitionOption {
  id: string;
  name: string;
}

const NEW_COMPETITION = "__new__";

export function AddCareerTitleDialog({
  careerId,
  stintId,
  open,
  onOpenChange,
  onAdded,
}: {
  careerId: string;
  stintId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (title: CareerTitleVM) => void;
}) {
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [selected, setSelected] = useState<string>(NEW_COMPETITION);
  const [newName, setNewName] = useState("");
  const [trophyUrl, setTrophyUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/competitions")
      .then((res) => (res.ok ? res.json() : { competitions: [] }))
      .then((data) => setCompetitions(data.competitions ?? []))
      .catch(() => {});
  }, [open]);

  function reset() {
    setSelected(NEW_COMPETITION);
    setNewName("");
    setTrophyUrl("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const isNew = selected === NEW_COMPETITION;
    if (isNew && !newName.trim()) {
      toast.error("Dê um nome à competição.");
      return;
    }

    setSaving(true);
    fetch(`/api/careers/${careerId}/stints/${stintId}/titles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isNew
          ? { competitionName: newName, trophyImageUrl: trophyUrl || undefined }
          : { competitionId: selected },
      ),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onAdded(data.title);
        toast.success(`Título de ${data.title.competition.name} adicionado.`);
        reset();
        onOpenChange(false);
      })
      .catch(() => toast.error("Não foi possível adicionar o título."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <TrophyIcon className="size-4" />
            Adicionar título
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
                {competitions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected === NEW_COMPETITION && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-career-competition-name">Nome da competição</Label>
                <Input
                  id="new-career-competition-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Champions League"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-career-competition-trophy">URL do troféu (opcional)</Label>
                <ImageUrlInput id="new-career-competition-trophy" value={trophyUrl} onChange={setTrophyUrl} />
              </div>
            </>
          )}

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Adicionando…" : "Adicionar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
