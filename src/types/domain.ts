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
  dateOfBirth?: string; // ISO date — quando presente, prefira lib/player-age.ts a `age` (§4/5, etapa 6)
  secondaryPositions?: string[]; // até 3, além de `position` (§2, etapa 6)
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
