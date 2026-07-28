import {
  normalizeTheSportsDbClub,
  normalizeTheSportsDbNationalTeam,
  normalizeTheSportsDbPlayer,
  type TheSportsDbCountry,
  type TheSportsDbPlayer,
  type TheSportsDbTeam,
} from "@/lib/normalizers/thesportsdb.normalizer";
import { theSportsDbGet } from "./thesportsdb.client";
import type { ClubProvider, NationalTeamProvider, PlayerProvider } from "./provider.interface";

let countriesCache: TheSportsDbCountry[] | null = null;

async function fetchFlagUrl(countryName: string): Promise<string | undefined> {
  if (!countriesCache) {
    const result = await theSportsDbGet<{ countries: TheSportsDbCountry[] | null }>(
      "/all_countries.php",
    );
    countriesCache = result.countries ?? [];
  }
  return countriesCache.find((c) => c.name_en === countryName)?.flag_url_32;
}

export const theSportsDbClubProvider: ClubProvider = {
  async searchClubs(query) {
    const result = await theSportsDbGet<{ teams: TheSportsDbTeam[] | null }>(
      "/searchteams.php",
      { t: query },
    );
    return (result.teams ?? []).map(normalizeTheSportsDbClub);
  },

  async fetchClub(externalId) {
    const result = await theSportsDbGet<{ teams: TheSportsDbTeam[] | null }>("/lookupteam.php", {
      id: externalId,
    });
    const team = result.teams?.[0];
    return team ? normalizeTheSportsDbClub(team) : null;
  },

  async fetchClubSquad(externalId) {
    return fetchSquad(externalId);
  },
};

// TheSportsDB's team search doesn't distinguish clubs from national teams,
// so this returns whatever matches the name. It exists to satisfy the
// NationalTeamProvider contract; in practice a national team's id is
// already known (resolved via API-Football) before this is used as a
// badge/flag fallback.
export const theSportsDbNationalTeamProvider: NationalTeamProvider = {
  async searchNationalTeams(query) {
    const result = await theSportsDbGet<{ teams: TheSportsDbTeam[] | null }>(
      "/searchteams.php",
      { t: query },
    );
    const teams = result.teams ?? [];
    const flags = await Promise.all(
      teams.map((t) => (t.strCountry ? fetchFlagUrl(t.strCountry) : undefined)),
    );
    return teams.map((team, i) => normalizeTheSportsDbNationalTeam(team, flags[i]));
  },

  async fetchNationalTeamSquad(externalId) {
    return fetchSquad(externalId);
  },
};

async function fetchSquad(teamId: string) {
  const result = await theSportsDbGet<{ player: TheSportsDbPlayer[] | null }>(
    "/lookup_all_players.php",
    { id: teamId },
  );
  return (result.player ?? []).map(normalizeTheSportsDbPlayer);
}

export const theSportsDbPlayerProvider: PlayerProvider = {
  // Only the name filter is supported; TheSportsDB's search endpoint takes
  // a single free-text player name.
  async searchPlayers(filters) {
    if (!filters.name) return [];
    const result = await theSportsDbGet<{ player: TheSportsDbPlayer[] | null }>(
      "/searchplayers.php",
      { p: filters.name },
    );
    return (result.player ?? []).map(normalizeTheSportsDbPlayer);
  },

  async fetchPlayer(externalId) {
    const result = await theSportsDbGet<{ players: TheSportsDbPlayer[] | null }>(
      "/lookupplayer.php",
      { id: externalId },
    );
    const player = result.players?.[0];
    return player ? normalizeTheSportsDbPlayer(player) : null;
  },
};
