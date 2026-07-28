"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
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

export function AddPlayerDialog({
  squadId,
  onAdded,
}: {
  squadId: string;
  onAdded: (player: SquadPlayerVM) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [externalResults, setExternalResults] = useState<SearchResult[] | null>(null);
  const [searchingExternal, setSearchingExternal] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

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
      .then((data) => {
        const sp = data.player;
        onAdded({
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
        });
      })
      .catch(() => toast.error("Não foi possível adicionar o jogador."))
      .finally(() => setAddingId(null));
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
                <li key={key} className="flex items-center gap-3 rounded-lg border p-2">
                  <PlayerAvatar src={result.photoUrl} name={result.name} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{result.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {[result.position, result.club].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  {result.overall != null && <Badge variant="secondary">{result.overall}</Badge>}
                  <Button
                    size="sm"
                    disabled={addingId === key}
                    onClick={() => handleAdd(result)}
                  >
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
              {searchingExternal
                ? "Buscando…"
                : "Não achou? Buscar em outras fontes"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
