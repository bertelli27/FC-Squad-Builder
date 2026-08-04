"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, PencilIcon, Trash2Icon, ShieldIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditCompetitionForm, type EditableCompetition } from "./edit-competition-form";
import { useDeleteCompetition } from "@/hooks/use-delete-competition";

export function ManagementCompetitionsClient({
  competitions: initialCompetitions,
}: {
  competitions: EditableCompetition[];
}) {
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditableCompetition | null>(null);
  const { requestDelete, dialog: confirmDialog } = useDeleteCompetition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return competitions;
    return competitions.filter((c) => c.name.toLowerCase().includes(q));
  }, [competitions, query]);

  async function handleDelete(competition: EditableCompetition) {
    const deleted = await requestDelete(competition);
    if (!deleted) return;
    setCompetitions((prev) => prev.filter((c) => c.id !== competition.id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Pesquisar competição…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
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
        <ul className="divide-border flex flex-col divide-y rounded-lg border">
          {filtered.map((competition) => (
            <li key={competition.id} className="hover:bg-accent/30 flex items-center gap-3 p-3">
              {competition.logoUrl ? (
                <Image
                  src={competition.logoUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 shrink-0 object-contain"
                  unoptimized
                />
              ) : (
                <ShieldIcon className="text-muted-foreground size-7 shrink-0" strokeWidth={1.25} />
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
              <button
                type="button"
                onClick={() => setEditing(competition)}
                aria-label={`Editar ${competition.name}`}
                className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full"
              >
                <PencilIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(competition)}
                aria-label={`Excluir ${competition.name}`}
                className="text-muted-foreground hover:text-destructive flex size-8 items-center justify-center rounded-full"
              >
                <Trash2Icon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar competição</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditCompetitionForm
              competition={editing}
              onCancel={() => setEditing(null)}
              onSaved={(patch) => {
                setCompetitions((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...patch } : c)));
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
