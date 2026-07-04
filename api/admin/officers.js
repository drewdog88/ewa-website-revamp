// Admin CRUD for officers (auth required).
//   GET | POST {fields} | PUT ?id {fields} | DELETE ?id | PATCH ?action=reorder {order:[ids]}
import { sql } from "../_lib/db.js";
import { json, methodGuard, readBody } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";

const all = () => sql`SELECT id, name, role, email, sort_order FROM officers ORDER BY sort_order, name`;

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
        await sql`UPDATE officers SET sort_order = ${i} WHERE id = ${Number(order[i])}`;
      return json(res, 200, await all());
    }

    if (req.method === "POST") {
      const b = await readBody(req);
      if (!b.name) return json(res, 400, { error: "Name is required" });
      await sql`
        INSERT INTO officers (name, role, email, sort_order)
        VALUES (${b.name}, ${b.role ?? null}, ${b.email ?? null},
                COALESCE((SELECT MAX(sort_order)+1 FROM officers), 0))`;
      return json(res, 201, await all());
    }

    if (req.method === "PUT") {
      if (!id) return json(res, 400, { error: "id required" });
      const b = await readBody(req);
      if (!b.name) return json(res, 400, { error: "Name is required" });
      await sql`UPDATE officers SET name = ${b.name}, role = ${b.role ?? null}, email = ${b.email ?? null} WHERE id = ${id}`;
      return json(res, 200, await all());
    }

    if (req.method === "DELETE") {
      if (!id) return json(res, 400, { error: "id required" });
      await sql`DELETE FROM officers WHERE id = ${id}`;
      return json(res, 200, await all());
    }
  } catch (e) {
    console.error("admin/officers failed:", e);
    json(res, 500, { error: "Officer operation failed" });
  }
}
