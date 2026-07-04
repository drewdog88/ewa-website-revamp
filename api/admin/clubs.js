// Admin CRUD for clubs (auth required).
//   GET                       -> all clubs (active + inactive) with payment methods
//   POST   { club fields }    -> create
//   PUT    ?id=N { fields }   -> update club + replace its payment methods
//   PATCH  ?action=reorder { order:[ids] } -> set sort_order
//   DELETE ?id=N              -> delete club (cascades payment methods)
//
// Payment method input items: { type, label, value?, name?, token?, qrSettings? }
//   zelle: pass {name, token} to build the URL, or {value} to store a pasted URL.
import { sql } from "../_lib/db.js";
import { json, methodGuard, readBody } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";
import { buildZelleUrl, decodeZelle } from "../_lib/zelle.js";

async function replaceMethods(clubId, methods) {
  await sql`DELETE FROM payment_methods WHERE club_id = ${clubId}`;
  let order = 0;
  for (const m of methods || []) {
    let value = m.value || null;
    let token = null;
    let qr = null;
    if (m.type === "zelle") {
      if (m.name && m.token) value = buildZelleUrl(m.name, m.token);
      token = m.token || (value ? decodeZelle(value)?.token : null) || null;
      qr = m.qrSettings ?? m.qr_settings ?? null;
    }
    if (!value) continue; // skip incomplete methods
    await sql`
      INSERT INTO payment_methods
        (club_id, type, label, value, display_token, qr_settings, sort_order, is_active)
      VALUES (${clubId}, ${m.type}, ${m.label ?? null}, ${value},
              ${token}, ${qr}, ${order++}, ${m.isActive ?? true})`;
  }
}

async function loadAll() {
  const clubs = await sql`
    SELECT id, name, description, website_url, is_active, sort_order
    FROM clubs ORDER BY sort_order, name`;
  const methods = await sql`
    SELECT id, club_id, type, label, value, display_token, qr_settings, sort_order, is_active
    FROM payment_methods ORDER BY club_id, sort_order, id`;
  const byClub = new Map();
  for (const m of methods) {
    if (!byClub.has(m.club_id)) byClub.set(m.club_id, []);
    const zd = m.type === "zelle" ? decodeZelle(m.value) : null;
    byClub.get(m.club_id).push({
      id: m.id, type: m.type, label: m.label, value: m.value,
      displayToken: m.display_token, qrSettings: m.qr_settings,
      zelleName: zd?.name ?? null, isActive: m.is_active,
    });
  }
  return clubs.map((c) => ({
    id: c.id, name: c.name, description: c.description,
    websiteUrl: c.website_url, active: c.is_active, sortOrder: c.sort_order,
    paymentMethods: byClub.get(c.id) || [],
  }));
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "POST", "PUT", "PATCH", "DELETE"])) return;
  if (!requireAuth(req, res)) return;
  const id = req.query?.id ? Number(req.query.id) : null;
  const action = req.query?.action || null;

  try {
    if (req.method === "GET") return json(res, 200, await loadAll());

    if (req.method === "PATCH" && action === "reorder") {
      const { order } = await readBody(req);
      if (!Array.isArray(order)) return json(res, 400, { error: "order must be an array" });
      for (let i = 0; i < order.length; i++) {
        await sql`UPDATE clubs SET sort_order = ${i} WHERE id = ${Number(order[i])}`;
      }
      return json(res, 200, await loadAll());
    }

    if (req.method === "POST") {
      const b = await readBody(req);
      if (!b.name) return json(res, 400, { error: "Club name is required" });
      const [row] = await sql`
        INSERT INTO clubs (name, description, website_url, is_active, sort_order)
        VALUES (${b.name}, ${b.description ?? null}, ${b.websiteUrl ?? null},
                ${b.active ?? true},
                COALESCE((SELECT MAX(sort_order)+1 FROM clubs), 0))
        RETURNING id`;
      await replaceMethods(row.id, b.paymentMethods);
      return json(res, 201, await loadAll());
    }

    if (req.method === "PUT") {
      if (!id) return json(res, 400, { error: "id required" });
      const b = await readBody(req);
      if (!b.name) return json(res, 400, { error: "Club name is required" });
      await sql`
        UPDATE clubs SET name = ${b.name}, description = ${b.description ?? null},
          website_url = ${b.websiteUrl ?? null}, is_active = ${b.active ?? true}
        WHERE id = ${id}`;
      await replaceMethods(id, b.paymentMethods);
      return json(res, 200, await loadAll());
    }

    if (req.method === "DELETE") {
      if (!id) return json(res, 400, { error: "id required" });
      await sql`DELETE FROM clubs WHERE id = ${id}`;
      return json(res, 200, await loadAll());
    }
  } catch (e) {
    console.error("admin/clubs failed:", e);
    json(res, 500, { error: "Club operation failed" });
  }
}
