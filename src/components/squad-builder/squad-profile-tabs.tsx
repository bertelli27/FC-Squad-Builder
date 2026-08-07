"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatSeasonLabel } from "@/lib/season";
import { SquadOverviewTab, type SquadOverviewData } from "./squad-overview-tab";
import { SeasonsSection, type SeasonCardData } from "./seasons-section";
import { ClubPlayersTab, type HistoricalPlayerData } from "./club-players-tab";
import { ClubCoachesTab, type CoachUsedData } from "./club-coaches-tab";
import { ClubTransfersTab, type ClubTransferData } from "./club-transfers-tab";
import { ClubCompetitionsTab, type CompetitionPlayedData } from "./club-competitions-tab";
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
 */
export function SquadProfileTabs({
  squadId,
  baseKind,
  seasonCalendar,
  overview,
  seasons,
  palmares,
  currentPlayers,
  allPlayers,
  coachesUsed,
  allTransfers,
  competitionsPlayed,
  convocationTree,
  historicalStats,
  topTransfers,
}: {
  squadId: string;
  baseKind: string | null;
  seasonCalendar: string;
  overview: SquadOverviewData;
  seasons: SeasonCardData[];
  palmares: PalmaresEntry[];
  currentPlayers: CurrentPlayerData[];
  allPlayers: HistoricalPlayerData[];
  coachesUsed: CoachUsedData[];
  allTransfers: ClubTransferData[];
  competitionsPlayed: CompetitionPlayedData[];
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
          <TabsTrigger value="players">Jogadores</TabsTrigger>
          <TabsTrigger value="coaches">Técnicos</TabsTrigger>
          {!isNationalTeam && <TabsTrigger value="transfers">Transferências</TabsTrigger>}
          {!isNationalTeam && <TabsTrigger value="competitions">Competições</TabsTrigger>}
          {!isNationalTeam && <TabsTrigger value="titles">Títulos</TabsTrigger>}
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && (
        <SquadOverviewTab
          squad={overview}
          currentPlayersCount={currentPlayers.length}
          totalPlayersCount={allPlayers.length}
          seasonsCount={seasons.length}
          titlesCount={titlesCount}
          lastCoachName={lastSeason?.coachName ?? null}
          lastSeasonLabel={lastSeason ? formatSeasonLabel(lastSeason.startYear, seasonCalendar) : null}
        />
      )}

      {tab === "competitions" &&
        (isNationalTeam ? (
          <NationalTeamCompetitionsTab squadId={squadId} tree={convocationTree} seasonCalendar={seasonCalendar} />
        ) : (
          <ClubCompetitionsTab competitions={competitionsPlayed} />
        ))}

      {tab === "seasons" && (
        <SeasonsSection
          squadId={squadId}
          seasonCalendar={seasonCalendar}
          isNationalTeam={isNationalTeam}
          seasons={seasons}
        />
      )}

      {tab === "players" && <ClubPlayersTab currentPlayers={currentPlayers} allPlayers={allPlayers} />}

      {tab === "coaches" && <ClubCoachesTab coaches={coachesUsed} />}

      {tab === "transfers" && !isNationalTeam && (
        <ClubTransfersTab transfers={allTransfers} seasonCalendar={seasonCalendar} />
      )}

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
