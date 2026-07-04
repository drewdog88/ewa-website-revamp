// GET /api/auth/me -> { username } if authenticated, else 401.
import { json, methodGuard } from "../_lib/http.js";
import { getUser } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (!methodGuard(req, res, ["GET"])) return;
  const user = getUser(req);
  if (!user) return json(res, 401, { error: "Not authenticated" });
  json(res, 200, { username: user.username });
}
