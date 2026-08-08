"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingTable } from "./ranking-table";
import { buildTransferColumns, type TransferRow } from "./transfer-columns";

type Tab = "all" | "purchases" | "sales";

const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "Maiores transferências" },
  { value: "purchases", label: "Maiores compras" },
  { value: "sales", label: "Maiores vendas" },
];

/** Etapa 10.5 (§10) — maiores transferências globais, com abas Todas/Compras/Vendas. */
export function TransferRankingsTabs({ all, purchases, sales }: { all: TransferRow[]; purchases: TransferRow[]; sales: TransferRow[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const columns = buildTransferColumns();
  const rows = tab === "all" ? all : tab === "purchases" ? purchases : sales;

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => v && setTab(v as Tab)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <RankingTable
        rows={rows}
        columns={columns}
        getKey={(r) => r.id}
        getSearchText={(r) => r.playerName}
        emptyLabel="Nenhuma transferência com valor registrado ainda."
      />
    </div>
  );
}
