"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CareerTransferVM } from "./types";

/** §2/§3: a transfer event on the timeline — "Clube A → Clube B, €valor". */
export function AddCareerTransferDialog({
  careerId,
  open,
  onOpenChange,
  onAdded,
  defaultFromClubName,
  defaultYear,
}: {
  careerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (transfer: CareerTransferVM) => void;
  defaultFromClubName?: string;
  defaultYear?: number;
}) {
  const [fromClubName, setFromClubName] = useState(defaultFromClubName ?? "");
  const [toClubName, setToClubName] = useState("");
  const [value, setValue] = useState<number | null>(null);
  const [year, setYear] = useState(defaultYear ?? new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  function reset() {
    setFromClubName(defaultFromClubName ?? "");
    setToClubName("");
    setValue(null);
    setYear(defaultYear ?? new Date().getFullYear());
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!toClubName.trim()) {
      toast.error("Informe o clube de destino.");
      return;
    }

    setSaving(true);
    fetch(`/api/careers/${careerId}/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromClubName: fromClubName || undefined,
        toClubName,
        value: value ?? undefined,
        year,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onAdded(data.transfer);
        toast.success("Transferência adicionada.");
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
            Nova transferência
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="career-transfer-from">Clube de origem</Label>
            <Input
              id="career-transfer-from"
              value={fromClubName}
              onChange={(e) => setFromClubName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="career-transfer-to">Clube de destino</Label>
            <Input
              id="career-transfer-to"
              value={toClubName}
              onChange={(e) => setToClubName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="career-transfer-year">Ano</Label>
              <Input
                id="career-transfer-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="career-transfer-value">Valor</Label>
              <CurrencyInput id="career-transfer-value" value={value} onChange={setValue} />
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
