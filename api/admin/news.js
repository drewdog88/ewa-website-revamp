// Admin CRUD for news (auth required).
//   GET | POST {fields} | PUT ?id {fields} | DELETE ?id
import { sql } from "../_lib/db.js";
import { json, methodGuard, readBody } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";

// Return camelCase rows so the admin UI reads isPublished/publishedAt correctly
// (the public /api/news maps the same way — without this the UI saw only the raw
// snake_case columns, so every post showed as "Draft" and the edit toggle was wrong).
const all = async () => {
  const rows = await sql`
    SELECT id, title, body, tag, is_published, published_at
    FROM news ORDER BY published_at DESC NULLS LAST, id DESC`;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    tag: r.tag,
    isPublished: r.is_published,
    publishedAt: r.published_at,
  }));
};

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "POST", "PUT", "DELETE"])) return;
  if (!requireAuth(req, res)) return;
  const id = req.query?.id ? Number(req.query.id) : null;
  try {
    if (req.method === "GET") return json(res, 200, await all());

    if (req.method === "POST") {
      const b = await readBody(req);
      if (!b.title) return json(res, 400, { error: "Title is required" });
      const published = b.isPublished ?? false;
      await sql`
        INSERT INTO news (title, body, tag, is_published, published_at)
        VALUES (${b.title}, ${b.body ?? null}, ${b.tag ?? null}, ${published},
                ${b.publishedAt ?? (published ? new Date().toISOString() : null)})`;
      return json(res, 201, await all());
    }

    if (req.method === "PUT") {
      if (!id) return json(res, 400, { error: "id required" });
      const b = await readBody(req);
      if (!b.title) return json(res, 400, { error: "Title is required" });
      const published = b.isPublished ?? false;
      await sql`
        UPDATE news SET title = ${b.title}, body = ${b.body ?? null},
          tag = ${b.tag ?? null}, is_published = ${published},
          published_at = ${b.publishedAt ?? (published ? new Date().toISOString() : null)}
        WHERE id = ${id}`;
      return json(res, 200, await all());
    }

    if (req.method === "DELETE") {
      if (!id) return json(res, 400, { error: "id required" });
      await sql`DELETE FROM news WHERE id = ${id}`;
      return json(res, 200, await all());
    }
  } catch (e) {
    console.error("admin/news failed:", e);
    json(res, 500, { error: "News operation failed" });
  }
}
