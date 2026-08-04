"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { CountrySelect } from "@/components/ui/country-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrganizerInput } from "./organizer-input";
import {
  KIND_OPTIONS,
  SCOPE_OPTIONS_BY_KIND,
  CONFEDERATIONS,
  WORLD_ORGANIZER,
  type CompetitionKind,
} from "@/lib/competition-classification";

export interface EditableCompetition {
  id: string;
  name: string;
  logoUrl: string | null;
  trophyImageUrl: string | null;
  kind: string | null;
  scope: string | null;
  organizer: string | null;
  country: string | null;
  description: string | null;
}

export type CompetitionPatch = Omit<EditableCompetition, "id">;

const NONE = "__none__";

/**
 * Etapa 9 — formulário completo de edição de competição, usado na aba
 * "Informações" da página própria da competição (§38/§39) — não mais um
 * modal só de nome+imagens. Logo e troféu continuam dois conceitos
 * distintos (§27): logo é a identidade visual usada nas telas de
 * ESTATÍSTICA, troféu é a taça física usada nas telas de TÍTULO, nunca
 * preenchidos automaticamente um a partir do outro.
 *
 * Etapa 9 parte 2 (§B) — classificação em 4 níveis Tipo → Abrangência →
 * Organização → País, "inteligente": cada nível só mostra os campos
 * relevantes pra combinação atual (§B.5/§B.12).
 */
export function EditCompetitionForm({
  competition,
  onSaved,
  onCancel,
}: {
  competition: EditableCompetition;
  onSaved: (patch: CompetitionPatch) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(competition.name);
  const [logoUrl, setLogoUrl] = useState(competition.logoUrl ?? "");
  const [trophyImageUrl, setTrophyImageUrl] = useState(competition.trophyImageUrl ?? "");
  const [kind, setKind] = useState(competition.kind ?? NONE);
  const [scope, setScope] = useState(competition.scope ?? NONE);
  const [organizer, setOrganizer] = useState(competition.organizer ?? "");
  const [country, setCountry] = useState(competition.country ?? "");
  const [description, setDescription] = useState(competition.description ?? "");
  const [saving, setSaving] = useState(false);

  const scopeOptions = kind === NONE ? [] : SCOPE_OPTIONS_BY_KIND[kind as CompetitionKind];

  function handleKindChange(value: string) {
    setKind(value);
    const nextOptions = value === NONE ? [] : SCOPE_OPTIONS_BY_KIND[value as CompetitionKind];
    if (!nextOptions.some((o) => o.value === scope)) setScope(NONE);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome à competição.");
      return;
    }
    if (scope === "continental" && !organizer.trim()) {
      toast.error("Escolha a confederação organizadora.");
      return;
    }
    if (scope === "national" && !country.trim()) {
      toast.error("Escolha o país.");
      return;
    }

    setSaving(true);
    const patch: CompetitionPatch = {
      name,
      logoUrl: logoUrl || null,
      trophyImageUrl: trophyImageUrl || null,
      kind: kind === NONE ? null : kind,
      scope: scope === NONE ? null : scope,
      organizer:
        scope === "world" ? WORLD_ORGANIZER : scope === "continental" || scope === "national" ? organizer.trim() || null : null,
      country: scope === "national" ? country || null : null,
      description: description || null,
    };
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-competition-name">Nome</Label>
        <Input id="edit-competition-name" value={name} onChange={(e) => setName(e.target.value)} required />
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

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-competition-kind">Tipo</Label>
          <Select value={kind} onValueChange={(v) => v && handleKindChange(v)}>
            <SelectTrigger id="edit-competition-kind">
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
          <Label htmlFor="edit-competition-scope">Abrangência</Label>
          <Select value={scope} onValueChange={(v) => v && setScope(v)} disabled={kind === NONE}>
            <SelectTrigger id="edit-competition-scope">
              <SelectValue>
                {(v: string) =>
                  v === NONE ? "Não classificada" : (scopeOptions.find((o) => o.value === v)?.label ?? v)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Não classificada</SelectItem>
              {scopeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {scope === "world" && (
        <div className="flex flex-col gap-1.5">
          <Label>Organização</Label>
          <Input value={WORLD_ORGANIZER} disabled readOnly />
        </div>
      )}

      {scope === "continental" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-competition-organizer">Organização</Label>
          <Select value={organizer || NONE} onValueChange={(v) => v && v !== NONE && setOrganizer(v)}>
            <SelectTrigger id="edit-competition-organizer">
              <SelectValue>{(v: string) => (v === NONE ? "Escolha a confederação" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Escolha a confederação</SelectItem>
              {CONFEDERATIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {scope === "national" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-competition-country">País</Label>
            <CountrySelect id="edit-competition-country" value={country} onChange={setCountry} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-competition-organizer">Organização (federação nacional)</Label>
            <OrganizerInput id="edit-competition-organizer" value={organizer} onChange={setOrganizer} />
          </div>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-competition-description">Descrição</Label>
        <Textarea
          id="edit-competition-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Explicação/observações livres sobre a competição..."
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
