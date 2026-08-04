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
  logoUrl: string | null;
  trophyImageUrl: string | null;
}

/**
 * Nova etapa — Gerenciamento: shared between management/competitions and
 * management/trophies (same Competition row, two entry points) — this is
 * the fix for the original gap: a competition created without a trophy
 * image (or without a logo) can now be edited directly, instead of
 * needing to be recreated.
 *
 * Logo e troféu são dois conceitos distintos (§1-§7 desta etapa): logo é a
 * identidade visual usada nas telas de ESTATÍSTICA, troféu é a taça física
 * usada nas telas de TÍTULO. Nunca preenchidos automaticamente um a partir
 * do outro.
 */
export function EditCompetitionForm({
  competition,
  onSaved,
  onCancel,
}: {
  competition: EditableCompetition;
  onSaved: (patch: { name: string; logoUrl: string | null; trophyImageUrl: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(competition.name);
  const [logoUrl, setLogoUrl] = useState(competition.logoUrl ?? "");
  const [trophyImageUrl, setTrophyImageUrl] = useState(competition.trophyImageUrl ?? "");
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome à competição.");
      return;
    }

    setSaving(true);
    const patch = { name, logoUrl: logoUrl || null, trophyImageUrl: trophyImageUrl || null };
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
        <Label htmlFor="edit-competition-logo">Logo da competição</Label>
        <ImageUrlInput id="edit-competition-logo" value={logoUrl} onChange={setLogoUrl} />
        <p className="text-muted-foreground text-xs">Usada nas telas de estatística.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-competition-trophy">Troféu / Taça</Label>
        <ImageUrlInput id="edit-competition-trophy" value={trophyImageUrl} onChange={setTrophyImageUrl} />
        <p className="text-muted-foreground text-xs">Usada nas telas de título.</p>
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
