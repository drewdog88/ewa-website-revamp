// Read-only introspection of a Postgres DB: lists tables, columns, row counts.
// Usage: node scripts/introspect.mjs <ENV_KEY>   (e.g. OLD_PROD_DATABASE_URL)
import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./lib/env.mjs";

const key = process.argv[2] || "OLD_PROD_DATABASE_URL";
const env = loadEnv();
const url = env[key];
if (!url) {
  console.error(`Missing ${key} in .env.migrate`);
  process.exit(1);
}
const sql = neon(url);

const host = url.replace(/:[^:@]*@/, ":****@").match(/@([^/?]*)/)?.[1] ?? "?";
console.log(`# DB: ${key} @ ${host}\n`);

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name`;

for (const { table_name } of tables) {
  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table_name}
    ORDER BY ordinal_position`;
  let count = "?";
  try {
    const r = await sql.query(`SELECT COUNT(*)::int AS n FROM "${table_name}"`);
    count = r[0].n;
  } catch (e) {
    count = `err: ${e.message}`;
  }
  console.log(`## ${table_name}  (${count} rows)`);
  console.log(cols.map((c) => `   - ${c.column_name} : ${c.data_type}`).join("\n"));
  console.log("");
}
