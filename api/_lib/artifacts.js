// Shared artifact filename + MIME helpers for admin upload and public serve.

/** Strip path bits and control chars; keep a short display-safe name. */
export function safeFilename(name) {
  const raw = String(name || "file").replace(/\\/g, "/");
  const leaf = raw.includes("/") ? raw.slice(raw.lastIndexOf("/") + 1) : raw;
  const base = leaf
    .replace(/[\u0000-\u001f\u007f"\\]/g, "")
    .replace(/[^A-Za-z0-9._ ()-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return base || "file";
}

/**
 * Detect MIME from magic bytes for types safe to serve inline.
 * Returns null for unknown / unsafe content (caller should use octet-stream).
 */
export function detectedInlineMime(buf) {
  if (!buf || buf.length < 3) return null;
  if (buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
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

/** MIME to store on upload: sniffed type, else octet-stream (never trust client claim). */
export function storeMime(buf) {
  return detectedInlineMime(buf) || "application/octet-stream";
}
