export interface CareerCompetitionRef {
  id: string;
  name: string;
  trophyImageUrl: string | null;
}

export interface CareerTitleVM {
  id: string;
  competition: CareerCompetitionRef;
}

export interface CareerCompetitionStatsVM {
  id: string;
  competition: CareerCompetitionRef;
  appearances: number;
  goals: number;
  assists: number;
}

export interface CareerStintVM {
  id: string;
  kind: string; // "club" | "nationalTeam"
  seasonId: string | null;
  clubName: string;
  clubLogoUrl: string | null;
  startYear: number;
  calendar: string;
  appearances: number;
  goals: number;
  assists: number;
  summary: string | null;
  order: number;
  titles: CareerTitleVM[];
  competitionStats: CareerCompetitionStatsVM[];
}

export interface CareerTransferVM {
  id: string;
  fromClubName: string | null;
  toClubName: string;
  value: number | null;
  year: number;
  order: number;
}
