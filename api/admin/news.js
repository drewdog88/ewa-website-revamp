// Admin CRUD for news (auth required).
//   GET | POST {fields} | PUT ?id {fields} | DELETE ?id
import { sql } from "../_lib/db.js";
import { json, methodGuard, readBody } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";
import { normalizeNewsBody, normalizeText } from "../_lib/urls.js";

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

function prepareNews(b) {
  const title = normalizeText(b.title, { label: "Title", max: 300, allowEmpty: false });
  if (title.error) return title;
  const body = normalizeNewsBody(b.body);
  if (body.error) return body;
  const tag = normalizeText(b.tag, { label: "Tag", max: 80 });
  if (tag.error) return tag;
  const published = !!b.isPublished;
  let publishedAt = null;
  if (b.publishedAt != null && b.publishedAt !== "") {
    const d = new Date(b.publishedAt);
    if (Number.isNaN(d.getTime())) return { error: "publishedAt is not a valid date" };
    publishedAt = d.toISOString();
  } else if (published) {
    publishedAt = new Date().toISOString();
  }
  return {
    title: title.text,
    body: body.body,
    tag: tag.text,
    published,
    publishedAt,
  };
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "POST", "PUT", "DELETE"])) return;
  if (!requireAuth(req, res)) return;
  const id = req.query?.id ? Number(req.query.id) : null;
  try {
    if (req.method === "GET") return json(res, 200, await all());

    if (req.method === "POST") {
      const b = await readBody(req);
      const prepared = prepareNews(b);
      if (prepared.error) return json(res, 400, { error: prepared.error });
      await sql`
        INSERT INTO news (title, body, tag, is_published, published_at)
        VALUES (${prepared.title}, ${prepared.body}, ${prepared.tag}, ${prepared.published},
                ${prepared.publishedAt})`;
      return json(res, 201, await all());
    }

    if (req.method === "PUT") {
      if (!id) return json(res, 400, { error: "id required" });
      const b = await readBody(req);
      const prepared = prepareNews(b);
      if (prepared.error) return json(res, 400, { error: prepared.error });
      await sql`
        UPDATE news SET title = ${prepared.title}, body = ${prepared.body},
          tag = ${prepared.tag}, is_published = ${prepared.published},
          published_at = ${prepared.publishedAt}
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
