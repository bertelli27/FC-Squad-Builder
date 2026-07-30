import { prisma } from "@/lib/prisma";
import { cacheRepository, defaultExpiresAt } from "@/repositories/cache.repository";
import { categoryService } from "./category.service";
import { tagService } from "./tag.service";
import { squadService } from "./squad.service";

export interface SquadExportPlayer {
  shirtNumber: number | null;
  isCaptain: boolean;
  isStarter: boolean;
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

export interface SquadExportEntry {
  name: string;
  formation: string;
  logoUrl: string | null;
  coachName: string | null;
  coachPhotoUrl: string | null;
  coachExternalLink: string | null;
  notes: string | null;
  category: string | null;
  tags: string[];
  players: SquadExportPlayer[];
}

export interface SquadExportFile {
  version: 1;
  squads: SquadExportEntry[];
}

type FullSquad = NonNullable<Awaited<ReturnType<typeof squadService.getSquad>>>;

function toExportEntry(squad: FullSquad): SquadExportEntry {
  return {
    name: squad.name,
    formation: squad.formation,
    logoUrl: squad.logoUrl,
    coachName: squad.coachName,
    coachPhotoUrl: squad.coachPhotoUrl,
    coachExternalLink: squad.coachExternalLink,
    notes: squad.notes,
    category: squad.category?.name ?? null,
    tags: squad.tags.map((t) => t.name),
    players: squad.players.map((p) => ({
      shirtNumber: p.shirtNumber,
      isCaptain: p.isCaptain,
      isStarter: p.isStarter,
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
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Manually validated (no schema-validation dependency, matching the
 * `optionalStringField`-style parsing already used across the API routes)
 * — invalid squad entries are skipped with a reason rather than aborting
 * the whole file, per "validar o arquivo, evitar dados inválidos".
 */
function parseEntry(raw: unknown, index: number): { entry: SquadExportEntry } | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: `Item ${index + 1}: não é um objeto válido.` };
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== "string" || obj.name.trim() === "") {
    return { error: `Item ${index + 1}: "name" é obrigatório.` };
  }
  if (typeof obj.formation !== "string" || obj.formation.trim() === "") {
    return { error: `Item ${index + 1} ("${obj.name}"): "formation" é obrigatório.` };
  }
  if (!Array.isArray(obj.players)) {
    return { error: `Item ${index + 1} ("${obj.name}"): "players" precisa ser uma lista.` };
  }

  const players: SquadExportPlayer[] = [];
  for (const rawPlayer of obj.players) {
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

  return {
    entry: {
      name: obj.name,
      formation: obj.formation,
      logoUrl: str(obj.logoUrl),
      coachName: str(obj.coachName),
      coachPhotoUrl: str(obj.coachPhotoUrl),
      coachExternalLink: str(obj.coachExternalLink),
      notes: str(obj.notes),
      category: str(obj.category),
      tags: Array.isArray(obj.tags) ? obj.tags.filter((t): t is string => typeof t === "string") : [],
      players,
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

export const squadTransferService = {
  async exportSquad(id: string): Promise<SquadExportFile | null> {
    const squad = await squadService.getSquad(id);
    if (!squad) return null;
    return { version: 1, squads: [toExportEntry(squad)] };
  },

  async exportAllSquads(): Promise<SquadExportFile> {
    const squads = await prisma.squad.findMany({
      include: {
        players: { include: { cachedPlayer: true }, orderBy: { order: "asc" } },
        category: true,
        tags: true,
      },
      orderBy: { updatedAt: "desc" },
    });
    return { version: 1, squads: squads.map(toExportEntry) };
  },

  /**
   * `strategy` is a single choice for the whole batch (not per-squad) —
   * "replace" deletes any existing squad with the same name before
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
          formation: entry.formation,
          logoUrl: entry.logoUrl,
          coachName: entry.coachName,
          coachPhotoUrl: entry.coachPhotoUrl,
          coachExternalLink: entry.coachExternalLink,
          notes: entry.notes,
          categoryId: category?.id,
          tags: tags.length ? { connect: tags.map((t) => ({ id: t.id })) } : undefined,
        },
      });

      for (const p of entry.players) {
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
            squadId: squad.id,
            cachedPlayerId: cached.id,
            shirtNumber: p.shirtNumber,
            isCaptain: p.isCaptain,
            isStarter: p.isStarter,
            positionSlot: p.positionSlot,
            order: p.order,
          },
        });
      }

      imported += 1;
    }

    return { imported };
  },
};
