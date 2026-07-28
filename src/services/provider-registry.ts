import type { Club, NationalTeam, Player } from "@/types/domain";
import { kaggleRatingsProvider } from "./providers/kaggle-ratings.provider";
import {
  apiFootballClubProvider,
  apiFootballNationalTeamProvider,
  apiFootballPlayerProvider,
} from "./providers/api-football.provider";
import {
  theSportsDbClubProvider,
  theSportsDbNationalTeamProvider,
  theSportsDbPlayerProvider,
} from "./providers/thesportsdb.provider";

// Resolve failures (network error, rate limit, schema change) never bubble
// up — a source that fails is treated as "no data from this source" so the
// next one in priority order still gets a chance.
async function safeSearch<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

async function safeFetch<T>(fn: () => Promise<T | null>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

// Merges objects left-to-right: the first source to define a given field
// wins it. Because each source only sets the fields it actually has (e.g.
// only the Kaggle dataset has `overall`/`attributes`, only API-Football and
// TheSportsDB have `photoUrl`), a single ordered merge naturally reproduces
// the per-field priority table in CLAUDE.md §3.4 without special-casing
// individual fields.
function pickDefined<T extends object>(...sources: Array<T | null | undefined>): T | null {
  let result: Partial<T> | null = null;
  for (const source of sources) {
    if (!source) continue;
    result ??= {};
    for (const key of Object.keys(source) as (keyof T)[]) {
      const value = source[key];
      if (result[key] === undefined && value !== undefined) {
        result[key] = value;
      }
    }
  }
  return result as T | null;
}

// Prefers the candidate whose club matches the given hint; falls back to
// the first result (best-effort ranking from the source itself) otherwise.
function pickBestMatch(candidates: Player[], context?: { club?: string }): Player | undefined {
  if (context?.club) {
    const clubMatch = candidates.find(
      (c) => c.club?.toLowerCase() === context.club!.toLowerCase(),
    );
    if (clubMatch) return clubMatch;
  }
  return candidates[0];
}

export const providerRegistry = {
  /**
   * Base player catalog search. The Kaggle dataset is the only source with
   * ratings/attributes and covers ~16k players, so it's used as-is rather
   * than merged per-result (merging would mean one API-Football/TheSportsDB
   * call per search result, which the 100 req/day free tier can't sustain).
   */
  async searchPlayers(filters: Parameters<typeof kaggleRatingsProvider.searchPlayers>[0]) {
    return kaggleRatingsProvider.searchPlayers(filters);
  },

  /**
   * Full field-level merge for a single player, by name, across all three
   * sources (§3.4): ratings/attributes from Kaggle, photo/nationality
   * gaps filled from API-Football then TheSportsDB. Intended for
   * enriching one player at a time (e.g. adding to a squad, viewing a
   * profile) — not for bulk search results.
   *
   * None of these sources share a common player id, so candidates are
   * matched by name alone, which is ambiguous for common surnames (e.g.
   * "Benassi" matches both a Coritiba goalkeeper and an unrelated Italian
   * midfielder). Pass `context.club` whenever it's known — typically it
   * is, since this is normally called to enrich a player found via
   * `resolveClubSquad`/`resolveNationalTeamSquad` — to prefer the
   * candidate from the right club over just the first search hit.
   */
  async resolvePlayer(name: string, context?: { club?: string }): Promise<Player | null> {
    const [kaggle, apiFootball, theSportsDb] = await Promise.all([
      safeSearch(() => kaggleRatingsProvider.searchPlayers({ name })),
      safeSearch(() => apiFootballPlayerProvider.searchPlayers({ name })),
      safeSearch(() => theSportsDbPlayerProvider.searchPlayers({ name })),
    ]);
    return pickDefined<Player>(
      pickBestMatch(kaggle, context),
      pickBestMatch(apiFootball, context),
      pickBestMatch(theSportsDb, context),
    );
  },

  async searchClubs(query: string): Promise<Club[]> {
    const apiFootball = await safeSearch(() => apiFootballClubProvider.searchClubs(query));
    if (apiFootball.length > 0) return apiFootball;
    return safeSearch(() => theSportsDbClubProvider.searchClubs(query));
  },

  /** Resolves one club by name, merging API-Football (incl. current league) with TheSportsDB. */
  async resolveClub(query: string): Promise<Club | null> {
    const matches = await safeSearch(() => apiFootballClubProvider.searchClubs(query));
    const apiFootball = matches[0]
      ? await safeFetch(() => apiFootballClubProvider.fetchClub(matches[0].externalId))
      : null;

    const theSportsDbMatches = await safeSearch(() => theSportsDbClubProvider.searchClubs(query));
    return pickDefined<Club>(apiFootball, theSportsDbMatches[0]);
  },

  /** Fetches a resolved club's squad, falling back to TheSportsDB by name if the primary source has nothing. */
  async resolveClubSquad(club: Club): Promise<Player[]> {
    if (club.source === "api-football") {
      const squad = await safeSearch(() => apiFootballClubProvider.fetchClubSquad(club.externalId));
      if (squad.length > 0) return squad;
    }

    const fallback = await safeSearch(() => theSportsDbClubProvider.searchClubs(club.name));
    if (!fallback[0]) return [];
    return safeSearch(() => theSportsDbClubProvider.fetchClubSquad(fallback[0].externalId));
  },

  async searchNationalTeams(query: string): Promise<NationalTeam[]> {
    const apiFootball = await safeSearch(() =>
      apiFootballNationalTeamProvider.searchNationalTeams(query),
    );
    if (apiFootball.length > 0) return apiFootball;
    return safeSearch(() => theSportsDbNationalTeamProvider.searchNationalTeams(query));
  },

  /** Resolves one national team by name, merging API-Football with TheSportsDB (incl. flag). */
  async resolveNationalTeam(query: string): Promise<NationalTeam | null> {
    const [apiFootball, theSportsDb] = await Promise.all([
      safeSearch(() => apiFootballNationalTeamProvider.searchNationalTeams(query)),
      safeSearch(() => theSportsDbNationalTeamProvider.searchNationalTeams(query)),
    ]);
    return pickDefined<NationalTeam>(apiFootball[0], theSportsDb[0]);
  },

  /** Fetches a resolved national team's squad, falling back to TheSportsDB by name. */
  async resolveNationalTeamSquad(team: NationalTeam): Promise<Player[]> {
    if (team.source === "api-football") {
      const squad = await safeSearch(() =>
        apiFootballNationalTeamProvider.fetchNationalTeamSquad(team.externalId),
      );
      if (squad.length > 0) return squad;
    }

    const fallback = await safeSearch(() =>
      theSportsDbNationalTeamProvider.searchNationalTeams(team.name),
    );
    if (!fallback[0]) return [];
    return safeSearch(() =>
      theSportsDbNationalTeamProvider.fetchNationalTeamSquad(fallback[0].externalId),
    );
  },
};
