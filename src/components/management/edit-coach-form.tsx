"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";

export interface EditableCoach {
  id: string;
  name: string;
  photoUrl: string | null;
  externalLink: string | null;
}

/** Nova etapa — Gerenciamento: edita os dados do técnico em si — reflete em toda temporada que o usa (referência compartilhada, ver Coach no schema). */
export function EditCoachForm({
  coach,
  onSaved,
  onCancel,
}: {
  coach: EditableCoach;
  onSaved: (patch: { name: string; photoUrl: string | null; externalLink: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(coach.name);
  const [photoUrl, setPhotoUrl] = useState(coach.photoUrl ?? "");
  const [externalLink, setExternalLink] = useState(coach.externalLink ?? "");
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome ao técnico.");
      return;
    }

    setSaving(true);
    const patch = { name, photoUrl: photoUrl || null, externalLink: externalLink || null };
    fetch(`/api/coaches/${coach.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        toast.success("Técnico atualizado.");
        onSaved(patch);
      })
      .catch(() => toast.error("Não foi possível salvar."))
      .finally(() => setSaving(false));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-coach-name">Nome</Label>
        <Input id="edit-coach-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-coach-photo">URL da foto</Label>
        <ImageUrlInput id="edit-coach-photo" value={photoUrl} onChange={setPhotoUrl} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-coach-link">Link externo</Label>
        <Input
          id="edit-coach-link"
          type="url"
          placeholder="https://..."
          value={externalLink}
          onChange={(e) => setExternalLink(e.target.value)}
        />
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
