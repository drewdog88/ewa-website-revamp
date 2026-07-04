// GET /api/clubs — public list of active clubs with their payment methods.
// Each club also carries derived convenience fields the donate modal uses:
//   zelleUrl   — full enroll.zellepay.com URL for the QR code
//   zelleToken — decoded email/phone shown as the "Zelle To" text
//   paymentLink/paymentLabel — primary non-Zelle payment method
import { sql } from "./_lib/db.js";
import { json, methodGuard } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;
  try {
    const clubs = await sql`
      SELECT id, name, description, website_url, is_active, sort_order
      FROM clubs WHERE is_active = TRUE
      ORDER BY sort_order, name`;

    const methods = await sql`
      SELECT club_id, type, label, value, display_token
      FROM payment_methods WHERE is_active = TRUE
      ORDER BY club_id, sort_order, id`;

    const byClub = new Map();
    for (const m of methods) {
      if (!byClub.has(m.club_id)) byClub.set(m.club_id, []);
      byClub.get(m.club_id).push({
        type: m.type, label: m.label, value: m.value, displayToken: m.display_token,
      });
    }

    const out = clubs.map((c) => {
      const pms = byClub.get(c.id) || [];
      const zelle = pms.find((m) => m.type === "zelle");
      const link = pms.find((m) => m.type !== "zelle");
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        websiteUrl: c.website_url,
        active: c.is_active,
        sortOrder: c.sort_order,
        paymentMethods: pms,
        zelleUrl: zelle ? zelle.value : null,
        zelleToken: zelle ? zelle.displayToken : null,
        paymentLink: link ? link.value : null,
        paymentLabel: link ? link.label : null,
      };
    });

    json(res, 200, out);
  } catch (e) {
    console.error("GET /api/clubs failed:", e);
    json(res, 500, { error: "Failed to load clubs" });
  }
}
