"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KIND_NONE = "__all__";

export interface RankingFiltersConfig {
  /** Mostra o seletor Todos/Clubes/Seleções (§5/§7). */
  kind?: boolean;
  /** Lista pra popular "clube/seleção específico" — omitido = campo não aparece. */
  squads?: { id: string; name: string }[];
  /** Lista pra popular "competição específica" — omitido = campo não aparece. */
  competitions?: { id: string; name: string }[];
  /** Mostra "de/até" ano. */
  yearRange?: boolean;
}

/**
 * Etapa 10.5 (§5/§26) — filtros ESTRUTURAIS (mudam o que é agregado, não
 * só a exibição): lê/escreve a URL via searchParams, a página (server
 * component) roda a agregação de novo com o filtro novo — combináveis
 * entre si (ex: seleção + intervalo de anos), cada `set*` só altera o
 * próprio parâmetro, preservando os demais.
 */
export function RankingFilters({ config }: { config: RankingFiltersConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const kind = searchParams.get("kind") ?? KIND_NONE;
  const squadId = searchParams.get("squadId") ?? "";
  const competitionId = searchParams.get("competitionId") ?? "";
  const fromYear = searchParams.get("fromYear") ?? "";
  const toYear = searchParams.get("toYear") ?? "";

  return (
    <div className="flex flex-wrap items-end gap-3">
      {config.kind && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={kind} onValueChange={(v) => setParam("kind", v === KIND_NONE ? null : (v ?? null))}>
            <SelectTrigger className="w-36">
              <SelectValue>
                {(v: string) => (v === "club" ? "Clubes" : v === "nationalTeam" ? "Seleções" : "Todos")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={KIND_NONE}>Todos</SelectItem>
              <SelectItem value="club">Clubes</SelectItem>
              <SelectItem value="nationalTeam">Seleções</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {config.squads && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Clube/Seleção</Label>
          <Select value={squadId || KIND_NONE} onValueChange={(v) => setParam("squadId", v === KIND_NONE ? null : (v ?? null))}>
            <SelectTrigger className="w-44">
              <SelectValue>{() => config.squads?.find((s) => s.id === squadId)?.name ?? "Todos"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={KIND_NONE}>Todos</SelectItem>
              {config.squads.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.competitions && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Competição</Label>
          <Select
            value={competitionId || KIND_NONE}
            onValueChange={(v) => setParam("competitionId", v === KIND_NONE ? null : (v ?? null))}
          >
            <SelectTrigger className="w-44">
              <SelectValue>{() => config.competitions?.find((c) => c.id === competitionId)?.name ?? "Todas"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={KIND_NONE}>Todas</SelectItem>
              {config.competitions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.yearRange && (
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">De</Label>
            <Input
              type="number"
              className="w-24"
              value={fromYear}
              onChange={(e) => setParam("fromYear", e.target.value || null)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Até</Label>
            <Input
              type="number"
              className="w-24"
              value={toYear}
              onChange={(e) => setParam("toYear", e.target.value || null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
