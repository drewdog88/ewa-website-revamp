// Read-only: dump a few rows from the old prod tables we plan to import.
import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./lib/env.mjs";

const sql = neon(loadEnv()[process.argv[2] || "OLD_PROD_DATABASE_URL"]);
const show = (label, rows) => {
  console.log(`\n===== ${label} (${rows.length}) =====`);
  console.log(JSON.stringify(rows, null, 2));
};

show("booster_clubs (2 sample, payment fields)", await sql`
  SELECT name, is_active, is_payment_enabled, sort_order,
         zelle_url, stripe_url, stripe_donation_link, stripe_membership_link,
         stripe_fees_link, donation_url, payment_instructions, website_url,
         qr_code_settings
  FROM booster_clubs ORDER BY sort_order NULLS LAST, name LIMIT 2`);

show("booster_clubs names+order (all)", await sql`
  SELECT name, sort_order, is_active, is_payment_enabled,
         (zelle_url IS NOT NULL) AS has_zelle, (stripe_url IS NOT NULL) AS has_stripe
  FROM booster_clubs ORDER BY sort_order NULLS LAST, name`);

show("officers (all)", await sql`SELECT name, position, email, phone, club, club_name FROM officers`);
show("news (all)", await sql`SELECT title, LEFT(content, 80) AS content_start, slug, status, published_at FROM news`);
show("links (all)", await sql`SELECT title, url, category, order_index, is_visible FROM links ORDER BY order_index`);
show("users (username/role only, NO passwords)", await sql`SELECT username, role, club FROM users`);
