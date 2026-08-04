"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CoachOption {
  id: string;
  name: string;
}

const NO_COACH = "__none__";
const NEW_COACH = "__new__";

/**
 * Técnico agora é uma entidade compartilhada (Coach) — este dialog só
 * ATRIBUI um técnico à temporada (existente, escolhido de uma lista, ou
 * novo), o mesmo padrão de AddTitleDialog pra competições. Editar os dados
 * de um técnico já existente (nome/foto/link) vive em Gerenciamento →
 * Técnicos, não aqui — assim uma edição feita a partir de uma temporada
 * nunca surpreende alterando o mesmo técnico usado em outras.
 */
export function EditSeasonCoachDialog({
  squadId,
  seasonId,
  coachId,
}: {
  squadId: string;
  seasonId: string;
  coachId?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [selected, setSelected] = useState<string>(coachId ?? NO_COACH);
  const [newName, setNewName] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newExternalLink, setNewExternalLink] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/coaches")
      .then((res) => (res.ok ? res.json() : { coaches: [] }))
      .then((data) => setCoaches(data.coaches ?? []))
      .catch(() => {});
  }, [open]);

  function handleOpen() {
    setSelected(coachId ?? NO_COACH);
    setOpen(true);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selected === NEW_COACH && !newName.trim()) {
      toast.error("Dê um nome ao técnico.");
      return;
    }

    setSaving(true);
    const resolveCoachId: Promise<string | null> =
      selected === NEW_COACH
        ? fetch("/api/coaches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newName,
              photoUrl: newPhotoUrl || undefined,
              externalLink: newExternalLink || undefined,
            }),
          })
            .then((res) => (res.ok ? res.json() : Promise.reject()))
            .then((data) => data.coach.id)
        : Promise.resolve(selected === NO_COACH ? null : selected);

    resolveCoachId
      .then((resolvedCoachId) =>
        fetch(`/api/squads/${squadId}/seasons/${seasonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coachId: resolvedCoachId }),
        }),
      )
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        toast.success("Técnico atualizado.");
        setOpen(false);
        setNewName("");
        setNewPhotoUrl("");
        setNewExternalLink("");
        router.refresh();
      })
      .catch(() => toast.error("Não foi possível salvar."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" aria-label="Editar técnico" onClick={handleOpen}>
        <PencilIcon className="size-4" />
        Técnico
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <UserRound className="size-4" />
            Técnico desta temporada
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Técnico</Label>
            <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
              <SelectTrigger>
                <SelectValue>
                  {(v: string) =>
                    v === NO_COACH
                      ? "Nenhum"
                      : v === NEW_COACH
                        ? "Novo técnico"
                        : (coaches.find((c) => c.id === v)?.name ?? v)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COACH}>Nenhum</SelectItem>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_COACH}>+ Novo técnico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selected === NEW_COACH && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="coach-name">Nome</Label>
                <Input id="coach-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="coach-photo">URL da foto</Label>
                <ImageUrlInput id="coach-photo" value={newPhotoUrl} onChange={setNewPhotoUrl} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="coach-link">Link externo</Label>
                <Input
                  id="coach-link"
                  type="url"
                  placeholder="https://..."
                  value={newExternalLink}
                  onChange={(e) => setNewExternalLink(e.target.value)}
                />
              </div>
            </>
          )}

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
