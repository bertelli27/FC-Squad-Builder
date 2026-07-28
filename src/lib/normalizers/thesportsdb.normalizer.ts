import type { Club, NationalTeam, Player } from "@/types/domain";

export const THESPORTSDB_SOURCE = "thesportsdb";

// ── Raw response shapes (only the fields this app consumes) ──────────────

export interface TheSportsDbTeam {
  idTeam: string;
  strTeam: string;
  strLeague: string | null;
  strCountry: string | null;
  strBadge: string | null;
}

export interface TheSportsDbPlayer {
  idPlayer: string;
  strPlayer: string;
  strTeam: string | null;
  strNationality: string | null;
  strPosition: string | null;
  strThumb: string | null;
  dateBorn: string | null;
}

export interface TheSportsDbCountry {
  name_en: string;
  flag_url_32: string;
}

// ── Normalizers ────────────────────────────────────────────────────────

export function normalizeTheSportsDbClub(raw: TheSportsDbTeam): Club {
  return {
    id: `${THESPORTSDB_SOURCE}:${raw.idTeam}`,
    source: THESPORTSDB_SOURCE,
    externalId: raw.idTeam,
    name: raw.strTeam,
    league: raw.strLeague ?? undefined,
    country: raw.strCountry ?? undefined,
    logoUrl: raw.strBadge ?? undefined,
  };
}

export function normalizeTheSportsDbNationalTeam(
  raw: TheSportsDbTeam,
  flagUrl?: string,
): NationalTeam {
  return {
    id: `${THESPORTSDB_SOURCE}:${raw.idTeam}`,
    source: THESPORTSDB_SOURCE,
    externalId: raw.idTeam,
    name: raw.strTeam,
    flagUrl: flagUrl ?? raw.strBadge ?? undefined,
  };
}

function parseAge(dateBorn: string | null): number | undefined {
  if (!dateBorn) return undefined;
  const birth = new Date(dateBorn);
  if (Number.isNaN(birth.getTime())) return undefined;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function normalizeTheSportsDbPlayer(raw: TheSportsDbPlayer): Player {
  return {
    id: `${THESPORTSDB_SOURCE}:${raw.idPlayer}`,
    source: THESPORTSDB_SOURCE,
    externalId: raw.idPlayer,
    name: raw.strPlayer,
    photoUrl: raw.strThumb ?? undefined,
    nationality: raw.strNationality ?? undefined,
    position: raw.strPosition ?? undefined,
    club: raw.strTeam ?? undefined,
    age: parseAge(raw.dateBorn),
  };
}
