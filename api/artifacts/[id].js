// Public GET for a stored artifact (PDF, image, doc) served from bytea.
//   GET /api/artifacts/:id  -> the raw file with its stored mime type
// bytes are fetched base64-encoded so we don't depend on the driver's bytea parsing.
// Content-Type is taken from magic bytes for known safe inline types. Anything
// else (including HTML/SVG claimed as text/html) downloads as octet-stream so
// it cannot execute as a page on this origin.
import { sql } from "../_lib/db.js";
import { json, methodGuard } from "../_lib/http.js";

function safeFilename(name) {
  const base = String(name || "file")
    .replace(/[\u0000-\u001f\u007f"\\]/g, "")
    .replace(/[^A-Za-z0-9._ ()-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return base || "file";
}

function detectedInlineMime(buf) {
  if (!buf || buf.length < 3) return null;
  if (buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 6) {
    const gif = buf.subarray(0, 6).toString("latin1");
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("latin1") === "RIFF" &&
    buf.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;

  const id = Number(req.query?.id);
  if (!Number.isInteger(id) || id <= 0) return json(res, 400, { error: "Invalid artifact id" });

  try {
    const rows = await sql`
      SELECT filename, mime_type, encode(bytes, 'base64') AS b64
      FROM artifacts WHERE id = ${id}`;
    if (!rows.length) return json(res, 404, { error: "Not found" });

    const { filename, b64 } = rows[0];
    const buf = Buffer.from(b64 || "", "base64");
    const inlineMime = detectedInlineMime(buf);
    const safeName = safeFilename(filename);

    res.status(200);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", inlineMime || "application/octet-stream");
    res.setHeader("Content-Length", buf.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader(
      "Content-Disposition",
      `${inlineMime ? "inline" : "attachment"}; filename="${safeName}"`,
    );
    if (!inlineMime) res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.end(buf);
  } catch (e) {
    console.error("artifacts serve failed:", e);
    json(res, 500, { error: "Failed to load artifact" });
  }
}
