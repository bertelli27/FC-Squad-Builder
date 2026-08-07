"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChartNoAxesColumnIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClubDestinationPicker, type DestinationValue } from "@/components/squad-builder/club-destination-picker";
import { TRANSFER_WINDOWS, type TransferWindow } from "@/lib/transfer-window";

const DEAL_TYPES = [
  { value: "permanent", label: "Venda" },
  { value: "loan", label: "Empréstimo" },
];

interface StatsTotal {
  appearances: number;
  goals: number;
  assists: number;
}

/**
 * §2-§7: "Transferir jogador" — a real saída, not just a text entry. Only
 * ever mounted for a player who's actually in this season's roster
 * (squadPlayerId is required upstream in player-profile-dialog.tsx).
 *
 * Etapa 9 complementar (§10-12) — mostra, antes de confirmar, um resumo
 * somente-leitura das estatísticas dele NESTA temporada ("antes da
 * saída") — sempre calculado ao vivo a partir de PlayerCompetitionStats
 * (mesmo endpoint que PlayerStatsSection já usa), nunca um valor
 * digitado à parte. A saída em si não apaga nada disso (ver
 * season.service.ts#transferPlayerOut) — isto é só a confirmação visual
 * de que o histórico continua ali antes de sair.
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
  const [transferWindow, setTransferWindow] = useState<TransferWindow | "">("");
  const [destination, setDestination] = useState<DestinationValue>({ squadId: null, name: "" });
  const [value, setValue] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [statsTotal, setStatsTotal] = useState<StatsTotal | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/stats`)
      .then((res) => (res.ok ? res.json() : { stats: [] }))
      .then((data) => {
        if (cancelled) return;
        const total = (data.stats ?? []).reduce(
          (acc: StatsTotal, s: StatsTotal) => ({
            appearances: acc.appearances + s.appearances,
            goals: acc.goals + s.goals,
            assists: acc.assists + s.assists,
          }),
          { appearances: 0, goals: 0, assists: 0 },
        );
        setStatsTotal(total);
      })
      .catch(() => {
        if (!cancelled) setStatsTotal({ appearances: 0, goals: 0, assists: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [seasonId, squadPlayerId]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!destination.name.trim()) {
      toast.error("Informe o clube de destino.");
      return;
    }

    setSaving(true);
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/transfer-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealType,
        counterpartClub: destination.name,
        counterpartSquadId: destination.squadId ?? undefined,
        value: value ?? undefined,
        transferWindow: transferWindow || undefined,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => onTransferred(destination.name.trim()))
      .catch(() => toast.error("Não foi possível transferir o jogador."))
      .finally(() => setSaving(false));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        O jogador sai do elenco desta temporada e a movimentação é registrada automaticamente em transferências.
      </p>

      {statsTotal && (statsTotal.appearances > 0 || statsTotal.goals > 0 || statsTotal.assists > 0) && (
        <div className="bg-muted/40 flex flex-col gap-1.5 rounded-lg border p-3">
          <span className="text-muted-foreground font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <ChartNoAxesColumnIcon className="size-3.5" />
            Estatísticas nesta temporada (antes da saída)
          </span>
          <div className="flex gap-5">
            <Stat label="Jogos" value={statsTotal.appearances} />
            <Stat label="Gols" value={statsTotal.goals} />
            <Stat label="Assistências" value={statsTotal.assists} />
          </div>
          <p className="text-muted-foreground text-xs">
            Continuam registradas normalmente depois da saída — a transferência não apaga o histórico.
          </p>
        </div>
      )}

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
        <Label htmlFor="transfer-out-window">Quando na temporada (opcional)</Label>
        <Select value={transferWindow} onValueChange={(v) => setTransferWindow((v as TransferWindow) ?? "")}>
          <SelectTrigger id="transfer-out-window">
            <SelectValue placeholder="Não informado">
              {(v: string) => TRANSFER_WINDOWS.find((w) => w.value === v)?.label ?? v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TRANSFER_WINDOWS.map((w) => (
              <SelectItem key={w.value} value={w.value}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ClubDestinationPicker label="Clube de destino" value={destination} onChange={setDestination} required />

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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-heading text-lg font-bold">{value}</span>
      <span className="text-muted-foreground text-[10px]">{label}</span>
    </div>
  );
}
