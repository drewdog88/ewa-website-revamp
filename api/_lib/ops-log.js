// One overwritten private R2 object. No Vercel cron. No public URL.
// Dedicated bucket ewa-ops — not Vercel Blob, not other R2 buckets.

import { r2Configured, r2GetJson, r2ObjectKey, r2PutJson } from "./r2.js";

const MAX_RECENT = 25;
const MAX_RECENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DAY_SUMMARIES = 7;

const EMPTY = {
  updatedAt: null,
  day: null,
  requests: {},
  logins: { ok: 0, fail: 0, blocked: 0 },
  days: {},
  recent: [],
};

function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function requestPath(req) {
  const raw = req?.url || "";
  try {
    return new URL(raw, "http://localhost").pathname;
  } catch {
    return String(raw).split("?")[0] || "unknown";
  }
}

function loginResult(path, status) {
  if (path !== "/api/auth/login") return null;
  if (status === 200) return "ok";
  if (status === 401 || status === 400) return "fail";
  if (status === 403) return "blocked";
  return null;
}

function sanitizeMessage(body) {
  if (!body || typeof body !== "object") return null;
  const err = body.error;
  if (typeof err !== "string") return null;
  return err.slice(0, 160);
}

function countRequests(requests) {
  return Object.values(requests || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

function countErrors(requests) {
  return Object.entries(requests || {}).reduce((sum, [key, n]) => {
    const status = Number(key.split("|").pop());
    return status >= 400 ? sum + (Number(n) || 0) : sum;
  }, 0);
}

function rollDay(state, nextDay) {
  if (state.day && state.day !== nextDay) {
    state.days[state.day] = {
      requests: countRequests(state.requests),
      errors: countErrors(state.requests),
      loginsOk: Number(state.logins?.ok) || 0,
      loginsFail: Number(state.logins?.fail) || 0,
      loginsBlocked: Number(state.logins?.blocked) || 0,
    };
    state.requests = {};
    state.logins = { ok: 0, fail: 0, blocked: 0 };
  }
  state.day = nextDay;
  const keep = Object.keys(state.days || {}).sort().slice(-MAX_DAY_SUMMARIES);
  state.days = Object.fromEntries(keep.map((d) => [d, state.days[d]]));
}

function pruneRecent(recent, now) {
  const cutoff = now.getTime() - MAX_RECENT_AGE_MS;
  return (Array.isArray(recent) ? recent : [])
    .filter((row) => {
      const ts = Date.parse(row?.ts || "");
      return Number.isFinite(ts) && ts >= cutoff;
    })
    .slice(0, MAX_RECENT);
}

function normalize(data) {
  return {
    updatedAt: data.updatedAt || null,
    day: data.day || null,
    requests: data.requests && typeof data.requests === "object" ? data.requests : {},
    logins: {
      ok: Number(data.logins?.ok) || 0,
      fail: Number(data.logins?.fail) || 0,
      blocked: Number(data.logins?.blocked) || 0,
    },
    days: data.days && typeof data.days === "object" ? data.days : {},
    recent: Array.isArray(data.recent) ? data.recent : [],
  };
}

export function recordResponse(req, status, body) {
  if (!r2Configured()) return Promise.resolve();
  return writeResponse(req, status, body).catch((err) => {
    console.error("ops-log write failed:", err?.message || err);
  });
}

async function writeResponse(req, status, body) {
  const objectKey = r2ObjectKey();
  const path = requestPath(req);
  const now = new Date();
  const existing = await r2GetJson(objectKey);
  const state = normalize(existing || EMPTY);

  rollDay(state, utcDay(now));
  state.updatedAt = now.toISOString();
  const key = `${path}|${status}`;
  state.requests[key] = (Number(state.requests[key]) || 0) + 1;

  const login = loginResult(path, status);
  if (login) state.logins[login] = (Number(state.logins[login]) || 0) + 1;

  if (status >= 400) {
    state.recent.unshift({
      ts: state.updatedAt,
      path,
      status,
      message: sanitizeMessage(body),
    });
  }
  state.recent = pruneRecent(state.recent, now);

  await r2PutJson(objectKey, state);
}
