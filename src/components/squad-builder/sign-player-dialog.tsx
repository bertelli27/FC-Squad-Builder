"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SearchIcon, UserPlus, ImageIcon, XIcon, ArrowRightLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { CountrySelect } from "@/components/ui/country-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OverallBadge } from "@/components/player-card/overall-badge";
import { POSITIONS, MAX_SECONDARY_POSITIONS } from "@/lib/positions";
import { PlayerRowContent } from "./roster-table";
import type { SquadPlayerVM } from "./squad-editor";
import type { TransferVM } from "./transfers-card";

const DEAL_TYPES = [
  { value: "permanent", label: "Compra" },
  { value: "loan", label: "Empréstimo" },
];

interface SearchResult {
  source: string;
  externalId: string;
  name: string;
  position?: string;
  club?: string;
  overall?: number;
  photoUrl?: string;
}

function squadPlayerVMFromResponse(sp: {
  id: string;
  shirtNumber: number | null;
  isCaptain: boolean;
  isStarter: boolean;
  isWatchlist: boolean;
  isExtra: boolean;
  positionSlot: string | null;
  cachedPlayer: {
    id: string;
    source: string;
    name: string;
    photoUrl: string | null;
    position: string | null;
    secondaryPositions?: string[];
    nationality?: string | null;
    dateOfBirth?: string | null;
    club: string | null;
    overall: number | null;
    potential?: number | null;
    externalLink?: string | null;
  };
}): SquadPlayerVM {
  return {
    id: sp.id,
    cachedPlayerId: sp.cachedPlayer.id,
    source: sp.cachedPlayer.source,
    name: sp.cachedPlayer.name,
    photoUrl: sp.cachedPlayer.photoUrl,
    position: sp.cachedPlayer.position,
    secondaryPositions: sp.cachedPlayer.secondaryPositions,
    nationality: sp.cachedPlayer.nationality,
    dateOfBirth: sp.cachedPlayer.dateOfBirth,
    club: sp.cachedPlayer.club,
    overall: sp.cachedPlayer.overall,
    potential: sp.cachedPlayer.potential,
    shirtNumber: sp.shirtNumber,
    isCaptain: sp.isCaptain,
    isStarter: sp.isStarter,
    isWatchlist: sp.isWatchlist,
    isExtra: sp.isExtra,
    positionSlot: sp.positionSlot,
    externalLink: sp.cachedPlayer.externalLink,
  };
}

const ERROR_MESSAGES: Record<string, string> = {
  "already-in-squad": "Esse jogador já está no elenco desta temporada.",
  "player-not-found": "Não foi possível encontrar esse jogador.",
  "missing-player": "Escolha um jogador ou crie um novo.",
};

/**
 * §8-§13: "Contratar jogador" — a real entrada, not just adding to the
 * roster. Search/criar tabs mirror add-player-dialog.tsx (§9's duas
 * formas), plus the transfer fields (origem/tipo/valor) shared by both,
 * so either path ends in the same one POST that adds the player to the
 * roster AND records the Transfer("in") together (§13).
 */
export function SignPlayerDialog({
  seasonId,
  onSigned,
}: {
  seasonId: string;
  onSigned: (player: SquadPlayerVM, transfer: TransferVM) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "create">("search");

  const [counterpartClub, setCounterpartClub] = useState("");
  const [dealType, setDealType] = useState("permanent");
  const [value, setValue] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [externalResults, setExternalResults] = useState<SearchResult[] | null>(null);
  const [searchingExternal, setSearchingExternal] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [secondaryPositions, setSecondaryPositions] = useState<string[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [overall, setOverall] = useState("");
  const [potential, setPotential] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [creating, setCreating] = useState(false);

  const usedPositions = new Set([position, ...secondaryPositions].filter(Boolean));

  useEffect(() => {
    if (query.trim().length < 2) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/players/search?name=${encodeURIComponent(query)}`, { signal: controller.signal })
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

  function reset() {
    setMode("search");
    setName("");
    setPosition("");
    setSecondaryPositions([]);
    setDateOfBirth("");
    setNationality("");
    setOverall("");
    setPotential("");
    setShirtNumber("");
    setPhotoUrl("");
    setExternalLink("");
    setCounterpartClub("");
    setDealType("permanent");
    setValue("");
    setQuery("");
    setResults([]);
    setExternalResults(null);
  }

  function submitSign(body: Record<string, unknown>, playerLabel: string) {
    return fetch(`/api/seasons/${seasonId}/transfers/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        counterpartClub: counterpartClub || undefined,
        dealType,
        value: value ? Number(value) : undefined,
      }),
    })
      .then((res) => (res.ok ? res.json() : res.json().then((data) => Promise.reject(data))))
      .then((data) => {
        onSigned(squadPlayerVMFromResponse(data.player), data.transfer);
        toast.success(`${playerLabel} contratado.`);
        reset();
        setOpen(false);
      })
      .catch((err) => toast.error(ERROR_MESSAGES[err?.error] ?? "Não foi possível contratar o jogador."));
  }

  function handleSign(result: SearchResult) {
    const key = `${result.source}:${result.externalId}`;
    setSigningId(key);
    submitSign({ source: result.source, externalId: result.externalId }, result.name).finally(() =>
      setSigningId(null),
    );
  }

  function handleCreateAndSign(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome ao jogador.");
      return;
    }
    if (!position) {
      toast.error("Escolha uma posição.");
      return;
    }

    setCreating(true);
    submitSign(
      {
        newPlayer: {
          name,
          position,
          secondaryPositions: secondaryPositions.filter(Boolean),
          dateOfBirth: dateOfBirth || undefined,
          nationality: nationality || undefined,
          overall: overall ? Number(overall) : undefined,
          potential: potential ? Number(potential) : undefined,
          photoUrl: photoUrl || undefined,
          externalLink: externalLink || undefined,
        },
        shirtNumber: shirtNumber ? Number(shirtNumber) : undefined,
      },
      name,
    ).finally(() => setCreating(false));
  }

  const showResults = query.trim().length >= 2;
  const shown = showResults ? [...results, ...(externalResults ?? [])] : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ArrowRightLeftIcon className="size-3.5" />+ Contratar jogador
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contratar jogador</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 border-b pb-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sign-club">Clube de origem</Label>
            <Input
              id="sign-club"
              value={counterpartClub}
              onChange={(e) => setCounterpartClub(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="sign-type">Tipo</Label>
              <Select value={dealType} onValueChange={(v) => v && setDealType(v)}>
                <SelectTrigger id="sign-type">
                  <SelectValue>{(v: string) => DEAL_TYPES.find((d) => d.value === v)?.label ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DEAL_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="sign-value">Valor {dealType === "loan" && "(se houver)"}</Label>
              <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  €
                </span>
                <Input
                  id="sign-value"
                  type="number"
                  min={0}
                  step="0.01"
                  className="pl-7"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "search" | "create")}>
          <TabsList>
            <TabsTrigger value="search">Buscar</TabsTrigger>
            <TabsTrigger value="create">Criar jogador</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "search" ? (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                placeholder="Buscar jogador por nome"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            </div>

            {showResults && shown.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum resultado na base local.</p>
            )}

            <ul className="divide-border max-h-72 overflow-y-auto rounded-lg border">
              {shown.map((result) => {
                const key = `${result.source}:${result.externalId}`;
                return (
                  <li
                    key={key}
                    className="hover:bg-accent/40 flex items-center gap-3 border-t p-2 transition-colors first:border-t-0"
                  >
                    <PlayerRowContent
                      photoUrl={result.photoUrl}
                      name={result.name}
                      position={[result.position, result.club].filter(Boolean).join(" · ")}
                      overall={result.overall}
                    />
                    <OverallBadge overall={result.overall} />
                    <Button size="sm" disabled={signingId === key} onClick={() => handleSign(result)}>
                      {signingId === key ? "..." : "Contratar"}
                    </Button>
                  </li>
                );
              })}
            </ul>

            {query.trim().length >= 3 && externalResults === null && (
              <Button variant="outline" size="sm" onClick={searchExternal} disabled={searchingExternal}>
                {searchingExternal ? "Buscando…" : "Não achou? Buscar em outras fontes"}
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateAndSign} className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Não achou o jogador em nenhuma busca? Cadastre ele manualmente.
            </p>

            <div className="flex flex-col gap-3">
              <h3 className="text-muted-foreground font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                <UserPlus className="size-3.5" />
                Dados do jogador
              </h3>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sign-name">Nome</Label>
                <Input id="sign-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sign-position">Posição</Label>
                <Select value={position} onValueChange={(v) => setPosition(v ?? "")}>
                  <SelectTrigger id="sign-position">
                    <SelectValue placeholder="Selecione">
                      {(v: string) => POSITIONS.find((p) => p.value === v)?.label ?? v}
                    </SelectValue>
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
                <div className="flex items-center justify-between">
                  <Label>Posições secundárias</Label>
                  {secondaryPositions.length < MAX_SECONDARY_POSITIONS && (
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => setSecondaryPositions((prev) => [...prev, ""])}
                    >
                      + Adicionar
                    </Button>
                  )}
                </div>
                {secondaryPositions.map((secondary, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <Select
                      value={secondary}
                      onValueChange={(v) =>
                        setSecondaryPositions((prev) => prev.map((p, i) => (i === index ? (v ?? "") : p)))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione">
                          {(v: string) => POSITIONS.find((p) => p.value === v)?.label ?? v}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {POSITIONS.filter((p) => p.value === secondary || !usedPositions.has(p.value)).map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setSecondaryPositions((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Remover posição secundária"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sign-dob">Data de nascimento</Label>
                <Input id="sign-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sign-nationality">Nacionalidade</Label>
                <CountrySelect id="sign-nationality" value={nationality} onChange={setNationality} />
              </div>

              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="sign-overall">Overall</Label>
                  <Input
                    id="sign-overall"
                    type="number"
                    min={1}
                    max={99}
                    value={overall}
                    onChange={(e) => setOverall(e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="sign-potential">Potencial</Label>
                  <Input
                    id="sign-potential"
                    type="number"
                    min={1}
                    max={99}
                    value={potential}
                    onChange={(e) => setPotential(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sign-number">Número da camisa</Label>
                <Input
                  id="sign-number"
                  type="number"
                  min={1}
                  max={99}
                  value={shirtNumber}
                  onChange={(e) => setShirtNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-muted-foreground font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                <ImageIcon className="size-3.5" />
                Foto e link externo
              </h3>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sign-photo">URL da foto (opcional)</Label>
                <ImageUrlInput id="sign-photo" value={photoUrl} onChange={setPhotoUrl} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sign-link">Link externo (ogol, transfermarket...)</Label>
                <Input
                  id="sign-link"
                  type="url"
                  placeholder="https://..."
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={creating} className="w-fit">
              {creating ? "Criando…" : "Criar e contratar"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
