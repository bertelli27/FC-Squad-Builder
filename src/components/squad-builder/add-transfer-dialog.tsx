"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TransferVM } from "./transfers-card";

export function AddTransferDialog({
  seasonId,
  type,
  open,
  onOpenChange,
  onAdded,
}: {
  seasonId: string;
  type: "in" | "out";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (transfer: TransferVM) => void;
}) {
  const [playerName, setPlayerName] = useState("");
  const [counterpartClub, setCounterpartClub] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setPlayerName("");
    setCounterpartClub("");
    setValue("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!playerName.trim()) {
      toast.error("Informe o nome do jogador.");
      return;
    }

    setSaving(true);
    fetch(`/api/seasons/${seasonId}/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        playerName,
        counterpartClub: counterpartClub || undefined,
        value: value ? Number(value) : undefined,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onAdded(data.transfer);
        toast.success(`${playerName} adicionado às ${type === "in" ? "entradas" : "saídas"}.`);
        reset();
        onOpenChange(false);
      })
      .catch(() => toast.error("Não foi possível adicionar a transferência."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <ArrowRightLeftIcon className="size-4" />
            {type === "in" ? "Nova entrada" : "Nova saída"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-player">Jogador</Label>
            <Input
              id="transfer-player"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-club">
              {type === "in" ? "Clube de origem" : "Clube de destino"}
            </Label>
            <Input
              id="transfer-club"
              value={counterpartClub}
              onChange={(e) => setCounterpartClub(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-value">{type === "in" ? "Valor da contratação" : "Valor da venda"}</Label>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                €
              </span>
              <Input
                id="transfer-value"
                type="number"
                min={0}
                step="0.01"
                className="pl-7"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Salvando…" : "Adicionar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
