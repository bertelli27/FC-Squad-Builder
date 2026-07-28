import type { Player } from "@/types/domain";
import {
  normalizeApiFootballClub,
  normalizeApiFootballNationalTeam,
  normalizeApiFootballPlayerDetail,
  normalizeApiFootballSquadPlayer,
  type ApiFootballLeague,
  type ApiFootballPlayerDetail,
  type ApiFootballSquadResult,
  type ApiFootballTeamSearchResult,
} from "@/lib/normalizers/api-football.normalizer";
import { apiFootballGet } from "./api-football.client";
import type {
  ClubProvider,
  NationalTeamProvider,
  PlayerProvider,
  PlayerSearchFilters,
} from "./provider.interface";

// The free API-Football plan only serves the /players endpoint (detailed
// profile: nationality, birth date, height/weight) for seasons 2022-2024.
// Squad rosters (/players/squads) are unaffected and always current.
const FREE_TIER_PLAYER_SEASON = 2023;

async function fetchCurrentLeagueName(teamId: string): Promise<string | undefined> {
  const leagues = await apiFootballGet<ApiFootballLeague[]>("/leagues", {
    team: teamId,
    current: true,
  });
  return leagues[0]?.league.name;
}

export const apiFootballClubProvider: ClubProvider = {
  async searchClubs(query) {
    const results = await apiFootballGet<ApiFootballTeamSearchResult[]>("/teams", {
      search: query,
    });
    return results.filter((r) => !r.team.national).map((r) => normalizeApiFootballClub(r.team));
  },

  async fetchClub(externalId) {
    const results = await apiFootballGet<ApiFootballTeamSearchResult[]>("/teams", {
      id: externalId,
    });
    const team = results[0]?.team;
    if (!team) return null;

    const league = await fetchCurrentLeagueName(externalId);
    return normalizeApiFootballClub(team, league);
  },

  async fetchClubSquad(externalId) {
    return fetchSquad(externalId);
  },
};

export const apiFootballNationalTeamProvider: NationalTeamProvider = {
  async searchNationalTeams(query) {
    const results = await apiFootballGet<ApiFootballTeamSearchResult[]>("/teams", {
      search: query,
    });
    return results.filter((r) => r.team.national).map((r) => normalizeApiFootballNationalTeam(r.team));
  },

  async fetchNationalTeamSquad(externalId) {
    return fetchSquad(externalId);
  },
};

async function fetchSquad(teamId: string): Promise<Player[]> {
  const results = await apiFootballGet<ApiFootballSquadResult[]>("/players/squads", {
    team: teamId,
  });
  const squad = results[0];
  if (!squad) return [];
  return squad.players.map((p) => normalizeApiFootballSquadPlayer(p, squad.team.name));
}

export const apiFootballPlayerProvider: PlayerProvider = {
  // API-Football's free tier only supports name-based player search
  // (min 3 characters); other filters are not applied here.
  async searchPlayers(filters: PlayerSearchFilters) {
    if (!filters.name || filters.name.trim().length < 3) return [];

    const results = await apiFootballGet<{ player: ApiFootballPlayerDetail }[]>("/players", {
      search: filters.name,
      season: FREE_TIER_PLAYER_SEASON,
    });
    return results.map((r) => normalizeApiFootballPlayerDetail(r.player));
  },

  async fetchPlayer(externalId) {
    const results = await apiFootballGet<{ player: ApiFootballPlayerDetail }[]>("/players", {
      id: externalId,
      season: FREE_TIER_PLAYER_SEASON,
    });
    const player = results[0]?.player;
    return player ? normalizeApiFootballPlayerDetail(player) : null;
  },
};
