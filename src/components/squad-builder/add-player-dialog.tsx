"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { OverallBadge } from "@/components/player-card/overall-badge";
import { ratingStyle } from "@/lib/rating-tier";
import { cn } from "@/lib/utils";
import type { SquadPlayerVM } from "./squad-editor";

interface SearchResult {
  source: string;
  externalId: string;
  name: string;
  position?: string;
  club?: string;
  overall?: number;
  photoUrl?: string;
}

const POSITIONS = [
  { value: "GK", label: "Goleiro" },
  { value: "CB", label: "Zagueiro" },
  { value: "LB", label: "Lateral esquerdo" },
  { value: "RB", label: "Lateral direito" },
  { value: "LWB", label: "Ala esquerdo" },
  { value: "RWB", label: "Ala direito" },
  { value: "CDM", label: "Volante" },
  { value: "CM", label: "Meio-campo" },
  { value: "CAM", label: "Meia atacante" },
  { value: "LM", label: "Meia esquerdo" },
  { value: "RM", label: "Meia direito" },
  { value: "LW", label: "Ponta esquerda" },
  { value: "RW", label: "Ponta direita" },
  { value: "CF", label: "Segundo atacante" },
  { value: "ST", label: "Atacante" },
];

function squadPlayerVMFromResponse(sp: {
  id: string;
  shirtNumber: number | null;
  isCaptain: boolean;
  isStarter: boolean;
  positionSlot: string | null;
  cachedPlayer: {
    name: string;
    photoUrl: string | null;
    position: string | null;
    club: string | null;
    overall: number | null;
    externalLink?: string | null;
  };
}): SquadPlayerVM {
  return {
    id: sp.id,
    name: sp.cachedPlayer.name,
    photoUrl: sp.cachedPlayer.photoUrl,
    position: sp.cachedPlayer.position,
    club: sp.cachedPlayer.club,
    overall: sp.cachedPlayer.overall,
    shirtNumber: sp.shirtNumber,
    isCaptain: sp.isCaptain,
    isStarter: sp.isStarter,
    positionSlot: sp.positionSlot,
    externalLink: sp.cachedPlayer.externalLink,
  };
}

export function AddPlayerDialog({
  squadId,
  onAdded,
}: {
  squadId: string;
  onAdded: (player: SquadPlayerVM) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "create">("search");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [externalResults, setExternalResults] = useState<SearchResult[] | null>(null);
  const [searchingExternal, setSearchingExternal] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  // Kept as a defined string ("" = no selection) rather than undefined:
  // Base UI's Select warns if a component switches between uncontrolled
  // (value=undefined) and controlled (value=string) over its lifetime.
  const [position, setPosition] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/players/search?name=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => setResults(data.players ?? []))
        .catch(() => {});
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setExternalResults(null);
    if (value.trim().length < 2) setResults([]);
  }

  function searchExternal() {
    setSearchingExternal(true);
    fetch(`/api/players/search-external?name=${encodeURIComponent(query)}`)
      .then((res) => (res.ok ? res.json() : { players: [] }))
      .then((data) => setExternalResults(data.players ?? []))
      .catch(() => setExternalResults([]))
      .finally(() => setSearchingExternal(false));
  }

  function handleAdd(result: SearchResult) {
    const key = `${result.source}:${result.externalId}`;
    setAddingId(key);
    fetch(`/api/squads/${squadId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: result.source, externalId: result.externalId }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => onAdded(squadPlayerVMFromResponse(data.player)))
      .catch(() => toast.error("Não foi possível adicionar o jogador."))
      .finally(() => setAddingId(null));
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome ao jogador.");
      return;
    }

    setCreating(true);
    fetch(`/api/squads/${squadId}/players/custom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        position: position || undefined,
        shirtNumber: shirtNumber ? Number(shirtNumber) : undefined,
        photoUrl: photoUrl || undefined,
        externalLink: externalLink || undefined,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onAdded(squadPlayerVMFromResponse(data.player));
        toast.success(`${name} criado e adicionado ao elenco.`);
        setName("");
        setPosition("");
        setShirtNumber("");
        setPhotoUrl("");
        setExternalLink("");
      })
      .catch(() => toast.error("Não foi possível criar o jogador."))
      .finally(() => setCreating(false));
  }

  const showResults = query.trim().length >= 2;
  const shown = showResults ? [...results, ...(externalResults ?? [])] : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        + Adicionar
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar jogador</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "search" | "create")}>
          <TabsList>
            <TabsTrigger value="search">Buscar</TabsTrigger>
            <TabsTrigger value="create">Criar jogador</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "search" ? (
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Buscar jogador por nome"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              autoComplete="off"
              autoFocus
            />

            {showResults && shown.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum resultado na base local.</p>
            )}

            <ul className="flex flex-col gap-2">
              {shown.map((result) => {
                const key = `${result.source}:${result.externalId}`;
                return (
                  <li
                    key={key}
                    className="hover:border-primary/40 flex items-center gap-3 rounded-lg border p-2 transition-colors"
                  >
                    <PlayerAvatar
                      src={result.photoUrl}
                      name={result.name}
                      className={cn("ring-2", ratingStyle(result.overall).ring)}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="font-heading truncate text-base font-bold">{result.name}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {[result.position, result.club].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <OverallBadge overall={result.overall} />
                    <Button size="sm" disabled={addingId === key} onClick={() => handleAdd(result)}>
                      {addingId === key ? "..." : "Adicionar"}
                    </Button>
                  </li>
                );
              })}
            </ul>

            {query.trim().length >= 3 && externalResults === null && (
              <Button
                variant="outline"
                size="sm"
                onClick={searchExternal}
                disabled={searchingExternal}
              >
                {searchingExternal ? "Buscando…" : "Não achou? Buscar em outras fontes"}
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              Não achou o jogador em nenhuma busca? Cadastre ele manualmente.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-name">Nome</Label>
              <Input
                id="custom-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-position">Posição</Label>
              <Select value={position} onValueChange={(v) => setPosition(v ?? "")}>
                <SelectTrigger id="custom-position">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-number">Número da camisa</Label>
              <Input
                id="custom-number"
                type="number"
                min={1}
                max={99}
                value={shirtNumber}
                onChange={(e) => setShirtNumber(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-photo">URL da foto (opcional)</Label>
              <Input
                id="custom-photo"
                type="url"
                placeholder="https://..."
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-link">Link externo (ogol, transfermarket...)</Label>
              <Input
                id="custom-link"
                type="url"
                placeholder="https://..."
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={creating} className="w-fit">
              {creating ? "Criando…" : "Criar e adicionar"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
