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

  // Etapa 6: previously this deleted every kaggle-fc26 row and recreated
  // them from scratch, which (a) generates brand new ids on every re-run,
  // breaking any SquadPlayer/PlayerCareer that already references the old
  // ones via a FK, and (b) would silently discard any cadastral edit the
  // user made through the app (§14/§29 — "não sobrescrever informações
  // personalizadas sem confirmação" applies here too, not just to the
  // SoFIFA import this etapa considered and dropped). Upserting by the
  // existing [source, externalId] unique key preserves ids across re-runs,
  // and rows the user has touched (`manuallyEdited`) keep their cadastral
  // fields — only non-cadastral bookkeeping (club/league/attributes/
  // fetchedAt/expiresAt) still refreshes from the new CSV for those.
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((row) => {
        const player = normalizeKaggleRatingsRow(row);
        const cadastral = {
          name: player.name,
          photoUrl: player.photoUrl,
          nationality: player.nationality,
          position: player.position,
          secondaryPositions: player.secondaryPositions ?? [],
          overall: player.overall,
          potential: player.potential,
          age: player.age,
          dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth) : null,
        };
        return prisma.cachedPlayer.upsert({
          where: { source_externalId: { source: KAGGLE_RATINGS_SOURCE, externalId: player.externalId } },
          create: {
            source: KAGGLE_RATINGS_SOURCE,
            externalId: player.externalId,
            ...cadastral,
            club: player.club,
            league: player.league,
            rawData: row,
            fetchedAt,
            expiresAt,
          },
          update: {
            club: player.club,
            league: player.league,
            rawData: row,
            fetchedAt,
            expiresAt,
          },
        });
      }),
    );

    // Cadastral fields for `manuallyEdited` rows are excluded from the
    // batched upsert above (kept out of `update` entirely) — a second pass
    // applies them only to rows that aren't user-edited, since Prisma's
    // upsert can't conditionally skip fields based on the row it's about
    // to touch.
    await prisma.$transaction(
      batch.map((row) => {
        const player = normalizeKaggleRatingsRow(row);
        return prisma.cachedPlayer.updateMany({
          where: {
            source: KAGGLE_RATINGS_SOURCE,
            externalId: player.externalId,
            manuallyEdited: false,
          },
          data: {
            name: player.name,
            photoUrl: player.photoUrl,
            nationality: player.nationality,
            position: player.position,
            secondaryPositions: player.secondaryPositions ?? [],
            overall: player.overall,
            potential: player.potential,
            age: player.age,
            dateOfBirth: player.dateOfBirth ? new Date(player.dateOfBirth) : null,
          },
        });
      }),
    );

    console.log(`Processed ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  const counts = await prisma.cachedPlayer.groupBy({
    by: ["manuallyEdited"],
    where: { source: KAGGLE_RATINGS_SOURCE },
    _count: true,
  });
  const preserved = counts.find((c) => c.manuallyEdited)?._count ?? 0;
  console.log(`Done. ${preserved} manually-edited row(s) had their cadastral fields preserved.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
