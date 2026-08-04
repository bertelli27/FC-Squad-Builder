"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";

export interface EditableCompetition {
  id: string;
  name: string;
  trophyImageUrl: string | null;
}

/**
 * Nova etapa — Gerenciamento: shared between management/competitions and
 * management/trophies (same Competition row, two entry points) — this is
 * the fix for the original gap: a competition created without a trophy
 * image (or with the wrong one) can now be edited directly, instead of
 * needing to be recreated.
 */
export function EditCompetitionForm({
  competition,
  onSaved,
  onCancel,
}: {
  competition: EditableCompetition;
  onSaved: (patch: { name: string; trophyImageUrl: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(competition.name);
  const [trophyImageUrl, setTrophyImageUrl] = useState(competition.trophyImageUrl ?? "");
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome à competição.");
      return;
    }

    setSaving(true);
    const patch = { name, trophyImageUrl: trophyImageUrl || null };
    fetch(`/api/competitions/${competition.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        toast.success("Competição atualizada.");
        onSaved(patch);
      })
      .catch(() => toast.error("Não foi possível salvar (o nome já pode estar em uso)."))
      .finally(() => setSaving(false));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-competition-name">Nome</Label>
        <Input
          id="edit-competition-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-competition-trophy">Imagem do troféu</Label>
        <ImageUrlInput id="edit-competition-trophy" value={trophyImageUrl} onChange={setTrophyImageUrl} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
