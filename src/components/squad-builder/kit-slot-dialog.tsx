"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShirtIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { kitTypeLabel } from "@/lib/kits";

/** Etapa 9 parte 3 — um único diálogo cuida de adicionar, substituir E remover o kit de um tipo (§1.7). */
export function KitSlotDialog({
  seasonId,
  type,
  currentImageUrl,
  open,
  onOpenChange,
  onSaved,
  onRemoved,
}: {
  seasonId: string;
  type: string;
  currentImageUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (imageUrl: string) => void;
  onRemoved: () => void;
}) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!imageUrl.trim()) {
      toast.error("Envie ou cole a URL de uma imagem.");
      return;
    }

    setSaving(true);
    fetch(`/api/seasons/${seasonId}/kits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, imageUrl }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        onSaved(imageUrl.trim());
        toast.success(`Kit ${kitTypeLabel(type)} salvo.`);
        onOpenChange(false);
      })
      .catch(() => toast.error("Não foi possível salvar o kit."))
      .finally(() => setSaving(false));
  }

  function handleRemove() {
    setRemoving(true);
    fetch(`/api/seasons/${seasonId}/kits/${type}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error();
        onRemoved();
        toast.success(`Kit ${kitTypeLabel(type)} removido.`);
        onOpenChange(false);
      })
      .catch(() => toast.error("Não foi possível remover o kit."))
      .finally(() => setRemoving(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <ShirtIcon className="size-4" />
            Kit {kitTypeLabel(type)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`kit-image-${type}`}>Imagem do minikit</Label>
            <ImageUrlInput id={`kit-image-${type}`} value={imageUrl} onChange={setImageUrl} />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving || removing} className="w-fit">
              {saving ? "Salvando…" : "Salvar"}
            </Button>
            {currentImageUrl && (
              <Button
                type="button"
                variant="outline"
                disabled={saving || removing}
                onClick={handleRemove}
                className="text-destructive hover:text-destructive w-fit"
              >
                {removing ? "Removendo…" : "Remover"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
