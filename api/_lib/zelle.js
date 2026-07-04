// Build / decode Zelle enrollment QR URLs.
// Canonical format (matches Eastlake's real production data):
//   https://enroll.zellepay.com/qr-codes?data=<base64 of {name,action,token}>
// JSON key order is name, action, token; base64 padding ("=") is stripped.

export function buildZelleUrl(name, token) {
  const json = JSON.stringify({ name, action: "payment", token });
  const b64 = Buffer.from(json, "utf8").toString("base64").replace(/=+$/, "");
  return `https://enroll.zellepay.com/qr-codes?data=${b64}`;
}

// Full decode -> { name, token } (or null). Used by admin to pre-fill the form.
export function decodeZelle(url) {
  try {
    const data = new URL(url).searchParams.get("data");
    if (!data) return null;
    const json = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
    return { name: json.name ?? null, token: json.token ?? null };
  } catch {
    return null;
  }
}

export function decodeZelleToken(url) {
  return decodeZelle(url)?.token ?? null;
}
