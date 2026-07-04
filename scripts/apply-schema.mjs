// Apply scripts/schema.sql to the NEW Neon DB.
// Uses the WebSocket Pool (not the HTTP `neon` driver) because the schema has
// function bodies / DO blocks / multiple statements the HTTP driver rejects.
// Usage: node scripts/apply-schema.mjs [ENV_KEY]   (default NEW_DATABASE_URL)
import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { loadEnv } from "./lib/env.mjs";

neonConfig.webSocketConstructor = WebSocket; // Node 21+ global

const key = process.argv[2] || "NEW_DATABASE_URL";
const env = loadEnv();
// Prefer an unpooled URL for DDL if one is defined; fall back to the given key.
const url = env[key.replace("DATABASE_URL", "DATABASE_URL_UNPOOLED")] || env[key];
if (!url) {
  console.error(`Missing ${key} in .env.migrate`);
  process.exit(1);
}

const sqlText = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const pool = new Pool({ connectionString: url });
try {
  await pool.query(sqlText); // simple-query protocol runs the whole file
  const t = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name`);
  console.log("Schema applied. Tables now present:");
  for (const r of t.rows) console.log("  -", r.table_name);
} finally {
  await pool.end();
}
