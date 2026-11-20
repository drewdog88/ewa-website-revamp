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

/** Allowed hrefs inside news bodies (markdown + bare URLs). */
export function newsHref(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^#[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  if (/^\/#[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;
  if (ARTIFACT_PATH.test(trimmed)) return trimmed;
  return httpUrl(trimmed);
}

// Same shapes renderBody accepts, plus protocol-relative `//…` so we can reject it.
const NEWS_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/\/[^\s)]+|[/#][^\s)]+)\)|(https?:\/\/[^\s]+)/g;

/** Optional news body: empty -> null; every embedded link must pass newsHref. */
export function normalizeNewsBody(value) {
  if (value == null || value === "") return { body: null };
  if (typeof value !== "string") return { error: "Body must be text" };
  if (value.length > 20000) return { error: "Body is too long" };
  NEWS_LINK_RE.lastIndex = 0;
  let m;
  while ((m = NEWS_LINK_RE.exec(value)) !== null) {
    const href = m[2] ?? m[3];
    if (!newsHref(href)) return { error: "News body contains an unsafe link" };
  }
  return { body: value };
}

/** Optional short text field (title/tag/headline). Empty -> null when allowEmpty. */
export function normalizeText(value, { label = "Text", max = 500, allowEmpty = true } = {}) {
  if (value == null || value === "") {
    return allowEmpty ? { text: null } : { error: `${label} is required` };
  }
  if (typeof value !== "string") return { error: `${label} must be text` };
  const text = value.trim();
  if (!text) return allowEmpty ? { text: null } : { error: `${label} is required` };
  if (text.length > max) return { error: `${label} is too long` };
  return { text };
}

/**
 * Optional cents field for fundraiser writes.
 * `undefined` means leave unchanged; otherwise must be a non-negative integer.
 */
export function normalizeCents(value, label = "Amount") {
  if (value === undefined) return { skip: true };
  if (value === null || value === "") return { cents: 0 };
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 100_000_000_00) {
    return { error: `${label} must be a non-negative whole number of cents` };
  }
  return { cents: n };
}
