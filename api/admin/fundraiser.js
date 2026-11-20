// Admin read/update for the single fundraiser row (auth required).
//   GET  -> current fundraiser (creates a default row if none exists)
//   PUT  { headline, goalCents, raisedCents, isActive }
import { sql } from "../_lib/db.js";
import { json, methodGuard, readBody } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";
import { normalizeCents, normalizeText } from "../_lib/urls.js";

async function current() {
  let rows = await sql`SELECT * FROM fundraiser ORDER BY id LIMIT 1`;
  if (!rows.length) {
    rows = await sql`INSERT INTO fundraiser (headline, goal_cents, raised_cents, is_active)
                     VALUES (${"Fundraiser"}, 0, 0, FALSE) RETURNING *`;
  }
  const f = rows[0];
  return {
    id: f.id, headline: f.headline, goalCents: f.goal_cents,
    raisedCents: f.raised_cents, isActive: f.is_active, updatedAt: f.updated_at,
  };
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "PUT"])) return;
  if (!requireAuth(req, res)) return;
  try {
    if (req.method === "GET") return json(res, 200, await current());

    const b = await readBody(req);
    const f = await current();

    let headline = f.headline;
    if (b.headline !== undefined) {
      const h = normalizeText(b.headline, { label: "Headline", max: 200 });
      if (h.error) return json(res, 400, { error: h.error });
      headline = h.text ?? "Fundraiser";
    }

    const goal = normalizeCents(b.goalCents, "Goal");
    if (goal.error) return json(res, 400, { error: goal.error });
    const raised = normalizeCents(b.raisedCents, "Raised");
    if (raised.error) return json(res, 400, { error: raised.error });

    let isActive = f.isActive;
    if (b.isActive !== undefined) isActive = !!b.isActive;

    await sql`
      UPDATE fundraiser SET
        headline = ${headline},
        goal_cents = ${goal.skip ? f.goalCents : goal.cents},
        raised_cents = ${raised.skip ? f.raisedCents : raised.cents},
        is_active = ${isActive}
      WHERE id = ${f.id}`;
    return json(res, 200, await current());
  } catch (e) {
    console.error("admin/fundraiser failed:", e);
    json(res, 500, { error: "Fundraiser operation failed" });
  }
}
