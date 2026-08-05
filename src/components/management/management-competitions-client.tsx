"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Trash2Icon, ShieldIcon, TrophyIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { findCountry } from "@/lib/countries";
import { KIND_OPTIONS, SCOPE_LABELS } from "@/lib/competition-classification";
import { CreateCompetitionDialog } from "./create-competition-dialog";
import type { EditableCompetition } from "./edit-competition-form";
import { useDeleteCompetition } from "@/hooks/use-delete-competition";

const KIND_LABELS: Record<string, string> = {
  ...Object.fromEntries(KIND_OPTIONS.map((o) => [o.value, o.label])),
  unclassified: "Não classificadas",
};
const KIND_ORDER = ["nationalTeam", "club", "unclassified"];
const SCOPE_ORDER = ["world", "continental", "national", "unclassified"];

const KIND_FILTERS = [{ value: "all", label: "Todas" }, ...KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))];
const SCOPE_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "world", label: SCOPE_LABELS.world },
  { value: "continental", label: SCOPE_LABELS.continental },
  { value: "national", label: SCOPE_LABELS.national },
];

/** §B.7 — terceiro nível: organização (mundial/continental) ou país (nacional, só clube). */
function subgroupKeyFor(competition: EditableCompetition): string {
  if (competition.scope === "national") {
    return findCountry(competition.country)?.label ?? competition.country ?? "Outros países";
  }
  return competition.organizer || "Outros organizadores";
}

export function ManagementCompetitionsClient({
  competitions: initialCompetitions,
}: {
  competitions: EditableCompetition[];
}) {
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const { requestDelete, dialog: confirmDialog } = useDeleteCompetition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return competitions.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (kindFilter !== "all" && c.kind !== kindFilter) return false;
      if (scopeFilter !== "all" && c.scope !== scopeFilter) return false;
      return true;
    });
  }, [competitions, query, kindFilter, scopeFilter]);

  // §B.7/§B.8: Seleções/Clubes → Mundial/Continental/Nacional → organizador ou país.
  const groups = useMemo(() => {
    const byKind = new Map<string, EditableCompetition[]>();
    for (const c of filtered) {
      const kind = c.kind ?? "unclassified";
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind)!.push(c);
    }

    return KIND_ORDER.filter((k) => byKind.has(k)).map((kind) => {
      const byScope = new Map<string, EditableCompetition[]>();
      for (const c of byKind.get(kind)!) {
        const scope = c.scope ?? "unclassified";
        if (!byScope.has(scope)) byScope.set(scope, []);
        byScope.get(scope)!.push(c);
      }

      const scopeGroups = SCOPE_ORDER.filter((s) => byScope.has(s)).map((scope) => {
        const bySubgroup = new Map<string, EditableCompetition[]>();
        for (const c of byScope.get(scope)!) {
          const key = subgroupKeyFor(c);
          if (!bySubgroup.has(key)) bySubgroup.set(key, []);
          bySubgroup.get(key)!.push(c);
        }
        const subgroups = [...bySubgroup.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, items]) => ({ key, items: items.sort((a, b) => a.name.localeCompare(b.name)) }));
        return { scope, label: scope === "unclassified" ? "Não classificada" : SCOPE_LABELS[scope], subgroups };
      });

      return { kind, label: KIND_LABELS[kind], scopeGroups };
    });
  }, [filtered]);

  async function handleDelete(competition: EditableCompetition) {
    const deleted = await requestDelete(competition);
    if (!deleted) return;
    setCompetitions((prev) => prev.filter((c) => c.id !== competition.id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Pesquisar competição…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <CreateCompetitionDialog onCreated={(c) => setCompetitions((prev) => [c, ...prev])} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setKindFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              kindFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground hover:bg-accent border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-border">·</span>
        {SCOPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setScopeFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              scopeFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground hover:bg-accent border-border"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {query.trim() || kindFilter !== "all" || scopeFilter !== "all"
              ? "Nenhuma competição encontrada para esse filtro."
              : "Nenhuma competição cadastrada ainda."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.kind} className="flex flex-col gap-4">
              <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">{group.label}</h2>
              {group.scopeGroups.map((scopeGroup) => (
                <div key={scopeGroup.scope} className="flex flex-col gap-3 pl-2">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {scopeGroup.label}
                  </h3>
                  {scopeGroup.subgroups.map((subgroup) => (
                    <div key={subgroup.key} className="flex flex-col gap-2 pl-2">
                      <h4 className="text-muted-foreground pl-1 text-xs font-medium">{subgroup.key}</h4>
                      <ul className="divide-border flex flex-col divide-y rounded-lg border">
                        {subgroup.items.map((competition) => (
                          <li key={competition.id} className="hover:bg-accent/30 flex items-center gap-3 p-3">
                            <Link
                              href={`/management/competitions/${competition.id}`}
                              className="flex min-w-0 flex-1 items-center gap-3"
                            >
                              {competition.logoUrl ? (
                                <Image
                                  src={competition.logoUrl}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="size-10 shrink-0 object-contain"
                                  unoptimized
                                />
                              ) : (
                                <ShieldIcon className="text-muted-foreground size-10 shrink-0" strokeWidth={1.25} />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-heading truncate text-sm font-bold">
                                  {competition.name}
                                </div>
                                {(!competition.logoUrl || !competition.trophyImageUrl) && (
                                  <div className="text-muted-foreground text-xs">
                                    {[!competition.logoUrl && "sem logo", !competition.trophyImageUrl && "sem troféu"]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </div>
                                )}
                              </div>
                              {competition.trophyImageUrl ? (
                                <Image
                                  src={competition.trophyImageUrl}
                                  alt=""
                                  width={20}
                                  height={20}
                                  className="size-5 shrink-0 object-contain"
                                  unoptimized
                                />
                              ) : (
                                <TrophyIcon className="text-muted-foreground/50 size-5 shrink-0" strokeWidth={1.25} />
                              )}
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(competition)}
                              aria-label={`Excluir ${competition.name}`}
                              className="text-muted-foreground hover:text-destructive flex size-8 shrink-0 items-center justify-center rounded-full"
                            >
                              <Trash2Icon className="size-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
