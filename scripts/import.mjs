// One-shot idempotent import: OLD prod (read-only) -> NEW schema.
// Re-runnable: truncates NEW content tables first, then re-imports.
// NEVER writes to the OLD database.
// Usage: node scripts/import.mjs
import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./lib/env.mjs";

const env = loadEnv();
const OLD = neon(env.OLD_PROD_DATABASE_URL); // read-only
const NEW = neon(env.NEW_DATABASE_URL);      // target

// Decode the email/phone token embedded in a Zelle enroll URL.
function zelleToken(url) {
  try {
    const data = new URL(url).searchParams.get("data");
    if (!data) return null;
    const json = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
    return json.token || null;
  } catch {
    return null;
  }
}

// --- wipe NEW content tables (keep users/artifacts/fundraiser) ---------------
await NEW.query(
  "TRUNCATE payment_methods, clubs, officers, news, resources RESTART IDENTITY CASCADE"
);

// --- clubs + payment_methods -------------------------------------------------
const oldClubs = await OLD`
  SELECT name, description, website_url, is_active, sort_order,
         zelle_url, qr_code_settings, stripe_url,
         stripe_donation_link, stripe_membership_link, stripe_fees_link
  FROM booster_clubs
  ORDER BY sort_order NULLS LAST, name`;

let clubN = 0, pmN = 0;
for (const c of oldClubs) {
  const [row] = await NEW`
    INSERT INTO clubs (name, description, website_url, is_active, sort_order)
    VALUES (${c.name}, ${c.description}, ${c.website_url},
            ${c.is_active ?? true}, ${c.sort_order ?? 0})
    RETURNING id`;
  const clubId = row.id;
  clubN++;

  const methods = [];
  if (c.zelle_url) {
    methods.push({
      type: "zelle", label: "Zelle", value: c.zelle_url,
      token: zelleToken(c.zelle_url), qr: c.qr_code_settings,
    });
  }
  if (c.stripe_url)
    methods.push({ type: "stripe", label: "Pay / Donate", value: c.stripe_url });
  if (c.stripe_donation_link)
    methods.push({ type: "stripe", label: "Donation", value: c.stripe_donation_link });
  if (c.stripe_membership_link)
    methods.push({ type: "stripe", label: "Membership", value: c.stripe_membership_link });
  if (c.stripe_fees_link)
    methods.push({ type: "stripe", label: "Fees", value: c.stripe_fees_link });

  let order = 0;
  for (const m of methods) {
    await NEW`
      INSERT INTO payment_methods
        (club_id, type, label, value, display_token, qr_settings, sort_order, is_active)
      VALUES (${clubId}, ${m.type}, ${m.label}, ${m.value},
              ${m.token ?? null}, ${m.qr ?? null}, ${order++}, TRUE)`;
    pmN++;
  }
}

// --- officers ----------------------------------------------------------------
const oldOfficers = await OLD`
  SELECT name, position, email FROM officers ORDER BY created_at NULLS LAST, name`;
let offN = 0;
for (const [i, o] of oldOfficers.entries()) {
  await NEW`
    INSERT INTO officers (name, role, email, sort_order)
    VALUES (${o.name}, ${o.position}, ${o.email}, ${i})`;
  offN++;
}

// --- news --------------------------------------------------------------------
const oldNews = await OLD`
  SELECT title, content, status, published_at FROM news ORDER BY published_at NULLS LAST`;
let newsN = 0;
for (const n of oldNews) {
  const published = (n.status || "").toLowerCase() === "published";
  await NEW`
    INSERT INTO news (title, body, tag, is_published, published_at)
    VALUES (${n.title}, ${n.content}, ${null}, ${published}, ${n.published_at})`;
  newsN++;
}

// --- resources (from old links) ----------------------------------------------
const oldLinks = await OLD`
  SELECT title, url, order_index, is_visible FROM links ORDER BY order_index NULLS LAST`;
let resN = 0;
for (const [i, l] of oldLinks.entries()) {
  await NEW`
    INSERT INTO resources (title, description, url, sort_order, is_active)
    VALUES (${l.title}, ${null}, ${l.url}, ${l.order_index ?? i}, ${l.is_visible ?? true})`;
  resN++;
}

console.log(
  `Imported: ${clubN} clubs, ${pmN} payment methods, ${offN} officers, ${newsN} news, ${resN} resources`
);
