# How It Works

This page traces the two journeys that matter: a **visitor loading the public
site**, and an **admin logging in and saving a change**. If you understand these
two flows, you understand the whole system.

![Two journeys through the EWA site — left, a visitor opens the site: the browser gets one static React bundle from Vercel's CDN, the app fires five content requests in parallel, each serverless function runs one read query against Neon and returns JSON, and sections render independently. Right, a board member edits: they sign in and the password is checked with bcrypt, the server issues a signed JWT in an HttpOnly Secure cookie, every /api/admin call re-verifies the cookie before touching the database, and a save is a single guarded write returning the refreshed list](assets/request-lifecycle.png)

## Flow 1 — A visitor loads the site

Key properties:

- **Parallel, independent loads.** `App.tsx` fires all five content requests at
  once and `.catch(() => {})` each. One slow or failing endpoint never blocks the
  others — the worst case is one empty section.
- **Public endpoints filter server-side.** `/api/news` returns only
  `is_published = TRUE`; `/api/clubs` and `/api/resources` return only
  `is_active = TRUE`. Draft/hidden content never reaches the browser.
- **Files resolve to a URL.** `/api/resources` returns `url` when the resource is
  an external link, or `/api/artifacts/<id>` when it's an uploaded file — the
  front-end treats both the same (see [Payments](Payments) and
  [Database](Database) for the `url`-vs-`artifact_id` rule).

## Flow 2 — An admin logs in and edits

*(The right-hand panel of the diagram above walks this journey step by step.)*

### Authentication in detail

- **Login.** `POST /api/auth/login` looks up the user, `bcrypt.compare`s the
  submitted password against the stored hash, and on success signs a JWT
  (`{ sub: username }`, 7-day expiry) with `JWT_SECRET`.
- **The session cookie.** The JWT is returned as `ewa_session` — **HttpOnly,
  Secure, SameSite=Lax, Path=/**. HttpOnly means JavaScript can't read it, which
  blunts token theft via XSS. The browser attaches it automatically to every
  same-origin `/api` call.
- **Guarding writes.** Every `/api/admin/*` handler calls `requireAuth(req, res)`
  first; no valid cookie → `401` and the handler never touches the database.
- **Staying logged in.** On page load the app calls `/api/auth/me`; a valid
  cookie returns `{ username }` and the admin skips the login screen. `logout`
  clears the cookie.

> The cookie parsing/serialization is intentionally hand-rolled in `auth.js`
> rather than pulled from the `cookie` npm package — that package shipped a
> breaking rename across a major version that silently broke auth in production.
> One session cookie doesn't need a dependency.

## Flow 3 — Serving an uploaded file

When the browser requests `GET /api/artifacts/7`, the function:

1. Runs `SELECT filename, mime_type, encode(bytes,'base64')` for that id.
2. Rebuilds the raw bytes with `Buffer.from(b64,'base64')`.
3. Returns `200` with the stored `Content-Type`, an `inline`
   `Content-Disposition` carrying the filename, and `Cache-Control: public,
   max-age=3600`.

Files are round-tripped as base64 out of Postgres so the code never depends on
the driver's raw `bytea` handling. Uploads (admin side) are capped at **8 MB** to
stay within serverless limits and are stored with `decode(dataBase64,'base64')`.

## Where the pieces are defined

| Concept | Code |
|---|---|
| View switching (site/login/admin) | `src/app/App.tsx` |
| Public content fetchers | `src/app/api.ts` → `/api/*.js` |
| Session cookie + JWT | `api/_lib/auth.js` |
| Uniform JSON / method guard / body read | `api/_lib/http.js` |
| Shared Neon client | `api/_lib/db.js` |
| Zelle QR URL build/decode | `api/_lib/zelle.js` |