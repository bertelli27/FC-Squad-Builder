import { prisma } from "@/lib/prisma";
import { clubDataService } from "./club-data.service";
import { nationalTeamDataService } from "./national-team-data.service";
import { tagService } from "./tag.service";
import { seasonService } from "./season.service";
import type { Player } from "@/types/domain";

export interface CreateSquadInput {
  name: string;
  formation?: string;
  /** Auto-loads the base roster from a club or national team, by name (re-resolved live so this doesn't depend on prior cache state). */
  base?: { kind: "club" | "nationalTeam"; name: string };
  categoryId?: string | null;
  /** Tag names — resolved/created via tagService.findOrCreateTags and connected. */
  tagNames?: string[];
  /** First season's year — defaults to the current calendar year. */
  startYear?: number;
}

async function resolveBase(
  base: NonNullable<CreateSquadInput["base"]>,
): Promise<{ externalId: string; logoUrl?: string; players: Player[] } | null> {
  if (base.kind === "club") {
    const club = await clubDataService.resolveClub(base.name);
    if (!club) return null;
    return {
      externalId: club.externalId,
      logoUrl: club.logoUrl,
      players: await clubDataService.getClubSquad(club),
    };
  }

  const team = await nationalTeamDataService.resolveNationalTeam(base.name);
  if (!team) return null;
  return {
    externalId: team.externalId,
    logoUrl: team.flagUrl,
    players: await nationalTeamDataService.getNationalTeamSquad(team),
  };
}

export const squadService = {
  /**
   * All clubs with just enough to power the home page's cards and its
   * client-side favorite/category/tag/search filtering (§V2), plus their
   * most recent season (for the formation/player-count shown on the card)
   * — no need for full rosters here, that's what getSquad/getSeason are for.
   */
  async listSquads() {
    return prisma.squad.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        category: true,
        tags: true,
        _count: { select: { seasons: true } },
        seasons: {
          orderBy: { startYear: "desc" },
          take: 1,
          include: { _count: { select: { players: { where: { isWatchlist: false, isExtra: false } } } } },
        },
      },
    });
  },

  /** Club overview: identity + organizational metadata + the list of seasons (no player rosters — see seasonService.getSeason for that). */
  async getSquad(id: string) {
    return prisma.squad.findUnique({
      where: { id },
      include: {
        category: true,
        tags: true,
        seasons: {
          orderBy: { startYear: "desc" },
          include: { _count: { select: { players: { where: { isWatchlist: false, isExtra: false } } } } },
        },
      },
    });
  },

  /**
   * Creates a club and its first season, optionally auto-loading the
   * season's base roster (§1: "carregando o elenco base automaticamente")
   * from a real club/national team.
   *
   * If loaded from a real club/national team, its badge/flag is copied
   * into `logoUrl` as a one-time convenience default — never re-fetched
   * live afterward (see updateSquad for editing it, including for
   * from-scratch clubs that never had one to begin with).
   */
  async createSquad(input: CreateSquadInput) {
    const resolved = input.base ? await resolveBase(input.base) : null;
    const formation = input.formation ?? "4-3-3";
    const tags = input.tagNames?.length ? await tagService.findOrCreateTags(input.tagNames) : [];
    const startYear = input.startYear ?? new Date().getFullYear();

    const squad = await prisma.squad.create({
      data: {
        name: input.name,
        baseClubRef: resolved?.externalId,
        baseKind: input.base?.kind ?? null,
        logoUrl: resolved?.logoUrl,
        categoryId: input.categoryId,
        tags: tags.length ? { connect: tags.map((t) => ({ id: t.id })) } : undefined,
      },
    });

    const season = await seasonService.createInitialSeason(squad.id, {
      startYear,
      formation,
      isNationalTeam: input.base?.kind === "nationalTeam",
      players: resolved?.players ?? [],
    });

    return { squad, season };
  },

  async updateSquad(
    id: string,
    data: {
      name?: string;
      logoUrl?: string | null;
      isFavorite?: boolean;
      categoryId?: string | null;
      /** Full replace: the club's tags become exactly this set (undefined leaves tags untouched). */
      tagNames?: string[];
      /**
       * "club" | "nationalTeam" | null — normally set once at creation and
       * left alone, but exposed as editable so a club created before this
       * concept existed can retroactively unlock the observados/elenco
       * ampliado areas without losing anything already customized on it.
       */
      baseKind?: string | null;
      /** Hex identity color (§12), or null to go back to the default theme. */
      primaryColor?: string | null;
      /** "brasileiro" | "europeu" — how this club's seasons are labeled. */
      seasonCalendar?: string;
    },
  ) {
    const { tagNames, ...rest } = data;
    const tags = tagNames !== undefined ? await tagService.findOrCreateTags(tagNames) : undefined;

    return prisma.squad.update({
      where: { id },
      data: {
        ...rest,
        tags: tags !== undefined ? { set: tags.map((t) => ({ id: t.id })) } : undefined,
      },
    });
  },

  async deleteSquad(id: string) {
    await prisma.squad.delete({ where: { id } });
  },

  /**
   * Clones a club's identity/settings AND every one of its seasons
   * (lineup, coach, formation, notes) — not the underlying player data,
   * since CachedPlayer is a read-only mirror (§7): every cloned season
   * ends up pointing at the exact same cachedPlayerId rows, only the
   * SquadPlayer "lineup" rows are duplicated, same as a single season's
   * own duplicate (seasonService.createSeason).
   */
  async duplicateSquad(id: string) {
    const original = await prisma.squad.findUnique({
      where: { id },
      include: { tags: true, seasons: { include: { players: true } } },
    });
    if (!original) return null;

    const copy = await prisma.squad.create({
      data: {
        name: `${original.name} (Cópia)`,
        baseClubRef: original.baseClubRef,
        baseKind: original.baseKind,
        logoUrl: original.logoUrl,
        primaryColor: original.primaryColor,
        seasonCalendar: original.seasonCalendar,
        categoryId: original.categoryId,
        tags: original.tags.length ? { connect: original.tags.map((t) => ({ id: t.id })) } : undefined,
      },
    });

    for (const season of original.seasons) {
      const newSeason = await prisma.season.create({
        data: {
          squadId: copy.id,
          startYear: season.startYear,
          formation: season.formation,
          coachName: season.coachName,
          coachPhotoUrl: season.coachPhotoUrl,
          coachExternalLink: season.coachExternalLink,
          notes: season.notes,
        },
      });

      if (season.players.length > 0) {
        await prisma.squadPlayer.createMany({
          data: season.players.map((p) => ({
            seasonId: newSeason.id,
            cachedPlayerId: p.cachedPlayerId,
            shirtNumber: p.shirtNumber,
            isCaptain: p.isCaptain,
            isStarter: p.isStarter,
            isWatchlist: p.isWatchlist,
            isExtra: p.isExtra,
            positionSlot: p.positionSlot,
            order: p.order,
          })),
        });
      }
    }

    return squadService.getSquad(copy.id);
  },
};
