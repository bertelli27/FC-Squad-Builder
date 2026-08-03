import type {
  CachedClub,
  CachedNationalTeam,
  CachedPlayer,
  Prisma,
} from "@/generated/prisma/client";
import type { Club, NationalTeam, Player } from "@/types/domain";

// Domain DTOs don't have the index signature Prisma's Json input types
// require; round-tripping through JSON also strips `undefined` fields,
// which Prisma's Json columns can't store anyway.
export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

// Cached rows don't carry a player's detailed attribute map (no column for
// it — see PlayerDataService) so it's always omitted here. Callers that
// need attributes go through the Kaggle provider directly, which is an
// in-memory lookup and therefore cheap enough to skip caching for.
export function cachedPlayerToDomain(row: CachedPlayer): Player {
  return {
    id: `${row.source}:${row.externalId}`,
    source: row.source,
    externalId: row.externalId,
    name: row.name,
    photoUrl: row.photoUrl ?? undefined,
    nationality: row.nationality ?? undefined,
    position: row.position ?? undefined,
    club: row.club ?? undefined,
    league: row.league ?? undefined,
    overall: row.overall ?? undefined,
    potential: row.potential ?? undefined,
    age: row.age ?? undefined,
    dateOfBirth: row.dateOfBirth ? row.dateOfBirth.toISOString() : undefined,
    secondaryPositions: row.secondaryPositions.length > 0 ? row.secondaryPositions : undefined,
    externalLink: row.externalLink ?? undefined,
  };
}

export function cachedClubToDomain(row: CachedClub): Club {
  return {
    id: `${row.source}:${row.externalId}`,
    source: row.source,
    externalId: row.externalId,
    name: row.name,
    league: row.league ?? undefined,
    country: row.country ?? undefined,
    logoUrl: row.logoUrl ?? undefined,
  };
}

export function cachedNationalTeamToDomain(row: CachedNationalTeam): NationalTeam {
  return {
    id: `${row.source}:${row.externalId}`,
    source: row.source,
    externalId: row.externalId,
    name: row.name,
    flagUrl: row.flagUrl ?? undefined,
  };
}
