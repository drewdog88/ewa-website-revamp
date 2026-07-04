// Public GET for a stored artifact (PDF, image, doc) served from bytea.
//   GET /api/artifacts/:id  -> the raw file with its stored mime type
// bytes are fetched base64-encoded so we don't depend on the driver's bytea parsing.
import { sql } from "../_lib/db.js";
import { json, methodGuard } from "../_lib/http.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;

  const id = Number(req.query?.id);
  if (!Number.isInteger(id) || id <= 0) return json(res, 400, { error: "Invalid artifact id" });

  try {
    const rows = await sql`
      SELECT filename, mime_type, encode(bytes, 'base64') AS b64
      FROM artifacts WHERE id = ${id}`;
    if (!rows.length) return json(res, 404, { error: "Not found" });

    const { filename, mime_type, b64 } = rows[0];
    const buf = Buffer.from(b64 || "", "base64");
    res.status(200);
    res.setHeader("Content-Type", mime_type || "application/octet-stream");
    res.setHeader("Content-Length", buf.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Disposition", `inline; filename="${(filename || "file").replace(/"/g, "")}"`);
    res.end(buf);
  } catch (e) {
    console.error("artifacts serve failed:", e);
    json(res, 500, { error: "Failed to load artifact" });
  }
}
