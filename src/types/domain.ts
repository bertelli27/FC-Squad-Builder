export interface Player {
  id: string; // id interno (do cache)
  source: string;
  externalId: string;
  name: string;
  photoUrl?: string;
  nationality?: string;
  position?: string;
  club?: string;
  league?: string;
  overall?: number;
  potential?: number;
  age?: number;
  attributes?: Record<string, number>; // crossing, dribbling, etc.
  externalLink?: string; // link externo (ex: ogol, transfermarket), informado manualmente para jogadores "custom"
}

export interface Club {
  id: string;
  source: string;
  externalId: string;
  name: string;
  league?: string;
  country?: string;
  logoUrl?: string;
}

export interface NationalTeam {
  id: string;
  source: string;
  externalId: string;
  name: string;
  flagUrl?: string;
}
