"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatSeasonLabel } from "@/lib/season";
import { SquadOverviewTab } from "./squad-overview-tab";
import { SeasonsSection, type SeasonCardData } from "./seasons-section";
import { ClubCoachesTab, type CoachUsedData } from "./club-coaches-tab";
import { NationalTeamCompetitionsTab, type ConvocationNodeData } from "./national-team-competitions-tab";
import { PalmaresCard, type PalmaresEntry } from "./palmares-card";
import { FullHistoryView } from "./full-history-view";
import type { CurrentPlayerData } from "./current-players-card";

interface PlayerRankEntry {
  cachedPlayer: { id: string; name: string; photoUrl: string | null };
  appearances: number;
  goals: number;
  assists: number;
}

interface TransferRankEntry {
  id: string;
  playerName: string;
  counterpartClub: string | null;
  value: number | null;
  season: { startYear: number };
}

/**
 * Etapa 10.2 — orquestrador de abas do perfil de clube/seleção. Não busca
 * nada sozinho — tudo já vem pronto da página (Promise.all), mesmo padrão
 * de competition-detail-tabs.tsx (useState local, sem sync de URL).
 *
 * Etapa 10.3 (§5/§6): as abas "Jogadores"/"Transferências"/"Competições"
 * (clube) saíram — essa informação continua acessível dentro de cada
 * Temporada, só deixou de duplicar como aba própria do clube. A árvore
 * de convocações da seleção ("Competições") continua, é a navegação
 * primária dela.
 */
export function SquadProfileTabs({
  squadId,
  baseKind,
  seasonCalendar,
  seasons,
  palmares,
  currentPlayers,
  coachesUsed,
  convocationTree,
  historicalStats,
  topTransfers,
}: {
  squadId: string;
  baseKind: string | null;
  seasonCalendar: string;
  seasons: SeasonCardData[];
  palmares: PalmaresEntry[];
  currentPlayers: CurrentPlayerData[];
  coachesUsed: CoachUsedData[];
  convocationTree: ConvocationNodeData[];
  historicalStats: { topScorers: PlayerRankEntry[]; topAssists: PlayerRankEntry[]; mostAppearances: PlayerRankEntry[] };
  topTransfers: { topBuys: TransferRankEntry[]; topSales: TransferRankEntry[] };
}) {
  const isNationalTeam = baseKind === "nationalTeam";
  const [tab, setTab] = useState("overview");

  const titlesCount = palmares.reduce((sum, entry) => sum + entry.count, 0);
  const lastSeason = seasons[0]; // seasons já vem ordenado startYear desc

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          {isNationalTeam && <TabsTrigger value="competitions">Competições</TabsTrigger>}
          <TabsTrigger value="seasons">{isNationalTeam ? "Convocações" : "Temporadas"}</TabsTrigger>
          <TabsTrigger value="coaches">Técnicos</TabsTrigger>
          {!isNationalTeam && <TabsTrigger value="titles">Títulos</TabsTrigger>}
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && (
        <SquadOverviewTab
          isNationalTeam={isNationalTeam}
          titlesCount={titlesCount}
          seasonsCount={seasons.length}
          lastCoachName={lastSeason?.coachName ?? null}
          lastSeasonLabel={lastSeason ? formatSeasonLabel(lastSeason.startYear, seasonCalendar) : null}
          currentPlayers={currentPlayers}
        />
      )}

      {tab === "competitions" && isNationalTeam && (
        <NationalTeamCompetitionsTab squadId={squadId} tree={convocationTree} seasonCalendar={seasonCalendar} />
      )}

      {tab === "seasons" && (
        <SeasonsSection
          squadId={squadId}
          seasonCalendar={seasonCalendar}
          isNationalTeam={isNationalTeam}
          seasons={seasons}
        />
      )}

      {tab === "coaches" && <ClubCoachesTab coaches={coachesUsed} />}

      {tab === "titles" && !isNationalTeam && <PalmaresCard entries={palmares} />}

      {tab === "history" && (
        <FullHistoryView
          topScorers={historicalStats.topScorers}
          topAssists={historicalStats.topAssists}
          mostAppearances={historicalStats.mostAppearances}
          topBuys={topTransfers.topBuys}
          topSales={topTransfers.topSales}
          seasonCalendar={seasonCalendar}
        />
      )}
    </div>
  );
}
