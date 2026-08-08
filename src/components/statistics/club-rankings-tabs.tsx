"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { RankingTable, type RankingColumn } from "./ranking-table";
import { buildTransferColumns, type TransferRow } from "./transfer-columns";

export interface ClubCountRow {
  squad: { id: string; name: string; logoUrl: string | null };
  count: number;
}

type Tab = "titles" | "seasons" | "purchases" | "sales";

const TABS: { value: Tab; label: string }[] = [
  { value: "titles", label: "Títulos" },
  { value: "seasons", label: "Temporadas" },
  { value: "purchases", label: "Maiores compras" },
  { value: "sales", label: "Maiores vendas" },
];

/** Etapa 10.5 (§6) — rankings de clube/seleção: Títulos/Temporadas/Maiores Compras/Maiores Vendas, tudo já buscado pela página. */
export function ClubRankingsTabs({
  titles,
  seasons,
  purchases,
  sales,
}: {
  titles: ClubCountRow[];
  seasons: ClubCountRow[];
  purchases: TransferRow[];
  sales: TransferRow[];
}) {
  const [tab, setTab] = useState<Tab>("titles");

  const countColumns: RankingColumn<ClubCountRow>[] = [
    {
      key: "club",
      label: "Clube/Seleção",
      render: (r) => (
        <Link href={`/squads/${r.squad.id}`} className="flex items-center gap-2 hover:underline">
          <ClubBadge src={r.squad.logoUrl} name={r.squad.name} size="sm" />
          <span className="truncate font-medium">{r.squad.name}</span>
        </Link>
      ),
    },
    { key: "count", label: tab === "titles" ? "Títulos" : "Temporadas", align: "right", render: (r) => r.count },
  ];
  const transferColumns = buildTransferColumns();

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

      {tab === "titles" && (
        <RankingTable
          rows={titles}
          columns={countColumns}
          getKey={(r) => r.squad.id}
          getSearchText={(r) => r.squad.name}
          emptyLabel="Nenhum título registrado ainda."
        />
      )}
      {tab === "seasons" && (
        <RankingTable
          rows={seasons}
          columns={countColumns}
          getKey={(r) => r.squad.id}
          getSearchText={(r) => r.squad.name}
          emptyLabel="Nenhuma temporada registrada ainda."
        />
      )}
      {tab === "purchases" && (
        <RankingTable
          rows={purchases}
          columns={transferColumns}
          getKey={(r) => r.id}
          getSearchText={(r) => r.playerName}
          emptyLabel="Nenhuma compra com valor registrado ainda."
        />
      )}
      {tab === "sales" && (
        <RankingTable
          rows={sales}
          columns={transferColumns}
          getKey={(r) => r.id}
          getSearchText={(r) => r.playerName}
          emptyLabel="Nenhuma venda com valor registrado ainda."
        />
      )}
    </div>
  );
}
