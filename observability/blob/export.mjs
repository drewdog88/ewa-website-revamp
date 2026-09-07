// Pull the private ewa-ops R2 object and push it to Pushgateway.
// Outbound only. No tunnel. No public URL.

import { createHash, createHmac } from "node:crypto";

const PUSHGATEWAY = process.env.PUSHGATEWAY_URL || "http://ewa-pushgateway:9091";
const INTERVAL_MS = Number(process.env.OPS_POLL_MS || 30000);
const REGION = "auto";
const SERVICE = "s3";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key, data) {
  return createHmac("sha256", key).update(data).digest();
}

function r2Get() {
  const accountId = process.env.OPS_R2_ACCOUNT_ID || "b634987a212c68fdbb0a83ea4eade83b";
  const packed = process.env.OPS_R2_CREDENTIALS || "";
  const sep = packed.indexOf(",");
  const accessKey = (sep >= 0 ? packed.slice(0, sep) : process.env.OPS_R2_ACCESS_KEY_ID || "").trim();
  const secretKey = (sep >= 0 ? packed.slice(sep + 1) : process.env.OPS_R2_SECRET_ACCESS_KEY || "").trim();
  const bucket = process.env.OPS_R2_BUCKET || "ewa-ops";
  const objectKey = process.env.OPS_R2_KEY || "stats.json";
  if (!accessKey || !secretKey) return null;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const path = `/${bucket}/${objectKey}`;
  const now = new Date();
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const ymd = date.slice(0, 8);
  const payloadHash = sha256Hex("");
  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${date}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["GET", path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${ymd}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", date, scope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, ymd), REGION), SERVICE), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return fetch(`https://${host}${path}`, {
    headers: {
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": date,
    },
  });
}

function escapeLabel(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/"/g, "\\\"");
}

function toMetrics(stats) {
  const lines = [
    "# TYPE ewa_ops_updated_timestamp gauge",
    `ewa_ops_updated_timestamp ${stats.updatedAt ? Date.parse(stats.updatedAt) / 1000 : 0}`,
    "# TYPE ewa_api_requests_total gauge",
    "# TYPE ewa_login_total gauge",
    "# TYPE ewa_recent_errors gauge",
  ];

  for (const [key, count] of Object.entries(stats.requests || {})) {
    const sep = key.lastIndexOf("|");
    const path = sep >= 0 ? key.slice(0, sep) : key;
    const status = sep >= 0 ? key.slice(sep + 1) : "unknown";
    lines.push(
      `ewa_api_requests_total{path="${escapeLabel(path)}",status="${escapeLabel(status)}"} ${Number(count) || 0}`,
    );
  }

  const logins = stats.logins || {};
  for (const result of ["ok", "fail", "blocked"]) {
    lines.push(`ewa_login_total{result="${result}"} ${Number(logins[result]) || 0}`);
  }

  const recent = Array.isArray(stats.recent) ? stats.recent : [];
  lines.push(`ewa_recent_errors ${recent.length}`);
  if (recent[0]) {
    lines.push("# TYPE ewa_last_error_info gauge");
    lines.push(
      `ewa_last_error_info{path="${escapeLabel(recent[0].path)}",status="${escapeLabel(recent[0].status)}",message="${escapeLabel(recent[0].message || "")}"} 1`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

async function pushOnce() {
  const request = r2Get();
  if (!request) {
    console.log("OPS_R2_* credentials are empty; waiting.");
    return;
  }
  const res = await request;
  if (res.status === 404) {
    console.log("R2 stats object not written yet");
    return;
  }
  if (!res.ok) throw new Error(`R2 GET ${res.status}`);
  const stats = await res.json();
  const dest = `${PUSHGATEWAY.replace(/\/$/, "")}/metrics/job/ewa_app/instance/vercel`;
  const push = await fetch(dest, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: toMetrics(stats),
  });
  if (!push.ok) throw new Error(`pushgateway ${push.status}`);
  console.log(`pushed ${stats.updatedAt || "no-timestamp"}`);
}

async function main() {
  console.log(`R2 exporter started; interval=${INTERVAL_MS}ms`);
  for (;;) {
    try {
      await pushOnce();
    } catch (err) {
      console.error("export failed:", err?.message || err);
    }
    await sleep(INTERVAL_MS);
  }
}

main();
