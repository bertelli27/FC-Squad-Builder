"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, TrophyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { CountrySelect } from "@/components/ui/country-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrganizerInput } from "./organizer-input";
import type { EditableCompetition } from "./edit-competition-form";

const NONE = "__none__";
const KIND_OPTIONS = [
  { value: "club", label: "🏟️ Clube" },
  { value: "nationalTeam", label: "🌎 Seleção" },
];
const CATEGORY_OPTIONS = [
  { value: "international", label: "Internacional" },
  { value: "national", label: "Nacional" },
];

/** Etapa 9 (§26) — cria uma competição pelo Gerenciamento; a classificação já pode ser feita aqui ou completada depois na página própria da competição. */
export function CreateCompetitionDialog({ onCreated }: { onCreated: (competition: EditableCompetition) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [trophyImageUrl, setTrophyImageUrl] = useState("");
  const [kind, setKind] = useState(NONE);
  const [category, setCategory] = useState(NONE);
  const [organizer, setOrganizer] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setLogoUrl("");
    setTrophyImageUrl("");
    setKind(NONE);
    setCategory(NONE);
    setOrganizer("");
    setCountry("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome à competição.");
      return;
    }

    setSaving(true);
    fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        logoUrl: logoUrl || undefined,
        trophyImageUrl: trophyImageUrl || undefined,
        kind: kind === NONE ? undefined : kind,
        category: category === NONE ? undefined : category,
        organizer: category === "international" ? organizer || undefined : undefined,
        country: category === "national" ? country || undefined : undefined,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onCreated(data.competition);
        toast.success(`${name} criada.`);
        reset();
        setOpen(false);
      })
      .catch(() => toast.error("Não foi possível criar a competição (o nome já pode estar em uso)."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        Criar competição
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <TrophyIcon className="size-4" />
            Criar competição
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-competition-name">Nome</Label>
            <Input id="create-competition-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-competition-logo">Logo da competição</Label>
            <ImageUrlInput id="create-competition-logo" value={logoUrl} onChange={setLogoUrl} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-competition-trophy">Troféu / Taça</Label>
            <ImageUrlInput id="create-competition-trophy" value={trophyImageUrl} onChange={setTrophyImageUrl} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-competition-kind">Tipo</Label>
              <Select value={kind} onValueChange={(v) => v && setKind(v)}>
                <SelectTrigger id="create-competition-kind">
                  <SelectValue>
                    {(v: string) => (v === NONE ? "Não classificado" : (KIND_OPTIONS.find((o) => o.value === v)?.label ?? v))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não classificado</SelectItem>
                  {KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-competition-category">Categoria</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger id="create-competition-category">
                  <SelectValue>
                    {(v: string) =>
                      v === NONE ? "Não classificado" : (CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não classificado</SelectItem>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {category === "international" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-competition-organizer">Organizador</Label>
              <OrganizerInput id="create-competition-organizer" value={organizer} onChange={setOrganizer} />
            </div>
          )}

          {category === "national" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-competition-country">País</Label>
              <CountrySelect id="create-competition-country" value={country} onChange={setCountry} />
            </div>
          )}

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Criando…" : "Criar competição"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
