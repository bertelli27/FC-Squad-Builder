"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { CountryFlag } from "./country-flag";
import { cn } from "@/lib/utils";

/**
 * Searchable country picker (§6/7, etapa 6) — stores/returns the canonical
 * `enName` (matches the English strings already in CachedPlayer.nationality
 * from Kaggle/API-Football, e.g. "Brazil"), displays the pt-BR label +
 * flag emoji. No Popover/Command primitive exists yet in this project, so
 * this rolls its own small dropdown rather than adding one for a single
 * use case.
 */
export function CountrySelect({
  id,
  value,
  onChange,
  placeholder = "Pesquisar país...",
}: {
  id?: string;
  value: string;
  onChange: (enName: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const matches = COUNTRIES.filter((c) =>
    query.trim() === ""
      ? true
      : c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.enName.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 8);

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="border-input bg-background hover:bg-accent/40 flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors"
      >
        <span className={cn("flex items-center gap-1.5 truncate", !value && "text-muted-foreground")}>
          <CountryFlag nationality={value} />
          {value ? (COUNTRIES.find((c) => c.enName === value)?.label ?? value) : "Selecione um país"}
        </span>
        <ChevronDown className="text-muted-foreground size-4 shrink-0" />
      </button>

      {open && (
        <div className="bg-popover absolute top-full left-0 z-50 mt-1 w-full rounded-md border shadow-md">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="border-b bg-transparent px-3 py-2 text-sm outline-none"
          />
          <ul className="max-h-56 overflow-y-auto p-1">
            {matches.length === 0 && (
              <li className="text-muted-foreground px-2 py-1.5 text-sm">Nenhum país encontrado.</li>
            )}
            {matches.map((country) => (
              <li key={country.enName}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(country.enName);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
                >
                  <CountryFlag nationality={country.enName} />
                  {country.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
