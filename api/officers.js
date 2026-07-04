// GET /api/officers — public list of the EWA team.
import { sql } from "./_lib/db.js";
import { json, methodGuard } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;
  try {
    const rows = await sql`
      SELECT id, name, role, email FROM officers
      ORDER BY sort_order, name`;
    json(res, 200, rows);
  } catch (e) {
    console.error("GET /api/officers failed:", e);
    json(res, 500, { error: "Failed to load officers" });
  }
}
