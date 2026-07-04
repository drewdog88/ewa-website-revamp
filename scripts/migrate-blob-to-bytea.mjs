// One-off migration: pull resource documents that still live on the OLD Vercel
// Blob store into the NEW database as `bytea` artifacts, so the resource library
// is fully self-hosted (per the spec — "the resource library replaces Blob").
//
// For each resource whose `url` points at *.blob.vercel-storage.com:
//   1. download the file (these blob URLs are public),
//   2. INSERT it into `artifacts` (filename, mime_type, bytes) as bytea,
//   3. UPDATE the resource to set artifact_id and clear url.
//
// Idempotent: it only touches rows that STILL have a blob url, so re-running is safe.
// External website links (lwsd.org, wiaa.com, boosterspark, …) are left untouched.
//
// Usage: node scripts/migrate-blob-to-bytea.mjs [--dry-run]
import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./lib/env.mjs";

const DRY = process.argv.includes("--dry-run");
const env = loadEnv();
if (!env.NEW_DATABASE_URL) {
  console.error("NEW_DATABASE_URL is not set in .env.migrate");
  process.exit(1);
}
const sql = neon(env.NEW_DATABASE_URL);

const EXT_MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function nameFromUrl(u) {
  const path = new URL(u).pathname;
  return decodeURIComponent(path.split("/").pop() || "file");
}

const targets = await sql`
  SELECT id, title, url
  FROM resources
  WHERE url ILIKE '%blob.vercel-storage.com%'
  ORDER BY id`;

if (!targets.length) {
  console.log("Nothing to migrate — no resources point at Vercel Blob. ✅");
  process.exit(0);
}

console.log(`Found ${targets.length} blob-hosted resource(s) to migrate${DRY ? " (dry run)" : ""}:\n`);

for (const r of targets) {
  const filename = nameFromUrl(r.url);
  const ext = (filename.split(".").pop() || "").toLowerCase();
  process.stdout.write(`  #${r.id} "${r.title}" -> ${filename} ... `);

  const resp = await fetch(r.url);
  if (!resp.ok) {
    console.log(`SKIP (download failed: HTTP ${resp.status})`);
    continue;
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  const mime = resp.headers.get("content-type")?.split(";")[0]?.trim() || EXT_MIME[ext] || "application/octet-stream";
  const b64 = buf.toString("base64");

  if (DRY) {
    console.log(`would store ${buf.length} bytes (${mime})`);
    continue;
  }

  const [art] = await sql`
    INSERT INTO artifacts (filename, mime_type, bytes)
    VALUES (${filename}, ${mime}, decode(${b64}, 'base64'))
    RETURNING id`;
  await sql`
    UPDATE resources
    SET artifact_id = ${art.id}, url = NULL
    WHERE id = ${r.id}`;
  console.log(`stored ${buf.length} bytes as artifact #${art.id}, resource now served from /api/artifacts/${art.id}`);
}

console.log("\nDone.");
