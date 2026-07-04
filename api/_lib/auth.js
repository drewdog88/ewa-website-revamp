// Session auth: signed HTTP-only cookie holding a short JWT. Single admin class.
import jwt from "jsonwebtoken";

// Minimal cookie parse/serialize. Inlined on purpose: the `cookie` npm package
// shipped breaking API renames across majors (v2 dropped parse/serialize), which
// silently broke auth in production. One session cookie needs no dependency.
function serializeCookie(name, value, opts = {}) {
  let out = `${name}=${encodeURIComponent(value)}`;
  if (opts.maxAge != null) out += `; Max-Age=${Math.floor(opts.maxAge)}`;
  if (opts.path) out += `; Path=${opts.path}`;
  if (opts.httpOnly) out += "; HttpOnly";
  if (opts.secure) out += "; Secure";
  if (opts.sameSite) {
    const s = String(opts.sameSite);
    out += `; SameSite=${s.charAt(0).toUpperCase()}${s.slice(1)}`;
  }
  return out;
}

function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || k in out) continue;
    const raw = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(raw);
    } catch {
      out[k] = raw;
    }
  }
  return out;
}

const COOKIE = "ewa_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const secret = () => process.env.JWT_SECRET || "";

export function signSession(username) {
  return jwt.sign({ sub: username }, secret(), { expiresIn: MAX_AGE });
}

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", serializeCookie(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  }));
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", serializeCookie(COOKIE, "", {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0,
  }));
}

// Returns { username } if the request carries a valid session, else null.
export function getUser(req) {
  try {
    const token = parseCookie(req.headers.cookie || "")[COOKIE];
    if (!token) return null;
    const payload = jwt.verify(token, secret());
    return { username: payload.sub };
  } catch {
    return null;
  }
}

// Guard: returns the user, or sends 401 and returns null.
export function requireAuth(req, res) {
  const user = getUser(req);
  if (!user) {
    res.status(401).setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ error: "Not authenticated" }));
    return null;
  }
  return user;
}
