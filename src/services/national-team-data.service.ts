import { cachedNationalTeamToDomain, toJson } from "@/lib/cache-mappers";
import { cacheRepository, defaultExpiresAt } from "@/repositories/cache.repository";
import { providerRegistry } from "./provider-registry";
import { cachePlayer } from "./player-data.service";
import type { NationalTeam, Player } from "@/types/domain";

async function cacheNationalTeam(team: NationalTeam): Promise<void> {
  await cacheRepository.upsertNationalTeam(team.source, team.externalId, {
    name: team.name,
    flagUrl: team.flagUrl,
    rawData: toJson(team),
    expiresAt: defaultExpiresAt(),
  });
}

export const nationalTeamDataService = {
  /** Live search — not cached, since a free-text query isn't a stable cache key. */
  async searchNationalTeams(query: string): Promise<NationalTeam[]> {
    return providerRegistry.searchNationalTeams(query);
  },

  /**
   * Cache-only lookup by id. Unlike ClubProvider, NationalTeamProvider has
   * no `fetchNationalTeam(externalId)` (see provider.interface.ts) — only
   * name search and squad fetch — so there's no live source to fall back
   * to here. Callers wanting a specific team should go through
   * `resolveNationalTeam(name)`, which populates this cache as a side
   * effect.
   */
  async getNationalTeam(source: string, externalId: string): Promise<NationalTeam | null> {
    const cached = await cacheRepository.getNationalTeam(source, externalId);
    return cached ? cachedNationalTeamToDomain(cached) : null;
  },

  /** Full cross-source merge by name (API-Football + TheSportsDB, incl. flag). */
  async resolveNationalTeam(query: string): Promise<NationalTeam | null> {
    const team = await providerRegistry.resolveNationalTeam(query);
    if (team) await cacheNationalTeam(team);
    return team;
  },

  /** Resolves a national team's current squad and caches each player. */
  async getNationalTeamSquad(team: NationalTeam): Promise<Player[]> {
    const squad = await providerRegistry.resolveNationalTeamSquad(team);
    await Promise.all(squad.map(cachePlayer));
    return squad;
  },
};
