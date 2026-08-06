"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeftIcon, ArrowDownCircle, ArrowUpCircle, ChartNoAxesColumnIcon, XIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/season";
import { TRANSFER_WINDOW_LABEL } from "@/lib/transfer-window";
import { SignPlayerDialog } from "./sign-player-dialog";
import { EditTransferDialog } from "./edit-transfer-dialog";
import { PlayerProfileDialog, type KnownPlayerInfo } from "../player-card/player-profile-dialog";
import type { SquadPlayerVM } from "./squad-editor";

export interface TransferVM {
  id: string;
  type: string; // "in" | "out"
  playerName: string;
  counterpartClub: string | null;
  value: number | null;
  dealType?: string; // "permanent" | "loan" — undefined on pre-etapa-7 rows
  transferWindow?: string | null; // "start" | "mid" | null — não informado
  /**
   * Só presente quando o jogador desta transferência está atualmente
   * isDeparted (saiu do elenco ativo desta temporada, independente de esta
   * linha ser a entrada ou a saída dele) — dá acesso ao perfil/estatísticas
   * dele mesmo depois de sumir do campo/banco (§"estatísticas depois da
   * saída"). null quando o jogador segue ativo no elenco (acessível
   * normalmente pelo campo/banco).
   */
  departedPlayer?: (KnownPlayerInfo & { squadPlayerId: string }) | null;
}

const DEAL_TYPE_LABEL: Record<string, string> = { permanent: "", loan: "Empréstimo" };

/**
 * §4/§5/§16: entradas e saídas da temporada, com o saldo (vendas − compras)
 * sempre calculado, nunca digitado. Etapa 7: uma transferência agora é uma
 * movimentação real do elenco (§1) — entradas só acontecem via "Contratar
 * jogador" (que também adiciona o jogador ao elenco, §11/§12); saídas só
 * acontecem a partir de um jogador do elenco ("Transferir", no perfil dele,
 * §2) — por isso não há mais um "+ Adicionar" manual aqui para saídas.
 */
export function TransfersCard({
  seasonId,
  ageReference,
  transfers: initialTransfers,
}: {
  seasonId: string;
  /** Repassado só pro PlayerProfileDialog de um jogador que já saiu (idade calculada na temporada, mesmo padrão do elenco ativo). */
  ageReference?: { startYear: number; calendar: string };
  transfers: TransferVM[];
}) {
  const [transfers, setTransfers] = useState(initialTransfers);
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();

  // Same cross-sibling sync as squad-editor.tsx (adjusting state during
  // render, not in an effect — see its matching comment): this only fires
  // when a router.refresh() happened (e.g. a player was transferred out
  // from the roster side), never from this card's own local edits.
  const [prevInitialTransfers, setPrevInitialTransfers] = useState(initialTransfers);
  if (initialTransfers !== prevInitialTransfers) {
    setPrevInitialTransfers(initialTransfers);
    setTransfers(initialTransfers);
  }

  const ins = transfers.filter((t) => t.type === "in");
  const outs = transfers.filter((t) => t.type === "out");

  const { spent, earned, balance } = useMemo(() => {
    const spent = ins.reduce((sum, t) => sum + (t.value ?? 0), 0);
    const earned = outs.reduce((sum, t) => sum + (t.value ?? 0), 0);
    return { spent, earned, balance: earned - spent };
  }, [ins, outs]);

  function handleUpdated(transferId: string, patch: Partial<TransferVM>) {
    setTransfers((prev) => prev.map((t) => (t.id === transferId ? { ...t, ...patch } : t)));
  }

  async function handleRemove(transfer: TransferVM) {
    const ok = await confirm({
      title: `Remover ${transfer.playerName} das transferências?`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;

    setTransfers((prev) => prev.filter((t) => t.id !== transfer.id));
    const res = await fetch(`/api/seasons/${seasonId}/transfers/${transfer.id}`, { method: "DELETE" });
    if (!res.ok) {
      setTransfers((prev) => [...prev, transfer]);
      toast.error("Não foi possível remover a transferência.");
    }
  }

  function handleSigned(_player: SquadPlayerVM, transfer: TransferVM) {
    setTransfers((prev) => [...prev, transfer]);
    // SquadEditor (a sibling, not a child, of this card) needs to pick up
    // the player this just added to the roster — see its own matching
    // comment on the reverse direction (transferring a player out).
    router.refresh();
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeftIcon className="text-primary size-4" />
          Transferências
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 py-4">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                <ArrowDownCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                Entradas ({ins.length})
              </h3>
              <SignPlayerDialog seasonId={seasonId} onSigned={handleSigned} />
            </div>
            <TransferList
              seasonId={seasonId}
              ageReference={ageReference}
              transfers={ins}
              emptyLabel="Nenhuma contratação registrada."
              onRemove={handleRemove}
              onUpdated={handleUpdated}
            />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
              <ArrowUpCircle className="size-4 text-rose-600 dark:text-rose-400" />
              Saídas ({outs.length})
            </h3>
            <TransferList
              seasonId={seasonId}
              ageReference={ageReference}
              transfers={outs}
              emptyLabel="Nenhuma venda registrada. Transfira um jogador pelo perfil dele no elenco."
              onRemove={handleRemove}
              onUpdated={handleUpdated}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t pt-3 text-sm">
          <span className="text-muted-foreground">
            Compras: <span className="text-foreground font-medium">{formatMoney(spent)}</span>
          </span>
          <span className="text-muted-foreground">
            Vendas: <span className="text-foreground font-medium">{formatMoney(earned)}</span>
          </span>
          <span className="text-muted-foreground">
            Saldo:{" "}
            <span
              className={cn(
                "font-heading font-bold",
                balance > 0 && "text-emerald-600 dark:text-emerald-400",
                balance < 0 && "text-rose-600 dark:text-rose-400",
              )}
            >
              {balance > 0 ? "+" : ""}
              {formatMoney(balance)}
            </span>
          </span>
        </div>
      </CardContent>

      {dialog}
    </Card>
  );
}

function TransferList({
  seasonId,
  ageReference,
  transfers,
  emptyLabel,
  onRemove,
  onUpdated,
}: {
  seasonId: string;
  ageReference?: { startYear: number; calendar: string };
  transfers: TransferVM[];
  emptyLabel: string;
  onRemove: (transfer: TransferVM) => void;
  onUpdated: (transferId: string, patch: Partial<TransferVM>) => void;
}) {
  return transfers.length === 0 ? (
    <p className="text-muted-foreground text-xs">{emptyLabel}</p>
  ) : (
    <ul className="flex flex-col gap-1">
      {transfers.map((t) => {
        const meta = [t.dealType && DEAL_TYPE_LABEL[t.dealType], t.transferWindow && TRANSFER_WINDOW_LABEL[t.transferWindow]]
          .filter(Boolean)
          .join(" · ");
        return (
          <li
            key={t.id}
            className="hover:bg-accent/30 group/transfer flex items-center gap-2 rounded-md px-2 py-1 text-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {t.playerName}
                {meta && <span className="text-muted-foreground ml-1.5 text-xs font-normal">({meta})</span>}
              </div>
              {t.counterpartClub && (
                <div className="text-muted-foreground truncate text-xs">
                  {t.type === "in" ? `${t.counterpartClub} → aqui` : `aqui → ${t.counterpartClub}`}
                </div>
              )}
            </div>
            {t.value != null && <span className="shrink-0 text-xs font-medium">{formatMoney(t.value)}</span>}
            {t.departedPlayer && (
              <PlayerProfileDialog
                seasonId={seasonId}
                squadPlayerId={t.departedPlayer.squadPlayerId}
                player={t.departedPlayer}
                ageReference={ageReference}
                aria-label={`Ver estatísticas de ${t.playerName}`}
                className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 transition-opacity group-hover/transfer:opacity-100"
              >
                <ChartNoAxesColumnIcon className="size-3.5" />
              </PlayerProfileDialog>
            )}
            <EditTransferDialog seasonId={seasonId} transfer={t} onUpdated={(patch) => onUpdated(t.id, patch)} />
            <button
              type="button"
              onClick={() => onRemove(t)}
              aria-label={`Remover ${t.playerName}`}
              className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover/transfer:opacity-100"
            >
              <XIcon className="size-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
