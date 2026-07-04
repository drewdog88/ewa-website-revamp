// Tiny helpers for Vercel Node serverless functions.

export function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function methodGuard(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    res.setHeader("Allow", allowed.join(", "));
    json(res, 405, { error: "Method not allowed" });
    return false;
  }
  return true;
}

// Read and JSON-parse the request body (Vercel may pre-parse req.body).
export async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return {}; }
}
