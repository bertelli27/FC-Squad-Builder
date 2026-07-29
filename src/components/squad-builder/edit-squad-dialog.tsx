"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategorySelect } from "./category-select";
import { TagsInput } from "./tags-input";

export interface EditableSquadData {
  id: string;
  name: string;
  logoUrl?: string | null;
  coachName?: string | null;
  coachPhotoUrl?: string | null;
  coachExternalLink?: string | null;
  categoryId?: string | null;
  tags?: { id: string; name: string }[];
}

export function EditSquadDialog({ squad }: { squad: EditableSquadData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(squad.name);
  const [logoUrl, setLogoUrl] = useState(squad.logoUrl ?? "");
  const [coachName, setCoachName] = useState(squad.coachName ?? "");
  const [coachPhotoUrl, setCoachPhotoUrl] = useState(squad.coachPhotoUrl ?? "");
  const [coachExternalLink, setCoachExternalLink] = useState(squad.coachExternalLink ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(squad.categoryId ?? null);
  const [tagNames, setTagNames] = useState<string[]>(squad.tags?.map((t) => t.name) ?? []);
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("O elenco precisa de um nome.");
      return;
    }

    setSaving(true);
    fetch(`/api/squads/${squad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        logoUrl,
        coachName,
        coachPhotoUrl,
        coachExternalLink,
        categoryId,
        tagNames,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        toast.success("Elenco atualizado.");
        setOpen(false);
        router.refresh();
      })
      .catch(() => toast.error("Não foi possível salvar."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" aria-label="Editar elenco" onClick={() => setOpen(true)}>
        <PencilIcon className="size-4" />
        Editar
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar elenco</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-muted-foreground font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
              <Shield className="size-3.5" />
              Elenco
            </h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="squad-name">Nome do elenco</Label>
              <Input
                id="squad-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="squad-logo">URL do escudo</Label>
              <ImageUrlInput id="squad-logo" value={logoUrl} onChange={setLogoUrl} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <CategorySelect value={categoryId} onChange={setCategoryId} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tags</Label>
              <TagsInput value={tagNames} onChange={setTagNames} />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4">
            <h3 className="text-muted-foreground font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
              <UserRound className="size-3.5" />
              Técnico
            </h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coach-name">Nome</Label>
              <Input
                id="coach-name"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coach-photo">URL da foto</Label>
              <ImageUrlInput id="coach-photo" value={coachPhotoUrl} onChange={setCoachPhotoUrl} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coach-link">Link externo</Label>
              <Input
                id="coach-link"
                type="url"
                placeholder="https://..."
                value={coachExternalLink}
                onChange={(e) => setCoachExternalLink(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
