import type { Club, NationalTeam, Player } from "@/types/domain";

export interface PlayerSearchFilters {
  name?: string;
  position?: string;
  nationality?: string;
  club?: string;
  league?: string;
  minOverall?: number;
  maxOverall?: number;
  minPotential?: number;
  maxPotential?: number;
  minAge?: number;
  maxAge?: number;
}

export interface PlayerProvider {
  searchPlayers(query: PlayerSearchFilters): Promise<Player[]>;
  fetchPlayer(externalId: string): Promise<Player | null>;
}

export interface ClubProvider {
  searchClubs(query: string): Promise<Club[]>;
  fetchClub(externalId: string): Promise<Club | null>;
  fetchClubSquad(externalId: string): Promise<Player[]>;
}

export interface NationalTeamProvider {
  searchNationalTeams(query: string): Promise<NationalTeam[]>;
  fetchNationalTeamSquad(externalId: string): Promise<Player[]>;
}
