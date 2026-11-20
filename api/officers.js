// GET /api/officers — public list of the EWA team.
import { sql } from "./_lib/db.js";
import { json, methodGuard } from "./_lib/http.js";
import { isSafeEmail } from "./_lib/urls.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;
  try {
    const rows = await sql`
      SELECT id, name, role, email FROM officers
      ORDER BY sort_order, name`;
    json(res, 200, rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      email: isSafeEmail(r.email) ? r.email : null,
    })));
  } catch (e) {
    console.error("GET /api/officers failed:", e);
    json(res, 500, { error: "Failed to load officers" });
  }
}
