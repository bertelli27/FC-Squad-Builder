import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import type { Player } from "@/types/domain";
import {
  KAGGLE_RATINGS_SOURCE,
  normalizeKaggleRatingsRow,
  type KaggleRatingsRow,
} from "@/lib/normalizers/kaggle-ratings.normalizer";
import type { PlayerProvider, PlayerSearchFilters } from "./provider.interface";

const CSV_PATH = process.env.RATINGS_CSV_PATH ?? "data/ea_fc26_players.csv";

let cachedRows: KaggleRatingsRow[] | null = null;

function loadRows(): KaggleRatingsRow[] {
  if (cachedRows) return cachedRows;

  const csv = readFileSync(resolve(process.cwd(), CSV_PATH), "utf-8");
  cachedRows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  }) as KaggleRatingsRow[];

  return cachedRows;
}

function matchesFilters(player: Player, filters: PlayerSearchFilters): boolean {
  if (filters.name) {
    const name = player.name.toLowerCase();
    const search = filters.name.toLowerCase();
    // Bidirectional: catches both "search is a substring of the stored
    // name" (typical search-as-you-type) and the reverse — Kaggle often
    // stores just a common name (e.g. "Alisson") while a caller searches
    // the fuller name from another source (e.g. "Alisson Becker").
    if (!name.includes(search) && !search.includes(name)) return false;
  }
  if (filters.position && player.position !== filters.position) return false;
  if (
    filters.nationality &&
    player.nationality?.toLowerCase() !== filters.nationality.toLowerCase()
  ) {
    return false;
  }
  if (filters.club && player.club?.toLowerCase() !== filters.club.toLowerCase()) return false;
  if (filters.league && player.league?.toLowerCase() !== filters.league.toLowerCase()) {
    return false;
  }
  if (filters.minOverall !== undefined && (player.overall ?? 0) < filters.minOverall) {
    return false;
  }
  if (filters.maxOverall !== undefined && (player.overall ?? 0) > filters.maxOverall) {
    return false;
  }
  if (filters.minAge !== undefined && (player.age ?? 0) < filters.minAge) return false;
  if (filters.maxAge !== undefined && (player.age ?? 0) > filters.maxAge) return false;
  // minPotential/maxPotential are not applied: this dataset has no
  // career-mode "potential" rating (see kaggle-ratings.normalizer.ts).
  return true;
}

export const kaggleRatingsProvider: PlayerProvider = {
  async searchPlayers(filters: PlayerSearchFilters): Promise<Player[]> {
    return loadRows()
      .map(normalizeKaggleRatingsRow)
      .filter((player) => matchesFilters(player, filters));
  },

  async fetchPlayer(externalId: string): Promise<Player | null> {
    const row = loadRows().find((r) => r.id === externalId);
    return row ? normalizeKaggleRatingsRow(row) : null;
  },
};

export { KAGGLE_RATINGS_SOURCE };
