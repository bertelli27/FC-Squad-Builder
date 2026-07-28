import { prisma } from "@/lib/prisma";
import type {
  CachedClub,
  CachedNationalTeam,
  CachedPlayer,
  Prisma,
} from "@/generated/prisma/client";

const DEFAULT_TTL_DAYS = 30;

export function defaultExpiresAt(ttlDays = DEFAULT_TTL_DAYS): Date {
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

export const cacheRepository = {
  async getPlayer(source: string, externalId: string): Promise<CachedPlayer | null> {
    const player = await prisma.cachedPlayer.findUnique({
      where: { source_externalId: { source, externalId } },
    });
    return player && player.expiresAt > new Date() ? player : null;
  },

  async upsertPlayer(
    source: string,
    externalId: string,
    data: Omit<Prisma.CachedPlayerCreateInput, "source" | "externalId">,
  ): Promise<CachedPlayer> {
    return prisma.cachedPlayer.upsert({
      where: { source_externalId: { source, externalId } },
      create: { source, externalId, ...data },
      update: data,
    });
  },

  async getClub(source: string, externalId: string): Promise<CachedClub | null> {
    const club = await prisma.cachedClub.findUnique({
      where: { source_externalId: { source, externalId } },
    });
    return club && club.expiresAt > new Date() ? club : null;
  },

  async upsertClub(
    source: string,
    externalId: string,
    data: Omit<Prisma.CachedClubCreateInput, "source" | "externalId">,
  ): Promise<CachedClub> {
    return prisma.cachedClub.upsert({
      where: { source_externalId: { source, externalId } },
      create: { source, externalId, ...data },
      update: data,
    });
  },

  async getNationalTeam(
    source: string,
    externalId: string,
  ): Promise<CachedNationalTeam | null> {
    const team = await prisma.cachedNationalTeam.findUnique({
      where: { source_externalId: { source, externalId } },
    });
    return team && team.expiresAt > new Date() ? team : null;
  },

  async upsertNationalTeam(
    source: string,
    externalId: string,
    data: Omit<Prisma.CachedNationalTeamCreateInput, "source" | "externalId">,
  ): Promise<CachedNationalTeam> {
    return prisma.cachedNationalTeam.upsert({
      where: { source_externalId: { source, externalId } },
      create: { source, externalId, ...data },
      update: data,
    });
  },
};
