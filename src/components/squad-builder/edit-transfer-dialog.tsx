"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransferVM } from "./transfers-card";

const DEAL_TYPES_IN = [
  { value: "permanent", label: "Compra" },
  { value: "loan", label: "Empréstimo" },
];
const DEAL_TYPES_OUT = [
  { value: "permanent", label: "Venda" },
  { value: "loan", label: "Empréstimo" },
];

/**
 * Etapa 9 complementar (§8/§9) — até agora uma transferência só podia ser
 * excluída; esta é a edição completa dos campos que existem hoje (clube
 * contrapartida, tipo, valor — com a mesma formatação monetária
 * brasileira já usada em Contratar/Transferir). Jogador e temporada não
 * são editáveis (ver comentário em season.service.ts#updateTransfer).
 */
export function EditTransferDialog({
  seasonId,
  transfer,
  onUpdated,
}: {
  seasonId: string;
  transfer: TransferVM;
  onUpdated: (patch: Partial<TransferVM>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [counterpartClub, setCounterpartClub] = useState(transfer.counterpartClub ?? "");
  const [dealType, setDealType] = useState(transfer.dealType ?? "permanent");
  const [value, setValue] = useState<number | null>(transfer.value);
  const [saving, setSaving] = useState(false);

  const dealTypes = transfer.type === "in" ? DEAL_TYPES_IN : DEAL_TYPES_OUT;
  const clubLabel = transfer.type === "in" ? "Clube de origem" : "Clube de destino";

  function handleOpen() {
    setCounterpartClub(transfer.counterpartClub ?? "");
    setDealType(transfer.dealType ?? "permanent");
    setValue(transfer.value);
    setOpen(true);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (transfer.type === "out" && !counterpartClub.trim()) {
      toast.error("Informe o clube de destino.");
      return;
    }

    setSaving(true);
    fetch(`/api/seasons/${seasonId}/transfers/${transfer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        counterpartClub: counterpartClub.trim() || null,
        dealType,
        value,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        onUpdated({ counterpartClub: counterpartClub.trim() || null, dealType, value });
        toast.success("Transferência atualizada.");
        setOpen(false);
      })
      .catch(() => toast.error("Não foi possível salvar a transferência."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Editar transferência de ${transfer.playerName}`}
        className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 transition-opacity group-hover/transfer:opacity-100"
      >
        <PencilIcon className="size-3.5" />
      </button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar transferência — {transfer.playerName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-transfer-club">{clubLabel}</Label>
            <Input
              id="edit-transfer-club"
              value={counterpartClub}
              onChange={(e) => setCounterpartClub(e.target.value)}
              placeholder={transfer.type === "in" ? "Opcional" : undefined}
              required={transfer.type === "out"}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-transfer-type">Tipo</Label>
              <Select value={dealType} onValueChange={(v) => v && setDealType(v)}>
                <SelectTrigger id="edit-transfer-type">
                  <SelectValue>{(v: string) => dealTypes.find((d) => d.value === v)?.label ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {dealTypes.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-transfer-value">Valor {dealType === "loan" && "(se houver)"}</Label>
              <CurrencyInput id="edit-transfer-value" value={value} onChange={setValue} />
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
