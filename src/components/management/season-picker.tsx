"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShieldIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatSeasonLabel } from "@/lib/season";

export interface SeasonOption {
  id: string;
  startYear: number;
  squad: { id: string; name: string; logoUrl: string | null; baseKind: string | null; seasonCalendar: string };
}

/**
 * Etapa 9 (§46) — busca entre as temporadas já cadastradas pelo usuário,
 * pra vincular um campeão histórico a um elenco real em vez de digitar
 * tudo solto. Não filtra por clube/seleção (ver comentário em
 * squadService.searchSquadSeasons sobre por que isso seria pouco
 * confiável) — todas as temporadas cadastradas aparecem, cabe ao usuário
 * escolher a certa.
 */
export function SeasonPicker({ onSelect }: { onSelect: (season: SeasonOption) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SeasonOption[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/squads/search-seasons?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { seasons: [] }))
        .then((data) => setResults(data.seasons ?? []))
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        placeholder="Buscar clube/seleção já cadastrado…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {query.trim().length >= 2 && results.length > 0 && (
        <ul className="divide-border max-h-56 overflow-y-auto rounded-lg border">
          {results.map((season) => (
            <li key={season.id}>
              <button
                type="button"
                onClick={() => onSelect(season)}
                className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
              >
                {season.squad.logoUrl ? (
                  <Image
                    src={season.squad.logoUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 object-contain"
                    unoptimized
                  />
                ) : (
                  <ShieldIcon className="text-muted-foreground size-5" />
                )}
                <span>{season.squad.name}</span>
                <span className="text-muted-foreground ml-auto text-xs">
                  {formatSeasonLabel(season.startYear, season.squad.seasonCalendar)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
