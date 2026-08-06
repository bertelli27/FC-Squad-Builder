"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEAL_TYPES = [
  { value: "permanent", label: "Venda" },
  { value: "loan", label: "Empréstimo" },
];

/**
 * §2-§7: "Transferir jogador" — a real saída, not just a text entry. Only
 * ever mounted for a player who's actually in this season's roster
 * (squadPlayerId is required upstream in player-profile-dialog.tsx).
 */
export function TransferPlayerForm({
  seasonId,
  squadPlayerId,
  onCancel,
  onTransferred,
}: {
  seasonId: string;
  squadPlayerId: string;
  onCancel: () => void;
  onTransferred: (counterpartClub: string) => void;
}) {
  const [dealType, setDealType] = useState("permanent");
  const [counterpartClub, setCounterpartClub] = useState("");
  const [value, setValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!counterpartClub.trim()) {
      toast.error("Informe o clube de destino.");
      return;
    }

    setSaving(true);
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/transfer-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealType,
        counterpartClub,
        value: value ?? undefined,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => onTransferred(counterpartClub.trim()))
      .catch(() => toast.error("Não foi possível transferir o jogador."))
      .finally(() => setSaving(false));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        O jogador sai do elenco desta temporada e a movimentação é registrada automaticamente em transferências.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-out-type">Tipo</Label>
        <Select value={dealType} onValueChange={(v) => v && setDealType(v)}>
          <SelectTrigger id="transfer-out-type">
            <SelectValue>{(v: string) => DEAL_TYPES.find((d) => d.value === v)?.label ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DEAL_TYPES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-out-club">Clube de destino</Label>
        <Input
          id="transfer-out-club"
          value={counterpartClub}
          onChange={(e) => setCounterpartClub(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="transfer-out-value">Valor {dealType === "loan" && "(se houver)"}</Label>
        <CurrencyInput id="transfer-out-value" value={value} onChange={setValue} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} variant="destructive">
          {saving ? "Transferindo…" : "Confirmar transferência"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
