import type { Club, NationalTeam, Player } from "@/types/domain";

export const API_FOOTBALL_SOURCE = "api-football";

// ── Raw response shapes (only the fields this app consumes) ──────────────

export interface ApiFootballTeam {
  id: number;
  name: string;
  code: string | null;
  country: string | null;
  founded: number | null;
  national: boolean;
  logo: string | null;
}

export interface ApiFootballTeamSearchResult {
  team: ApiFootballTeam;
}

export interface ApiFootballLeague {
  league: { id: number; name: string; type: string; logo: string | null };
  country: { name: string; code: string | null; flag: string | null };
}

export interface ApiFootballSquadPlayer {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string | null;
  photo: string | null;
}

export interface ApiFootballSquadResult {
  team: { id: number; name: string; logo: string | null };
  players: ApiFootballSquadPlayer[];
}

export interface ApiFootballPlayerDetail {
  id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  age: number | null;
  birth: { date: string | null; place: string | null; country: string | null };
  nationality: string | null;
  height: string | null;
  weight: string | null;
  photo: string | null;
}

// ── Normalizers ────────────────────────────────────────────────────────

export function normalizeApiFootballClub(raw: ApiFootballTeam, league?: string): Club {
  return {
    id: `${API_FOOTBALL_SOURCE}:${raw.id}`,
    source: API_FOOTBALL_SOURCE,
    externalId: String(raw.id),
    name: raw.name,
    league,
    country: raw.country ?? undefined,
    logoUrl: raw.logo ?? undefined,
  };
}

export function normalizeApiFootballNationalTeam(raw: ApiFootballTeam): NationalTeam {
  return {
    id: `${API_FOOTBALL_SOURCE}:${raw.id}`,
    source: API_FOOTBALL_SOURCE,
    externalId: String(raw.id),
    name: raw.name,
    flagUrl: raw.logo ?? undefined,
  };
}

// From /players/squads?team={id} — cheap (1 request per club/national team),
// but does not include nationality or ratings. Used to seed a club/national
// team roster; ratings/nationality are filled in from other sources.
export function normalizeApiFootballSquadPlayer(raw: ApiFootballSquadPlayer, club: string): Player {
  return {
    id: `${API_FOOTBALL_SOURCE}:${raw.id}`,
    source: API_FOOTBALL_SOURCE,
    externalId: String(raw.id),
    name: raw.name,
    photoUrl: raw.photo ?? undefined,
    position: raw.position ?? undefined,
    club,
  };
}

// From /players?id={id}&season={year} — one request per player, richer
// profile (nationality, birth date, height/weight). Use sparingly.
export function normalizeApiFootballPlayerDetail(raw: ApiFootballPlayerDetail): Player {
  return {
    id: `${API_FOOTBALL_SOURCE}:${raw.id}`,
    source: API_FOOTBALL_SOURCE,
    externalId: String(raw.id),
    name: raw.name,
    photoUrl: raw.photo ?? undefined,
    nationality: raw.nationality ?? undefined,
    age: raw.age ?? undefined,
  };
}
