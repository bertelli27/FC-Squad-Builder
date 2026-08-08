"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { RankingTable, type RankingColumn } from "./ranking-table";
import { sortPlayerAggregates, type PlayerAggregateRow, type PlayerRankingMetric } from "@/lib/statistics";

const TABS: { value: PlayerRankingMetric; label: string }[] = [
  { value: "goals", label: "Artilheiros" },
  { value: "assists", label: "Assistências" },
  { value: "appearances", label: "Mais jogos" },
  { value: "contributions", label: "Participações em gols" },
];

/**
 * Etapa 10.5 (§4) — 4 abas sobre a MESMA lista já agregada pela página
 * (1 fetch server-side) — cada aba só reordena em memória (sortPlayerAggregates),
 * nenhuma query nova ao trocar de aba (§15/§27).
 */
export function PlayerRankingsTabs({ rows }: { rows: PlayerAggregateRow[] }) {
  const [tab, setTab] = useState<PlayerRankingMetric>("goals");
  const sorted = useMemo(() => sortPlayerAggregates(rows, tab), [rows, tab]);

  const playerCol: RankingColumn<PlayerAggregateRow> = {
    key: "player",
    label: "Jogador",
    render: (r) => (
      <Link href={`/players/${r.cachedPlayer.id}`} className="flex items-center gap-2 hover:underline">
        <PlayerAvatar src={r.cachedPlayer.photoUrl} name={r.cachedPlayer.name} size="sm" />
        <span className="truncate font-medium">{r.cachedPlayer.name}</span>
      </Link>
    ),
  };
  const clubCol: RankingColumn<PlayerAggregateRow> = {
    key: "club",
    label: "Clube/Seleção",
    hideOnMobile: true,
    render: (r) =>
      r.lastSquad ? (
        <Link href={`/squads/${r.lastSquad.id}`} className="flex items-center gap-2 hover:underline">
          <ClubBadge src={r.lastSquad.logoUrl} name={r.lastSquad.name} size="sm" />
          <span className="truncate text-sm">{r.lastSquad.name}</span>
        </Link>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
  };
  const gamesCol: RankingColumn<PlayerAggregateRow> = { key: "games", label: "Jogos", align: "right", render: (r) => r.appearances };
  const goalsCol: RankingColumn<PlayerAggregateRow> = { key: "goals", label: "Gols", align: "right", render: (r) => r.goals };
  const assistsCol: RankingColumn<PlayerAggregateRow> = { key: "assists", label: "Assist.", align: "right", render: (r) => r.assists };
  const contribCol: RankingColumn<PlayerAggregateRow> = {
    key: "contributions",
    label: "Participações",
    align: "right",
    render: (r) => r.goals + r.assists,
  };

  const columnsByTab: Record<PlayerRankingMetric, RankingColumn<PlayerAggregateRow>[]> = {
    goals: [playerCol, clubCol, gamesCol, goalsCol],
    assists: [playerCol, clubCol, assistsCol, gamesCol, goalsCol],
    appearances: [playerCol, clubCol, gamesCol, goalsCol, assistsCol],
    contributions: [playerCol, clubCol, goalsCol, assistsCol, contribCol],
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => v && setTab(v as PlayerRankingMetric)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <RankingTable
        rows={sorted}
        columns={columnsByTab[tab]}
        getKey={(r) => r.cachedPlayer.id}
        getSearchText={(r) => r.cachedPlayer.name}
        emptyLabel="Nenhum jogador com estatísticas registradas ainda."
      />
    </div>
  );
}
