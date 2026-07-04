// Admin CRUD for resources / quick links (auth required).
//   GET | POST {fields} | PUT ?id {fields} | DELETE ?id | PATCH ?action=reorder {order:[ids]}
import { sql } from "../_lib/db.js";
import { json, methodGuard, readBody } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";

async function all() {
  const rows = await sql`
    SELECT id, title, description, url, artifact_id, sort_order, is_active
    FROM resources ORDER BY sort_order, title`;
  return rows.map((r) => ({
    id: r.id, title: r.title, description: r.description, url: r.url,
    artifactId: r.artifact_id, sortOrder: r.sort_order, isActive: r.is_active,
  }));
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "POST", "PUT", "PATCH", "DELETE"])) return;
  if (!requireAuth(req, res)) return;
  const id = req.query?.id ? Number(req.query.id) : null;
  const action = req.query?.action || null;
  try {
    if (req.method === "GET") return json(res, 200, await all());

    if (req.method === "PATCH" && action === "reorder") {
      const { order } = await readBody(req);
      if (!Array.isArray(order)) return json(res, 400, { error: "order must be an array" });
      for (let i = 0; i < order.length; i++)
        await sql`UPDATE resources SET sort_order = ${i} WHERE id = ${Number(order[i])}`;
      return json(res, 200, await all());
    }

    if (req.method === "POST") {
      const b = await readBody(req);
      if (!b.title) return json(res, 400, { error: "Title is required" });
      await sql`
        INSERT INTO resources (title, description, url, artifact_id, is_active, sort_order)
        VALUES (${b.title}, ${b.description ?? null}, ${b.url ?? null}, ${b.artifactId ?? null},
                ${b.isActive ?? true}, COALESCE((SELECT MAX(sort_order)+1 FROM resources), 0))`;
      return json(res, 201, await all());
    }

    if (req.method === "PUT") {
      if (!id) return json(res, 400, { error: "id required" });
      const b = await readBody(req);
      if (!b.title) return json(res, 400, { error: "Title is required" });
      await sql`UPDATE resources SET title = ${b.title}, description = ${b.description ?? null},
        url = ${b.url ?? null}, artifact_id = ${b.artifactId ?? null},
        is_active = ${b.isActive ?? true} WHERE id = ${id}`;
      return json(res, 200, await all());
    }

    if (req.method === "DELETE") {
      if (!id) return json(res, 400, { error: "id required" });
      await sql`DELETE FROM resources WHERE id = ${id}`;
      return json(res, 200, await all());
    }
  } catch (e) {
    console.error("admin/resources failed:", e);
    json(res, 500, { error: "Resource operation failed" });
  }
}
