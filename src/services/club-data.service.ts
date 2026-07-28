import { cachedClubToDomain, toJson } from "@/lib/cache-mappers";
import { API_FOOTBALL_SOURCE } from "@/lib/normalizers/api-football.normalizer";
import { THESPORTSDB_SOURCE } from "@/lib/normalizers/thesportsdb.normalizer";
import { cacheRepository, defaultExpiresAt } from "@/repositories/cache.repository";
import { apiFootballClubProvider } from "./providers/api-football.provider";
import { theSportsDbClubProvider } from "./providers/thesportsdb.provider";
import { providerRegistry } from "./provider-registry";
import { cachePlayer } from "./player-data.service";
import type { Club, Player } from "@/types/domain";
import type { ClubProvider } from "./providers/provider.interface";

const CLUB_PROVIDERS: Record<string, ClubProvider> = {
  [API_FOOTBALL_SOURCE]: apiFootballClubProvider,
  [THESPORTSDB_SOURCE]: theSportsDbClubProvider,
};

async function cacheClub(club: Club): Promise<void> {
  await cacheRepository.upsertClub(club.source, club.externalId, {
    name: club.name,
    league: club.league,
    country: club.country,
    logoUrl: club.logoUrl,
    rawData: toJson(club),
    expiresAt: defaultExpiresAt(),
  });
}

export const clubDataService = {
  /** Live search — not cached, since a free-text query isn't a stable cache key. */
  async searchClubs(query: string): Promise<Club[]> {
    return providerRegistry.searchClubs(query);
  },

  /** Cache-first single club fetch, namespaced by source. */
  async getClub(source: string, externalId: string): Promise<Club | null> {
    const cached = await cacheRepository.getClub(source, externalId);
    if (cached) return cachedClubToDomain(cached);

    const provider = CLUB_PROVIDERS[source];
    if (!provider) return null;

    const club = await provider.fetchClub(externalId);
    if (club) await cacheClub(club);
    return club;
  },

  /** Full cross-source merge by name (API-Football + TheSportsDB). Used when creating a squad from a club search result. */
  async resolveClub(query: string): Promise<Club | null> {
    const club = await providerRegistry.resolveClub(query);
    if (club) await cacheClub(club);
    return club;
  },

  /** Resolves a club's current squad and caches each player so later getPlayer() calls for them hit cache. */
  async getClubSquad(club: Club): Promise<Player[]> {
    const squad = await providerRegistry.resolveClubSquad(club);
    await Promise.all(squad.map(cachePlayer));
    return squad;
  },
};
