"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Trash2Icon, ShieldIcon, TrophyIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { findCountry } from "@/lib/countries";
import { CreateCompetitionDialog } from "./create-competition-dialog";
import type { EditableCompetition } from "./edit-competition-form";
import { useDeleteCompetition } from "@/hooks/use-delete-competition";

const KIND_LABELS: Record<string, string> = {
  nationalTeam: "🌎 Seleções",
  club: "🏟️ Clubes",
  unclassified: "Não classificadas",
};
const KIND_ORDER = ["nationalTeam", "club", "unclassified"];

function groupKeyFor(competition: EditableCompetition): string {
  if (competition.category === "international") return competition.organizer || "Outros organizadores";
  if (competition.category === "national") return findCountry(competition.country)?.label ?? competition.country ?? "Outros países";
  return "Não classificado";
}

export function ManagementCompetitionsClient({
  competitions: initialCompetitions,
}: {
  competitions: EditableCompetition[];
}) {
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [query, setQuery] = useState("");
  const { requestDelete, dialog: confirmDialog } = useDeleteCompetition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return competitions;
    return competitions.filter((c) => c.name.toLowerCase().includes(q));
  }, [competitions, query]);

  // §33/35/36: Seleções/Clubes primeiro, depois agrupado por
  // organizador (competições internacionais) ou país (nacionais).
  const groups = useMemo(() => {
    const byKind = new Map<string, EditableCompetition[]>();
    for (const c of filtered) {
      const kind = c.kind ?? "unclassified";
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind)!.push(c);
    }

    return KIND_ORDER.filter((k) => byKind.has(k)).map((kind) => {
      const bySubgroup = new Map<string, EditableCompetition[]>();
      for (const c of byKind.get(kind)!) {
        const key = groupKeyFor(c);
        if (!bySubgroup.has(key)) bySubgroup.set(key, []);
        bySubgroup.get(key)!.push(c);
      }
      const subgroups = [...bySubgroup.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => ({ key, items: items.sort((a, b) => a.name.localeCompare(b.name)) }));
      return { kind, label: KIND_LABELS[kind], subgroups };
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {query.trim()
              ? `Nenhuma competição encontrada para "${query.trim()}".`
              : "Nenhuma competição cadastrada ainda."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.kind} className="flex flex-col gap-3">
              <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">{group.label}</h2>
              {group.subgroups.map((subgroup) => (
                <div key={subgroup.key} className="flex flex-col gap-2">
                  <h3 className="text-muted-foreground pl-1 text-xs font-semibold tracking-wide uppercase">
                    {subgroup.key}
                  </h3>
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
                            <div className="font-heading truncate text-sm font-bold">{competition.name}</div>
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
      )}
      {confirmDialog}
    </div>
  );
}
