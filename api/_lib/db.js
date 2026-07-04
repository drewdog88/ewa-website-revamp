// Shared Neon SQL client for all serverless functions.
// DATABASE_URL is provided by the Neon–Vercel integration (env var).
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  // Surface a clear error at cold start rather than a cryptic runtime failure.
  console.error("DATABASE_URL is not set in the environment.");
}

export const sql = neon(url);
