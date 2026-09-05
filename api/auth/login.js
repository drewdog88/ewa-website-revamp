// POST /api/auth/login  { username, password } -> sets session cookie.
import bcrypt from "bcryptjs";
import { checkBotId } from "botid/server";
import { sql } from "../_lib/db.js";
import { json, methodGuard, readBody } from "../_lib/http.js";
import { signSession, setSessionCookie } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    // Vercel BotID classification. www.eastlakewolfpack.org is proxied through
    // Cloudflare, which hides the client signals BotID needs, so real users are
    // classified as bots there (login works on the *.vercel.app host only).
    // Until the Cloudflare proxy is turned off (DNS-only), the check is
    // advisory: log the result, but only enforce when BOTID_ENFORCE_LOGIN=1.
    const verification = await checkBotId({ advancedOptions: { headers: req.headers } });
    if (verification.isBot) {
      console.warn("BotID flagged login attempt", {
        host: req.headers.host,
        viaCloudflare: Boolean(req.headers["cf-ray"]),
        reason: verification.classificationReason,
      });
      if (process.env.BOTID_ENFORCE_LOGIN === "1") {
        return json(res, 403, { error: "Access denied" });
      }
    }

    const { username, password } = await readBody(req);
    if (!username || !password) return json(res, 400, { error: "Missing credentials" });

    const rows = await sql`SELECT password_hash FROM users WHERE username = ${username}`;
    const ok = rows.length && (await bcrypt.compare(password, rows[0].password_hash));
    if (!ok) return json(res, 401, { error: "Invalid username or password" });

    setSessionCookie(res, signSession(username));
    json(res, 200, { ok: true, username });
  } catch (e) {
    console.error("POST /api/auth/login failed:", e);
    json(res, 500, { error: "Login failed" });
  }
}
