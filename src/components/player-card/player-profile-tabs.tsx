"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerOverviewTab, type PlayerOverviewData } from "./player-overview-tab";
import { CareerSummaryCard, type CareerSummaryData } from "./career-summary-card";
import { PlayerStatsTab } from "./player-stats-tab";
import { PlayerSeasonsTab, type PlayerSeasonData } from "./player-seasons-tab";
import { PlayerTransfersTab, type PlayerTransferData } from "./player-transfers-tab";
import { PlayerCallupsTab } from "./player-callups-tab";
import { PlayerTitlesTab, type PlayerTitleData } from "./player-titles-tab";
import { TimelineView } from "@/components/timeline/timeline-view";
import type { TimelineEventVM } from "@/lib/timeline";

interface StatBlock {
  appearances: number;
  goals: number;
  assists: number;
}

/** Etapa 10.2 — orquestrador de abas do perfil de jogador; tudo já vem pronto da página (mesmo padrão de squad-profile-tabs.tsx). */
export function PlayerProfileTabs({
  cachedPlayerId,
  overview,
  careerId,
  career,
  stats,
  seasons,
  callups,
  transfers,
  titles,
  timelineEvents,
}: {
  cachedPlayerId: string;
  overview: PlayerOverviewData;
  careerId: string | null;
  career: CareerSummaryData | null;
  stats: { club: StatBlock; nationalTeam: StatBlock; total: StatBlock };
  seasons: PlayerSeasonData[];
  callups: PlayerSeasonData[];
  transfers: PlayerTransferData[];
  titles: { club: PlayerTitleData[]; nationalTeam: PlayerTitleData[] };
  timelineEvents: TimelineEventVM[];
}) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="career">Carreira</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="seasons">Temporadas</TabsTrigger>
          <TabsTrigger value="transfers">Transferências</TabsTrigger>
          <TabsTrigger value="callups">Seleções</TabsTrigger>
          <TabsTrigger value="titles">Títulos</TabsTrigger>
          <TabsTrigger value="timeline">História</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && <PlayerOverviewTab player={overview} totalStats={stats.total} />}
      {tab === "career" && <CareerSummaryCard careerId={careerId} career={career} />}
      {tab === "stats" && <PlayerStatsTab club={stats.club} nationalTeam={stats.nationalTeam} total={stats.total} />}
      {tab === "seasons" && <PlayerSeasonsTab seasons={seasons} />}
      {tab === "transfers" && <PlayerTransfersTab transfers={transfers} />}
      {tab === "callups" && <PlayerCallupsTab callups={callups} />}
      {tab === "titles" && <PlayerTitlesTab club={titles.club} nationalTeam={titles.nationalTeam} />}
      {tab === "timeline" && <TimelineView events={timelineEvents} entityType="cachedPlayer" entityId={cachedPlayerId} />}
    </div>
  );
}
