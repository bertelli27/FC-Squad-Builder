import { prisma } from "@/lib/prisma";
import { cacheRepository, defaultExpiresAt } from "@/repositories/cache.repository";
import { categoryService } from "./category.service";
import { tagService } from "./tag.service";
import { squadService } from "./squad.service";

export interface SquadExportPlayer {
  shirtNumber: number | null;
  isCaptain: boolean;
  isStarter: boolean;
  isWatchlist: boolean;
  isExtra: boolean;
  positionSlot: string | null;
  order: number;
  player: {
    source: string;
    externalId: string;
    name: string;
    photoUrl: string | null;
    nationality: string | null;
    position: string | null;
    club: string | null;
    league: string | null;
    overall: number | null;
    potential: number | null;
    age: number | null;
    externalLink: string | null;
  };
}

export interface SeasonExportEntry {
  startYear: number;
  formation: string;
  coachName: string | null;
  coachPhotoUrl: string | null;
  coachExternalLink: string | null;
  notes: string | null;
  players: SquadExportPlayer[];
}

export interface SquadExportEntry {
  name: string;
  baseKind: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  seasonCalendar: string;
  category: string | null;
  tags: string[];
  seasons: SeasonExportEntry[];
}

export interface SquadExportFile {
  version: 2;
  squads: SquadExportEntry[];
}

// Deliberately NOT `NonNullable<Awaited<ReturnType<typeof squadService.getSquad>>>`
// — that shape's `seasons` carry a `_count.players` squadService.getSquad
// needs for its own display purposes, which neither caller of
// toExportEntry below actually loads (they get real per-season players
// from `seasonsWithPlayers` instead), so requiring it here would force
// both callers to fetch data they don't need just to satisfy the type.
interface ExportableSquad {
  name: string;
  baseKind: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  seasonCalendar: string;
  category: { name: string } | null;
  tags: { name: string }[];
  seasons: {
    id: string;
    startYear: number;
    formation: string;
    coachName: string | null;
    coachPhotoUrl: string | null;
    coachExternalLink: string | null;
    notes: string | null;
  }[];
}

interface SeasonPlayerRow {
  shirtNumber: number | null;
  isCaptain: boolean;
  isStarter: boolean;
  isWatchlist: boolean;
  isExtra: boolean;
  positionSlot: string | null;
  order: number;
  cachedPlayer: {
    source: string;
    externalId: string;
    name: string;
    photoUrl: string | null;
    nationality: string | null;
    position: string | null;
    club: string | null;
    league: string | null;
    overall: number | null;
    potential: number | null;
    age: number | null;
    externalLink: string | null;
  };
}

function toExportEntry(
  squad: ExportableSquad,
  seasonsWithPlayers: Map<string, { players: SeasonPlayerRow[] }>,
): SquadExportEntry {
  return {
    name: squad.name,
    baseKind: squad.baseKind,
    logoUrl: squad.logoUrl,
    primaryColor: squad.primaryColor,
    seasonCalendar: squad.seasonCalendar,
    category: squad.category?.name ?? null,
    tags: squad.tags.map((t) => t.name),
    seasons: squad.seasons.map((season) => {
      const withPlayers = seasonsWithPlayers.get(season.id);
      return {
        startYear: season.startYear,
        formation: season.formation,
        coachName: season.coachName,
        coachPhotoUrl: season.coachPhotoUrl,
        coachExternalLink: season.coachExternalLink,
        notes: season.notes,
        players: (withPlayers?.players ?? []).map((p) => ({
          shirtNumber: p.shirtNumber,
          isCaptain: p.isCaptain,
          isStarter: p.isStarter,
          isWatchlist: p.isWatchlist,
          isExtra: p.isExtra,
          positionSlot: p.positionSlot,
          order: p.order,
          player: {
            source: p.cachedPlayer.source,
            externalId: p.cachedPlayer.externalId,
            name: p.cachedPlayer.name,
            photoUrl: p.cachedPlayer.photoUrl,
            nationality: p.cachedPlayer.nationality,
            position: p.cachedPlayer.position,
            club: p.cachedPlayer.club,
            league: p.cachedPlayer.league,
            overall: p.cachedPlayer.overall,
            potential: p.cachedPlayer.potential,
            age: p.cachedPlayer.age,
            externalLink: p.cachedPlayer.externalLink,
          },
        })),
      };
    }),
  };
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parsePlayers(raw: unknown): SquadExportPlayer[] {
  if (!Array.isArray(raw)) return [];
  const players: SquadExportPlayer[] = [];
  for (const rawPlayer of raw) {
    if (typeof rawPlayer !== "object" || rawPlayer === null) continue;
    const p = rawPlayer as Record<string, unknown>;
    const playerData = p.player;
    if (typeof playerData !== "object" || playerData === null) continue;
    const player = playerData as Record<string, unknown>;
    if (typeof player.source !== "string" || typeof player.externalId !== "string") continue;
    if (typeof player.name !== "string" || player.name.trim() === "") continue;

    players.push({
      shirtNumber: num(p.shirtNumber),
      isCaptain: p.isCaptain === true,
      isStarter: p.isStarter !== false,
      isWatchlist: p.isWatchlist === true,
      isExtra: p.isExtra === true,
      positionSlot: str(p.positionSlot),
      order: num(p.order) ?? 0,
      player: {
        source: player.source,
        externalId: player.externalId,
        name: player.name,
        photoUrl: str(player.photoUrl),
        nationality: str(player.nationality),
        position: str(player.position),
        club: str(player.club),
        league: str(player.league),
        overall: num(player.overall),
        potential: num(player.potential),
        age: num(player.age),
        externalLink: str(player.externalLink),
      },
    });
  }
  return players;
}

/**
 * Manually validated (no schema-validation dependency, matching the
 * `optionalStringField`-style parsing already used across the API routes)
 * — invalid squad entries are skipped with a reason rather than aborting
 * the whole file, per "validar o arquivo, evitar dados inválidos".
 *
 * Accepts both the current club+seasons shape ("seasons": [...]) and the
 * older pre-temporadas shape (a single flat "formation"/"players" straight
 * on the squad) so exports made before this etapa still import cleanly —
 * an old file is treated as one season, year = current year.
 */
function parseEntry(raw: unknown, index: number): { entry: SquadExportEntry } | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: `Item ${index + 1}: não é um objeto válido.` };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== "string" || obj.name.trim() === "") {
    return { error: `Item ${index + 1}: "name" é obrigatório.` };
  }

  let seasons: SeasonExportEntry[];
  if (Array.isArray(obj.seasons)) {
    seasons = [];
    for (const rawSeason of obj.seasons) {
      if (typeof rawSeason !== "object" || rawSeason === null) continue;
      const s = rawSeason as Record<string, unknown>;
      const startYear = num(s.startYear);
      if (startYear === null || typeof s.formation !== "string" || s.formation.trim() === "") continue;
      seasons.push({
        startYear,
        formation: s.formation,
        coachName: str(s.coachName),
        coachPhotoUrl: str(s.coachPhotoUrl),
        coachExternalLink: str(s.coachExternalLink),
        notes: str(s.notes),
        players: parsePlayers(s.players),
      });
    }
  } else if (typeof obj.formation === "string" && obj.formation.trim() !== "") {
    seasons = [
      {
        startYear: new Date().getFullYear(),
        formation: obj.formation,
        coachName: str(obj.coachName),
        coachPhotoUrl: str(obj.coachPhotoUrl),
        coachExternalLink: str(obj.coachExternalLink),
        notes: str(obj.notes),
        players: parsePlayers(obj.players),
      },
    ];
  } else {
    return { error: `Item ${index + 1} ("${obj.name}"): nenhuma temporada válida encontrada.` };
  }

  return {
    entry: {
      name: obj.name,
      baseKind: str(obj.baseKind),
      logoUrl: str(obj.logoUrl),
      primaryColor: str(obj.primaryColor),
      seasonCalendar: obj.seasonCalendar === "europeu" ? "europeu" : "brasileiro",
      category: str(obj.category),
      tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string") : [],
      seasons,
    },
  };
}

export function parseImportFile(raw: unknown): { entries: SquadExportEntry[]; errors: string[] } {
  if (typeof raw !== "object" || raw === null || !Array.isArray((raw as Record<string, unknown>).squads)) {
    return { entries: [], errors: ['Arquivo inválido: esperado um objeto com a chave "squads".'] };
  }

  const squads = (raw as Record<string, unknown>).squads as unknown[];
  const entries: SquadExportEntry[] = [];
  const errors: string[] = [];

  squads.forEach((raw, index) => {
    const result = parseEntry(raw, index);
    if ("error" in result) errors.push(result.error);
    else entries.push(result.entry);
  });

  return { entries, errors };
}

async function loadSeasonsWithPlayers(squadIds: string[]) {
  const seasons = await prisma.season.findMany({
    where: { squadId: { in: squadIds } },
    include: { players: { include: { cachedPlayer: true }, orderBy: { order: "asc" } } },
  });
  return new Map(seasons.map((s) => [s.id, s]));
}

export const squadTransferService = {
  async exportSquad(id: string): Promise<SquadExportFile | null> {
    const squad = await squadService.getSquad(id);
    if (!squad) return null;
    const seasonsWithPlayers = await loadSeasonsWithPlayers([id]);
    return { version: 2, squads: [toExportEntry(squad, seasonsWithPlayers)] };
  },

  async exportAllSquads(): Promise<SquadExportFile> {
    const squads = await prisma.squad.findMany({
      include: {
        seasons: { orderBy: { startYear: "asc" } },
        category: true,
        tags: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    const seasonsWithPlayers = await loadSeasonsWithPlayers(squads.map((s) => s.id));
    return { version: 2, squads: squads.map((s) => toExportEntry(s, seasonsWithPlayers)) };
  },

  /**
   * `strategy` is a single choice for the whole batch (not per-squad) —
   * "replace" deletes any existing club with the same name before
   * recreating it, "keep-both" renames the incoming one instead.
   */
  async importSquads(entries: SquadExportEntry[], strategy: "replace" | "keep-both") {
    let imported = 0;

    for (const entry of entries) {
      let name = entry.name;
      const existing = await prisma.squad.findFirst({ where: { name } });

      if (existing) {
        if (strategy === "replace") {
          await prisma.squad.delete({ where: { id: existing.id } });
        } else {
          const suffix = "(Importado)";
          let candidate = `${name} ${suffix}`;
          let attempt = 2;
          while (await prisma.squad.findFirst({ where: { name: candidate } })) {
            candidate = `${name} ${suffix} (${attempt})`;
            attempt += 1;
          }
          name = candidate;
        }
      }

      const category = entry.category ? await categoryService.createCategory(entry.category) : null;
      const tags = entry.tags.length ? await tagService.findOrCreateTags(entry.tags) : [];

      const squad = await prisma.squad.create({
        data: {
          name,
          baseKind: entry.baseKind,
          logoUrl: entry.logoUrl,
          primaryColor: entry.primaryColor,
          seasonCalendar: entry.seasonCalendar,
          categoryId: category?.id,
          tags: tags.length ? { connect: tags.map((t) => ({ id: t.id })) } : undefined,
        },
      });

      for (const seasonEntry of entry.seasons) {
        const season = await prisma.season.create({
          data: {
            squadId: squad.id,
            startYear: seasonEntry.startYear,
            formation: seasonEntry.formation,
            coachName: seasonEntry.coachName,
            coachPhotoUrl: seasonEntry.coachPhotoUrl,
            coachExternalLink: seasonEntry.coachExternalLink,
            notes: seasonEntry.notes,
          },
        });

        for (const p of seasonEntry.players) {
          const cached = await cacheRepository.upsertPlayer(p.player.source, p.player.externalId, {
            name: p.player.name,
            photoUrl: p.player.photoUrl,
            nationality: p.player.nationality,
            position: p.player.position,
            club: p.player.club,
            league: p.player.league,
            overall: p.player.overall,
            potential: p.player.potential,
            age: p.player.age,
            externalLink: p.player.externalLink,
            rawData: { imported: true },
            expiresAt: defaultExpiresAt(),
          });

          await prisma.squadPlayer.create({
            data: {
              seasonId: season.id,
              cachedPlayerId: cached.id,
              shirtNumber: p.shirtNumber,
              isCaptain: p.isCaptain,
              isStarter: p.isStarter,
              isWatchlist: p.isWatchlist,
              isExtra: p.isExtra,
              positionSlot: p.positionSlot,
              order: p.order,
            },
          });
        }
      }

      imported += 1;
    }

    return { imported };
  },
};
