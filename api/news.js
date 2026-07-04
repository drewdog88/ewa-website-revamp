// GET /api/news — public list of published news, newest first.
import { sql } from "./_lib/db.js";
import { json, methodGuard } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;
  try {
    const rows = await sql`
      SELECT id, title, body, tag, published_at
      FROM news WHERE is_published = TRUE
      ORDER BY published_at DESC NULLS LAST, id DESC`;
    json(res, 200, rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      tag: r.tag,
      publishedAt: r.published_at,
    })));
  } catch (e) {
    console.error("GET /api/news failed:", e);
    json(res, 500, { error: "Failed to load news" });
  }
}
