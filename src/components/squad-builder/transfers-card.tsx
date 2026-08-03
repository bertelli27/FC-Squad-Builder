"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeftIcon, ArrowDownCircle, ArrowUpCircle, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/season";
import { AddTransferDialog } from "./add-transfer-dialog";

export interface TransferVM {
  id: string;
  type: string; // "in" | "out"
  playerName: string;
  counterpartClub: string | null;
  value: number | null;
}

/** §4/§5: entradas e saídas da temporada, com o saldo (vendas − compras) sempre calculado, nunca digitado. */
export function TransfersCard({
  seasonId,
  transfers: initialTransfers,
}: {
  seasonId: string;
  transfers: TransferVM[];
}) {
  const [transfers, setTransfers] = useState(initialTransfers);
  const [dialogType, setDialogType] = useState<"in" | "out" | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const ins = transfers.filter((t) => t.type === "in");
  const outs = transfers.filter((t) => t.type === "out");

  const { spent, earned, balance } = useMemo(() => {
    const spent = ins.reduce((sum, t) => sum + (t.value ?? 0), 0);
    const earned = outs.reduce((sum, t) => sum + (t.value ?? 0), 0);
    return { spent, earned, balance: earned - spent };
  }, [ins, outs]);

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
          <TransferList
            title="Entradas"
            icon={<ArrowDownCircle className="size-4 text-emerald-600 dark:text-emerald-400" />}
            transfers={ins}
            emptyLabel="Nenhuma contratação registrada."
            onAdd={() => setDialogType("in")}
            onRemove={handleRemove}
          />
          <TransferList
            title="Saídas"
            icon={<ArrowUpCircle className="size-4 text-rose-600 dark:text-rose-400" />}
            transfers={outs}
            emptyLabel="Nenhuma venda registrada."
            onAdd={() => setDialogType("out")}
            onRemove={handleRemove}
          />
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

      {dialogType && (
        <AddTransferDialog
          seasonId={seasonId}
          type={dialogType}
          open={dialogType !== null}
          onOpenChange={(open) => !open && setDialogType(null)}
          onAdded={(transfer) => setTransfers((prev) => [...prev, transfer])}
        />
      )}
      {dialog}
    </Card>
  );
}

function TransferList({
  title,
  icon,
  transfers,
  emptyLabel,
  onAdd,
  onRemove,
}: {
  title: string;
  icon: React.ReactNode;
  transfers: TransferVM[];
  emptyLabel: string;
  onAdd: () => void;
  onRemove: (transfer: TransferVM) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          {icon}
          {title} ({transfers.length})
        </h3>
        <Button size="xs" variant="outline" onClick={onAdd}>
          + Adicionar
        </Button>
      </div>
      {transfers.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {transfers.map((t) => (
            <li
              key={t.id}
              className="hover:bg-accent/30 group/transfer flex items-center gap-2 rounded-md px-2 py-1 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{t.playerName}</div>
                {t.counterpartClub && (
                  <div className="text-muted-foreground truncate text-xs">
                    {t.type === "in" ? `${t.counterpartClub} → aqui` : `aqui → ${t.counterpartClub}`}
                  </div>
                )}
              </div>
              {t.value != null && (
                <span className="shrink-0 text-xs font-medium">{formatMoney(t.value)}</span>
              )}
              <button
                type="button"
                onClick={() => onRemove(t)}
                aria-label={`Remover ${t.playerName}`}
                className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover/transfer:opacity-100"
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
