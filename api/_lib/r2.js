// Private Cloudflare R2 access for the dedicated ewa-ops bucket.
// Uses bucket-scoped S3 credentials. Never uses Vercel Blob tokens.
import { createHash, createHmac } from "node:crypto";

const REGION = "auto";
const SERVICE = "s3";

function credentials() {
  const packed = process.env.OPS_R2_CREDENTIALS;
  if (packed && packed.includes(",")) {
    const sep = packed.indexOf(",");
    return {
      accessKey: packed.slice(0, sep).trim(),
      secretKey: packed.slice(sep + 1).trim(),
    };
  }
  return {
    accessKey: (process.env.OPS_R2_ACCESS_KEY_ID || "").trim(),
    secretKey: (process.env.OPS_R2_SECRET_ACCESS_KEY || "").trim(),
  };
}

function config() {
  const accountId = process.env.OPS_R2_ACCOUNT_ID || "b634987a212c68fdbb0a83ea4eade83b";
  const { accessKey, secretKey } = credentials();
  if (!accessKey || !secretKey) throw new Error("OPS_R2_CREDENTIALS is not set");
  return {
    accountId,
    bucket: process.env.OPS_R2_BUCKET || "ewa-ops",
    key: process.env.OPS_R2_KEY || "stats.json",
    accessKey,
    secretKey,
    host: `${accountId}.r2.cloudflarestorage.com`,
  };
}

function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key, data) {
  return createHmac("sha256", key).update(data).digest();
}

function amzDate(now) {
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sign({ method, path, body, now, cfg, extra = {} }) {
  const date = amzDate(now);
  const ymd = date.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const headerMap = {
    host: cfg.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": date,
    ...extra,
  };
  const names = Object.keys(headerMap).map((n) => n.toLowerCase()).sort();
  const canonicalHeaders = names.map((n) => `${n}:${headerMap[n]}\n`).join("");
  const signedHeaders = names.join(";");
  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${ymd}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    date,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${cfg.secretKey}`, ymd), REGION), SERVICE),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    date,
    payloadHash,
    signedHeaders,
    extra,
    authorization:
      `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

async function r2(method, objectKey, body = "", extra = {}) {
  const cfg = config();
  const path = `/${cfg.bucket}/${objectKey}`;
  const now = new Date();
  const signed = sign({ method, path, body, now, cfg, extra });
  const res = await fetch(`https://${cfg.host}${path}`, {
    method,
    headers: {
      Authorization: signed.authorization,
      "x-amz-content-sha256": signed.payloadHash,
      "x-amz-date": signed.date,
      ...extra,
    },
    body: method === "GET" || method === "DELETE" ? undefined : body,
  });
  return res;
}

export function r2Configured() {
  const { accessKey, secretKey } = credentials();
  return Boolean(accessKey && secretKey);
}

export function r2ObjectKey() {
  return process.env.OPS_R2_KEY || "stats.json";
}

export async function r2GetJson(objectKey) {
  const res = await r2("GET", objectKey);
  if (res.status === 404) return { data: null, etag: null };
  if (!res.ok) throw new Error(`R2 GET ${res.status}`);
  return { data: await res.json(), etag: res.headers.get("etag") };
}

export async function r2PutJson(objectKey, data, etag) {
  const body = JSON.stringify(data);
  const extra = {
    "content-type": "application/json",
    ...(etag ? { "if-match": etag.trim() } : {}),
  };
  const res = await r2("PUT", objectKey, body, extra);
  if (res.status === 412) return false;
  if (!res.ok) throw new Error(`R2 PUT ${res.status}`);
  return true;
}
