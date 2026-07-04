// Session auth: signed HTTP-only cookie holding a short JWT. Single admin class.
import jwt from "jsonwebtoken";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";

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
