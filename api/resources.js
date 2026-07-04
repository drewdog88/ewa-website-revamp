// GET /api/resources — public list of active quick links / resources.
import { sql } from "./_lib/db.js";
import { json, methodGuard } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;
  try {
    const rows = await sql`
      SELECT id, title, description, url, artifact_id FROM resources
      WHERE is_active = TRUE
      ORDER BY sort_order, title`;
    json(res, 200, rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      // Prefer an external URL; otherwise serve the attached artifact.
      url: r.url || (r.artifact_id ? `/api/artifacts/${r.artifact_id}` : null),
    })));
  } catch (e) {
    console.error("GET /api/resources failed:", e);
    json(res, 500, { error: "Failed to load resources" });
  }
}
