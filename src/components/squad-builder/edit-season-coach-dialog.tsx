"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Técnico is edited separately from the club-level EditSquadDialog now
 * that it lives on Season (§5: independente por temporada) — this dialog
 * only ever touches the one season it's rendered for.
 */
export function EditSeasonCoachDialog({
  squadId,
  seasonId,
  coachName,
  coachPhotoUrl,
  coachExternalLink,
}: {
  squadId: string;
  seasonId: string;
  coachName?: string | null;
  coachPhotoUrl?: string | null;
  coachExternalLink?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(coachName ?? "");
  const [photoUrl, setPhotoUrl] = useState(coachPhotoUrl ?? "");
  const [externalLink, setExternalLink] = useState(coachExternalLink ?? "");
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    fetch(`/api/squads/${squadId}/seasons/${seasonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachName: name || null,
        coachPhotoUrl: photoUrl || null,
        coachExternalLink: externalLink || null,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        toast.success("Técnico atualizado.");
        setOpen(false);
        router.refresh();
      })
      .catch(() => toast.error("Não foi possível salvar."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" aria-label="Editar técnico" onClick={() => setOpen(true)}>
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
            <Label htmlFor="coach-name">Nome</Label>
            <Input id="coach-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coach-photo">URL da foto</Label>
            <ImageUrlInput id="coach-photo" value={photoUrl} onChange={setPhotoUrl} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coach-link">Link externo</Label>
            <Input
              id="coach-link"
              type="url"
              placeholder="https://..."
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
