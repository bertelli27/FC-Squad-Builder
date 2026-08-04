"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EditableCoach } from "./edit-coach-form";

/** Etapa 9 (§18) — cria um técnico direto pelo Gerenciamento, sem exigir clube; fica disponível pra vincular a uma temporada depois. */
export function CreateCoachDialog({ onCreated }: { onCreated: (coach: EditableCoach) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome ao técnico.");
      return;
    }

    setSaving(true);
    fetch("/api/coaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, photoUrl: photoUrl || undefined, externalLink: externalLink || undefined }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onCreated(data.coach);
        toast.success(`${name} criado.`);
        setName("");
        setPhotoUrl("");
        setExternalLink("");
        setOpen(false);
      })
      .catch(() => toast.error("Não foi possível criar o técnico."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        Criar técnico
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <UserRoundPlus className="size-4" />
            Criar técnico
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Não precisa vincular a um clube agora — o técnico fica disponível pra ser escolhido numa temporada depois.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-coach-name">Nome</Label>
            <Input id="create-coach-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-coach-photo">URL da foto</Label>
            <ImageUrlInput id="create-coach-photo" value={photoUrl} onChange={setPhotoUrl} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-coach-link">Link externo</Label>
            <Input
              id="create-coach-link"
              type="url"
              placeholder="https://..."
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Criando…" : "Criar técnico"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
