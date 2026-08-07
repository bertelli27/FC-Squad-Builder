"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShieldIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface SquadOption {
  id: string;
  name: string;
  logoUrl: string | null;
  baseKind: string | null;
}

/**
 * Etapa 10.1 (§3) — busca entre os elencos (clube/seleção) já cadastrados,
 * pra vincular o "clube atual" de um jogador. Mesmo padrão de
 * season-picker.tsx, só que no nível do elenco (sem temporada).
 */
export function SquadPicker({ onSelect }: { onSelect: (squad: SquadOption) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SquadOption[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/squads/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { squads: [] }))
        .then((data) => setResults(data.squads ?? []))
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
          {results.map((squad) => (
            <li key={squad.id}>
              <button
                type="button"
                onClick={() => onSelect(squad)}
                className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
              >
                {squad.logoUrl ? (
                  <Image src={squad.logoUrl} alt="" width={20} height={20} className="size-5 object-contain" unoptimized />
                ) : (
                  <ShieldIcon className="text-muted-foreground size-5" />
                )}
                <span>{squad.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
