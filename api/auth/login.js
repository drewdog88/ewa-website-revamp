// POST /api/auth/login  { username, password, turnstileToken } -> sets session cookie.
import bcrypt from "bcryptjs";
import { checkBotId } from "botid/server";
import { sql } from "../_lib/db.js";
import { json, methodGuard, readBody } from "../_lib/http.js";
import { signSession, setSessionCookie } from "../_lib/auth.js";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Best-effort client IP for Turnstile's optional remoteip check.
function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  return req.headers["x-real-ip"] || undefined;
}

// Verify a Cloudflare Turnstile token. Returns { ok, reason }.
// If TURNSTILE_SECRET_KEY is not configured the check is skipped (and logged)
// so that a missing env var can never lock admins out; it only weakens
// protection, which is visible in the logs.
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("TURNSTILE_SECRET_KEY is not set; skipping Turnstile verification");
    return { ok: true, reason: "not-configured" };
  }
  if (!token || typeof token !== "string") return { ok: false, reason: "missing-token" };

  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  const r = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
  const data = await r.json().catch(() => ({}));
  if (!data.success) return { ok: false, reason: (data["error-codes"] || ["unknown"]).join(",") };
  return { ok: true, reason: "verified" };
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["POST"])) return;
  try {
    // Primary bot protection: Cloudflare Turnstile (token issued by the widget
    // on the login form, verified here). Predictable and proxy-agnostic.
    const { username, password, turnstileToken } = await readBody(req);
    const captcha = await verifyTurnstile(turnstileToken, clientIp(req));
    if (!captcha.ok) {
      console.warn("Turnstile rejected login attempt", { host: req.headers.host, reason: captcha.reason });
      return json(res, 403, { error: "Security check failed" }, "/api/auth/login");
    }

    // Secondary: Vercel BotID classification, advisory by default. It can
    // misclassify real users (e.g. behind proxies or with stale cookies), so
    // only enforce when BOTID_ENFORCE_LOGIN=1 is set.
    const verification = await checkBotId({ advancedOptions: { headers: req.headers } });
    if (verification.isBot) {
      console.warn("BotID flagged login attempt", {
        host: req.headers.host,
        viaCloudflare: Boolean(req.headers["cf-ray"]),
        reason: verification.classificationReason,
      });
      if (process.env.BOTID_ENFORCE_LOGIN === "1") {
        return json(res, 403, { error: "Access denied" }, "/api/auth/login");
      }
    }

    if (!username || !password) return json(res, 400, { error: "Missing credentials" }, "/api/auth/login");

    const rows = await sql`SELECT password_hash FROM users WHERE username = ${username}`;
    const ok = rows.length && (await bcrypt.compare(password, rows[0].password_hash));
    if (!ok) return json(res, 401, { error: "Invalid username or password" }, "/api/auth/login");

    setSessionCookie(res, signSession(username));
    return json(res, 200, { ok: true, username }, "/api/auth/login");
  } catch (e) {
    console.error("POST /api/auth/login failed:", e);
    return json(res, 500, { error: "Login failed" }, "/api/auth/login");
  }
}
