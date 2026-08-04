"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search, Trash2Icon, TrophyIcon, ImagePlusIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditCompetitionForm, type EditableCompetition } from "./edit-competition-form";
import { useDeleteCompetition } from "@/hooks/use-delete-competition";

/**
 * Same Competition rows as management/competitions — no separate Trophy
 * entity exists (trophyImageUrl lives directly on Competition), so this is
 * just a trophy-first lens over the same data, sharing the same edit form
 * and delete flow instead of duplicating either.
 */
export function ManagementTrophiesClient({
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
          placeholder="Pesquisar troféu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {query.trim()
              ? `Nenhum troféu encontrado para "${query.trim()}".`
              : "Nenhuma competição cadastrada ainda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((competition) => (
            <Card key={competition.id} className="items-center gap-2 py-4 text-center">
              <CardContent className="flex flex-col items-center gap-2 px-3">
                {competition.trophyImageUrl ? (
                  <Image
                    src={competition.trophyImageUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 object-contain"
                    unoptimized
                  />
                ) : (
                  <TrophyIcon className="text-muted-foreground size-14" strokeWidth={1.25} />
                )}
                <span className="font-heading line-clamp-2 text-sm font-semibold leading-tight">
                  {competition.name}
                </span>
                <span className="text-muted-foreground text-xs">
                  {competition.trophyImageUrl ? "Imagem cadastrada" : "Nenhuma imagem cadastrada"}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button size="xs" variant="outline" onClick={() => setEditing(competition)}>
                    <ImagePlusIcon className="size-3.5" />
                    {competition.trophyImageUrl ? "Alterar imagem" : "Adicionar imagem"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(competition)}
                    aria-label={`Excluir ${competition.name}`}
                    className="text-muted-foreground hover:text-destructive flex size-7 items-center justify-center rounded-full"
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar troféu</DialogTitle>
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
