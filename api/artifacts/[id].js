// Public GET for a stored artifact (PDF, image, doc) served from bytea.
//   GET /api/artifacts/:id  -> the raw file with its stored mime type
// bytes are fetched base64-encoded so we don't depend on the driver's bytea parsing.
// Content-Type is taken from magic bytes for known safe inline types. Anything
// else (including HTML/SVG claimed as text/html) downloads as octet-stream so
// it cannot execute as a page on this origin.
import { sql } from "../_lib/db.js";
import { json, methodGuard } from "../_lib/http.js";
import { detectedInlineMime, safeFilename } from "../_lib/artifacts.js";

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
