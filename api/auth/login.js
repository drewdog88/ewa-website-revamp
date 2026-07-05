// POST /api/auth/login  { username, password } -> sets session cookie.
import bcrypt from "bcryptjs";
import { checkBotId } from "botid/server";
import { sql } from "../_lib/db.js";
import { json, methodGuard, readBody } from "../_lib/http.js";
import { signSession, setSessionCookie } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    // Block automated login attempts before touching the DB / bcrypt.
    const verification = await checkBotId({ advancedOptions: { headers: req.headers } });
    if (verification.isBot) return json(res, 403, { error: "Access denied" });

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
