// Seed / reset the single admin user. Stores a bcrypt hash only.
// Password: pass as arg, else env ADMIN_PASSWORD, else a generated strong one
// (printed ONCE so it can be recorded, then changed in the admin UI).
// Usage: node scripts/seed-admin.mjs [username] [password]
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./lib/env.mjs";

const env = loadEnv();
const sql = neon(env.NEW_DATABASE_URL);

const username = process.argv[2] || "admin";
const generated = randomBytes(9).toString("base64url"); // 12-char strong pw
const password = process.argv[3] || env.ADMIN_PASSWORD || generated;

const hash = await bcrypt.hash(password, 12);
await sql`
  INSERT INTO users (username, password_hash)
  VALUES (${username}, ${hash})
  ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`;

console.log(`Admin user ready: username="${username}"`);
if (!process.argv[3] && !env.ADMIN_PASSWORD) {
  console.log(`Generated password (record now, change after first login):\n  ${password}`);
}
