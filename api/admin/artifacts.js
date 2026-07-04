// Admin artifact storage (auth required). Files are stored as bytea in Postgres.
//   GET                         -> list artifact metadata (no bytes)
//   POST { filename, mimeType, dataBase64 } -> store a file, returns {id, url}
//   DELETE ?id                  -> delete an artifact
import { sql } from "../_lib/db.js";
import { json, methodGuard, readBody } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB ceiling to stay within serverless limits

const list = () => sql`
  SELECT id, filename, mime_type, octet_length(bytes) AS size, uploaded_at
  FROM artifacts ORDER BY uploaded_at DESC, id DESC`;

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET", "POST", "DELETE"])) return;
  if (!requireAuth(req, res)) return;
  const id = req.query?.id ? Number(req.query.id) : null;

  try {
    if (req.method === "GET") return json(res, 200, await list());

    if (req.method === "POST") {
      const b = await readBody(req);
      if (!b.filename || !b.dataBase64) return json(res, 400, { error: "filename and dataBase64 are required" });
      const buf = Buffer.from(b.dataBase64, "base64");
      if (!buf.length) return json(res, 400, { error: "Empty file" });
      if (buf.length > MAX_BYTES) return json(res, 413, { error: "File too large (max 8 MB)" });
      const [row] = await sql`
        INSERT INTO artifacts (filename, mime_type, bytes)
        VALUES (${b.filename}, ${b.mimeType ?? "application/octet-stream"}, decode(${b.dataBase64}, 'base64'))
        RETURNING id, filename, mime_type`;
      return json(res, 201, { id: row.id, filename: row.filename, mimeType: row.mime_type, url: `/api/artifacts/${row.id}` });
    }

    if (req.method === "DELETE") {
      if (!id) return json(res, 400, { error: "id required" });
      await sql`DELETE FROM artifacts WHERE id = ${id}`;
      return json(res, 200, await list());
    }
  } catch (e) {
    console.error("admin/artifacts failed:", e);
    json(res, 500, { error: "Artifact operation failed" });
  }
}
