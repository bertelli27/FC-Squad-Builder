/**
 * Logical backup of a Postgres database to a plain-SQL file — a stand-in
 * for `pg_dump` (the pg_dump installed locally is v17, older than Neon's
 * Postgres 18 server, and pg_dump refuses to run against a newer server
 * than itself). Discovers tables/columns/FKs from information_schema at
 * runtime instead of hardcoding the schema, so it doesn't need updating
 * when models change.
 *
 * Usage: DATABASE_URL="postgresql://..." npx tsx scripts/backup-db.ts <label>
 * Writes backups/<label>_<timestamp>.sql — restore with:
 *   psql "$DATABASE_URL" -f backups/<file>.sql
 * (or paste into any Postgres client — it's plain INSERT statements
 * wrapped in a transaction, FK checks deferred during the run so table
 * order doesn't matter).
 */
import { Client } from "pg";
import { writeFileSync } from "fs";
import { join } from "path";

const label = process.argv[2] ?? "backup";
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}
const databaseUrl: string = process.env.DATABASE_URL;

function sqlLiteral(value: unknown, dataType: string, udtName: string): string {
  if (value === null || value === undefined) return "NULL";

  if (udtName.startsWith("_")) {
    // Array column (e.g. text[]) — pg driver returns a JS array. An empty
    // ARRAY[] has no inferable element type in Postgres and needs an
    // explicit cast, or the INSERT fails ("não é possível determinar o
    // tipo de dados de matriz vazia").
    const elementType = udtName.slice(1);
    const items = (value as unknown[]).map((v) => sqlLiteral(v, dataType.replace(/\[\]$/, ""), elementType));
    return items.length === 0 ? `ARRAY[]::${elementType}[]` : `ARRAY[${items.join(",")}]`;
  }

  switch (dataType) {
    case "boolean":
      return value ? "true" : "false";
    case "integer":
    case "bigint":
    case "smallint":
    case "double precision":
    case "numeric":
    case "real":
      return String(value);
    case "timestamp without time zone":
    case "timestamp with time zone":
      return `'${(value as Date).toISOString()}'::timestamptz`;
    case "jsonb":
    case "json":
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::${dataType}`;
    default:
      // text, character varying, uuid, etc.
      return `'${String(value).replace(/'/g, "''")}'`;
  }
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const { rows: tables } = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations'
     ORDER BY table_name`,
  );

  const lines: string[] = [
    `-- Backup of ${databaseUrl.replace(/:\/\/[^@]+@/, "://***@")}`,
    `-- Generated ${new Date().toISOString()}`,
    "BEGIN;",
    "SET session_replication_role = replica;", // defer FK checks — table order doesn't matter
  ];

  let totalRows = 0;
  for (const { table_name: tableName } of tables) {
    const { rows: columns } = await client.query<{ column_name: string; data_type: string; udt_name: string }>(
      `SELECT column_name, data_type, udt_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [tableName],
    );

    // Explicitly schema-qualified: some pooled connections (Neon's PgBouncer
    // endpoint observed here) have an empty search_path, so an unqualified
    // "tableName" doesn't resolve even though the table is right there in
    // information_schema.
    const { rows } = await client.query(`SELECT * FROM public."${tableName}"`);
    lines.push(`\n-- ${tableName} (${rows.length} rows)`);
    lines.push(`DELETE FROM public."${tableName}";`);

    for (const row of rows) {
      const colNames = columns.map((c) => `"${c.column_name}"`).join(", ");
      const values = columns
        .map((c) => sqlLiteral(row[c.column_name], c.data_type, c.udt_name))
        .join(", ");
      lines.push(`INSERT INTO public."${tableName}" (${colNames}) VALUES (${values});`);
    }
    totalRows += rows.length;
  }

  lines.push("\nSET session_replication_role = DEFAULT;", "COMMIT;");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(process.cwd(), "backups", `${label}_${timestamp}.sql`);
  writeFileSync(outPath, lines.join("\n"), "utf8");

  await client.end();
  console.log(`Wrote ${outPath} — ${tables.length} tables, ${totalRows} rows total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
