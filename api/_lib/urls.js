// Allow-list for URLs and emails that end up in public hrefs.
// javascript:, data:, and protocol-relative links are rejected.

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
const ARTIFACT_PATH = /^\/api\/artifacts\/\d+$/;

function parseUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

export function httpUrl(value) {
  const url = parseUrl(value);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return null;
  return url.toString();
}

export function httpsUrl(value) {
  const url = parseUrl(value);
  if (!url || url.protocol !== "https:") return null;
  return url.toString();
}

export function zelleUrl(value) {
  const url = parseUrl(value);
  if (!url || url.protocol !== "https:" || url.hostname !== "enroll.zellepay.com") return null;
  return url.toString();
}

/** External http(s) link, or a same-origin uploaded artifact path. */
export function resourceUrl(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (ARTIFACT_PATH.test(trimmed)) return trimmed;
  return httpUrl(trimmed);
}

export function isSafeEmail(value) {
  return typeof value === "string" && value.length <= 254 && EMAIL.test(value.trim()) && value.trim() === value;
}

/** Optional website field for admin club writes. Empty -> null. */
export function normalizeWebsite(value) {
  if (value == null || value === "") return { url: null };
  const url = httpUrl(value);
  if (!url) return { error: "Website must be an http(s) URL" };
  return { url };
}

/** Optional resource link for admin writes. Empty -> null. */
export function normalizeResourceLink(value) {
  if (value == null || value === "") return { url: null };
  const url = httpUrl(value);
  if (!url) return { error: "Link must be an http(s) URL" };
  return { url };
}

/** Optional officer email for admin writes. Empty -> null. */
export function normalizeEmail(value) {
  if (value == null || value === "") return { email: null };
  const email = typeof value === "string" ? value.trim() : "";
  if (!isSafeEmail(email)) return { error: "Email address is not valid" };
  return { email };
}
