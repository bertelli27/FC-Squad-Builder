"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TrophyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { CountrySelect } from "@/components/ui/country-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeasonPicker, type SeasonOption } from "./season-picker";
import type { ChampionVM } from "./champions-tab";

const LINKED = "linked";
const STANDALONE = "standalone";

/**
 * Etapa 9 (§43-50) — adiciona OU edita uma edição do histórico de
 * campeões. Dois modos mutuamente exclusivos (§45-48): vincular a um
 * elenco já cadastrado (Modo B) ou registrar um campeão histórico
 * independente, sem exigir elenco nenhum no sistema (Modo A).
 */
export function ChampionFormDialog({
  competitionId,
  editing,
  open,
  onOpenChange,
  onSaved,
}: {
  competitionId: string;
  /** Presente = editando uma edição existente; ausente = criando uma nova. */
  editing?: ChampionVM | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (champion: ChampionVM) => void;
}) {
  const [mode, setMode] = useState<string>(editing?.season ? LINKED : STANDALONE);
  const [year, setYear] = useState(String(editing?.year ?? ""));
  const [selectedSeason, setSelectedSeason] = useState<SeasonOption | null>(null);
  const [standaloneName, setStandaloneName] = useState(editing?.standaloneName ?? "");
  const [standaloneLogoUrl, setStandaloneLogoUrl] = useState(editing?.standaloneLogoUrl ?? "");
  const [standaloneCountry, setStandaloneCountry] = useState(editing?.standaloneCountry ?? "");
  const [saving, setSaving] = useState(false);

  function reset() {
    setMode(STANDALONE);
    setYear("");
    setSelectedSeason(null);
    setStandaloneName("");
    setStandaloneLogoUrl("");
    setStandaloneCountry("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum)) {
      toast.error("Informe um ano válido.");
      return;
    }
    if (mode === LINKED && !selectedSeason && !editing?.season) {
      toast.error("Selecione um clube/seleção já cadastrado.");
      return;
    }
    if (mode === STANDALONE && !standaloneName.trim()) {
      toast.error("Informe o nome do campeão.");
      return;
    }

    const body =
      mode === LINKED
        ? { year: yearNum, seasonId: selectedSeason?.id ?? editing?.season?.id }
        : {
            year: yearNum,
            standaloneName,
            standaloneLogoUrl: standaloneLogoUrl || undefined,
            standaloneCountry: standaloneCountry || undefined,
          };

    setSaving(true);
    const url = editing
      ? `/api/competitions/${competitionId}/champions/${editing.id}`
      : `/api/competitions/${competitionId}/champions`;
    fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onSaved(data.champion);
        toast.success(editing ? "Campeão atualizado." : "Campeão adicionado.");
        reset();
        onOpenChange(false);
      })
      .catch(() => toast.error("Não foi possível salvar (o ano já pode estar registrado)."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <TrophyIcon className="size-4" />
            {editing ? "Editar campeão" : "Adicionar campeão"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="champion-year">Edição / Ano</Label>
            <Input
              id="champion-year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Ex: 1930"
              required
            />
          </div>

          <Tabs value={mode} onValueChange={(v) => v && setMode(v)}>
            <TabsList>
              <TabsTrigger value={LINKED}>Vincular a elenco existente</TabsTrigger>
              <TabsTrigger value={STANDALONE}>Registro histórico independente</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === LINKED ? (
            <div className="flex flex-col gap-1.5">
              <SeasonPicker onSelect={setSelectedSeason} />
              {(selectedSeason || editing?.season) && (
                <p className="text-muted-foreground text-sm">
                  Selecionado: <span className="text-foreground font-medium">{selectedSeason?.squad.name ?? editing?.standaloneName}</span>
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="champion-name">Nome do campeão</Label>
                <Input
                  id="champion-name"
                  value={standaloneName}
                  onChange={(e) => setStandaloneName(e.target.value)}
                  placeholder="Ex: Uruguai"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="champion-logo">Logo / escudo</Label>
                <ImageUrlInput id="champion-logo" value={standaloneLogoUrl} onChange={setStandaloneLogoUrl} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="champion-country">País (pra bandeira)</Label>
                <CountrySelect id="champion-country" value={standaloneCountry} onChange={setStandaloneCountry} />
              </div>
            </>
          )}

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
