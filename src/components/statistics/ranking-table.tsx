"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface RankingColumn<T> {
  key: string;
  label: string;
  render: (row: T, index: number) => React.ReactNode;
  /** Colunas secundárias somem em telas pequenas em vez de forçar scroll horizontal (§19). */
  hideOnMobile?: boolean;
  align?: "left" | "right";
}

const LIMIT_OPTIONS = [10, 25, 50, 100];

/**
 * Etapa 10.5 (§16/§17/§18) — tabela genérica reaproveitada por todo
 * ranking (artilheiros, assistências, títulos, transferências...): só
 * as colunas mudam por chamador, o comportamento (busca client-side +
 * limite Top N) é sempre o mesmo, uma implementação só.
 */
export function RankingTable<T>({
  rows,
  columns,
  getKey,
  getSearchText,
  defaultLimit = 25,
  emptyLabel,
}: {
  rows: T[];
  columns: RankingColumn<T>[];
  getKey: (row: T) => string;
  getSearchText: (row: T) => string;
  defaultLimit?: number;
  emptyLabel: string;
}) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(defaultLimit);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => getSearchText(r).toLowerCase().includes(q)) : rows;
  }, [rows, search, getSearchText]);

  const shown = filtered.slice(0, limit);

  if (rows.length === 0) {
    return <EmptyState icon={SearchIcon} label={emptyLabel} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={String(limit)} onValueChange={(v) => v && setLimit(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue>{(v: string) => `Top ${v}`}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LIMIT_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                Top {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={SearchIcon} label={`Nenhum resultado para "${search}".`} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-muted-foreground w-10 px-3 py-2 text-left text-xs font-medium">#</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "text-muted-foreground px-3 py-2 text-xs font-medium",
                      col.align === "right" ? "text-right" : "text-left",
                      col.hideOnMobile && "hidden sm:table-cell",
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {shown.map((row, i) => (
                <tr key={getKey(row)} className="hover:bg-accent/30">
                  <td className="text-muted-foreground px-3 py-2 text-xs">{i + 1}</td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2",
                        col.align === "right" ? "text-right" : "text-left",
                        col.hideOnMobile && "hidden sm:table-cell",
                      )}
                    >
                      {col.render(row, i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
