// GET /api/fundraiser — the single active fundraiser (or null).
import { sql } from "./_lib/db.js";
import { json, methodGuard } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;
  try {
    const rows = await sql`
      SELECT id, headline, goal_cents, raised_cents, is_active, updated_at
      FROM fundraiser WHERE is_active = TRUE
      ORDER BY updated_at DESC LIMIT 1`;
    const f = rows[0];
    json(res, 200, f ? {
      id: f.id,
      headline: f.headline,
      goalCents: f.goal_cents,
      raisedCents: f.raised_cents,
      updatedAt: f.updated_at,
    } : null);
  } catch (e) {
    console.error("GET /api/fundraiser failed:", e);
    json(res, 500, { error: "Failed to load fundraiser" });
  }
}
