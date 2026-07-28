import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/prisma";
import {
  KAGGLE_RATINGS_SOURCE,
  normalizeKaggleRatingsRow,
  type KaggleRatingsRow,
} from "@/lib/normalizers/kaggle-ratings.normalizer";

const CSV_PATH = process.env.RATINGS_CSV_PATH ?? "data/ea_fc26_players.csv";
const BATCH_SIZE = 1000;
const TTL_DAYS = 180; // static dataset: refresh manually by re-running this script

async function main() {
  const csv = readFileSync(resolve(process.cwd(), CSV_PATH), "utf-8");
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
  }) as KaggleRatingsRow[];

  console.log(`Parsed ${rows.length} rows from ${CSV_PATH}`);

  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);
  const fetchedAt = new Date();

  const records = rows.map((row) => {
    const player = normalizeKaggleRatingsRow(row);
    return {
      source: KAGGLE_RATINGS_SOURCE,
      externalId: player.externalId,
      name: player.name,
      photoUrl: player.photoUrl,
      nationality: player.nationality,
      position: player.position,
      club: player.club,
      league: player.league,
      overall: player.overall,
      potential: player.potential,
      age: player.age,
      rawData: row,
      fetchedAt,
      expiresAt,
    };
  });

  await prisma.$transaction(async (tx) => {
    await tx.cachedPlayer.deleteMany({ where: { source: KAGGLE_RATINGS_SOURCE } });

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await tx.cachedPlayer.createMany({ data: batch });
      console.log(`Imported ${Math.min(i + BATCH_SIZE, records.length)}/${records.length}`);
    }
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
