"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, PencilIcon, Trash2Icon, ShieldIcon, IdCardIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { EditCoachForm, type EditableCoach } from "./edit-coach-form";
import { CreateCoachDialog } from "./create-coach-dialog";
import { useDeleteCoach } from "@/hooks/use-delete-coach";

interface ManagementCoach extends EditableCoach {
  clubs: { name: string; logoUrl: string | null }[];
}

export function ManagementCoachesClient({ coaches: initialCoaches }: { coaches: ManagementCoach[] }) {
  const [coaches, setCoaches] = useState(initialCoaches);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ManagementCoach | null>(null);
  const { requestDelete, dialog: confirmDialog } = useDeleteCoach();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coaches;
    return coaches.filter((c) => c.name.toLowerCase().includes(q));
  }, [coaches, query]);

  async function handleDelete(coach: ManagementCoach) {
    const deleted = await requestDelete(coach);
    if (!deleted) return;
    setCoaches((prev) => prev.filter((c) => c.id !== coach.id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Pesquisar técnico…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <CreateCoachDialog onCreated={(coach) => setCoaches((prev) => [{ ...coach, clubs: [] }, ...prev])} />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {query.trim() ? `Nenhum técnico encontrado para "${query.trim()}".` : "Nenhum técnico cadastrado ainda."}
          </p>
        </div>
      ) : (
        <ul className="divide-border flex flex-col divide-y rounded-lg border">
          {filtered.map((coach) => (
            <li key={coach.id} className="hover:bg-accent/30 flex items-center gap-3 p-3">
              <PlayerAvatar src={coach.photoUrl} name={coach.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="font-heading truncate text-sm font-bold">{coach.name}</div>
                <div className="text-muted-foreground truncate text-xs">
                  {coach.clubs.length > 0 ? coach.clubs.map((c) => c.name).join(", ") : "Nenhuma temporada vinculada"}
                </div>
              </div>
              {coach.clubs.length > 0 && (
                <div className="flex shrink-0 items-center -space-x-1.5">
                  {coach.clubs.map((club) =>
                    club.logoUrl ? (
                      <Image
                        key={club.name}
                        src={club.logoUrl}
                        alt={club.name}
                        title={club.name}
                        width={20}
                        height={20}
                        className="ring-background size-5 rounded-full bg-white object-contain ring-2"
                        unoptimized
                      />
                    ) : (
                      <span
                        key={club.name}
                        title={club.name}
                        className="ring-background bg-muted flex size-5 items-center justify-center rounded-full ring-2"
                      >
                        <ShieldIcon className="text-muted-foreground size-3" />
                      </span>
                    ),
                  )}
                </div>
              )}
              <Link
                href={`/coaches/${coach.id}`}
                aria-label={`Ver perfil de ${coach.name}`}
                className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full"
              >
                <IdCardIcon className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => setEditing(coach)}
                aria-label={`Editar ${coach.name}`}
                className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full"
              >
                <PencilIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(coach)}
                aria-label={`Excluir ${coach.name}`}
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
            <DialogTitle>Editar técnico</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditCoachForm
              coach={editing}
              onCancel={() => setEditing(null)}
              onSaved={(patch) => {
                setCoaches((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...patch } : c)));
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
