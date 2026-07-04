# API Reference

Every endpoint the site exposes. All live under `/api` as individual Vercel Node
serverless functions (ES modules). Responses are JSON with
`Cache-Control: no-store` unless noted. Admin routes require a valid session
cookie; everything else is public.

## Conventions

- **Auth:** `/api/admin/*` and `/api/auth/me` require the `ewa_session` cookie.
  Missing/invalid → `401 { "error": "Not authenticated" }`.
- **Methods:** each handler declares an allow-list; a disallowed method →
  `405 { "error": "Method not allowed" }` with an `Allow` header.
- **Errors:** validation → `400`; not found → `404`; too large → `413`;
  server → `500 { "error": "…" }` (details are logged, not returned).
- **IDs:** admin mutation routes take the row id as a query param, e.g.
  `PUT /api/admin/news?id=3`.

---

## Public endpoints (no auth)

| Method | Path | Returns | Notes |
|---|---|---|---|
| GET | `/api/clubs` | Active clubs, ordered by `sort_order` | Each includes its active `payment_methods` for the giving UI |
| GET | `/api/news` | Published announcements, newest first | Filters `is_published = TRUE`; maps `published_at`→`publishedAt` |
| GET | `/api/officers` | Board officers, ordered by `sort_order` | |
| GET | `/api/resources` | Active quick links / documents | `url` is the external link *or* `/api/artifacts/<id>` for uploads |
| GET | `/api/fundraiser` | The single active fundraiser row (or null) | `goal_cents` / `raised_cents` |
| GET | `/api/artifacts/:id` | The raw file bytes | Public; `Content-Type` from stored mime; `Cache-Control: public, max-age=3600` |

**Example — `GET /api/resources`:**

```json
[
  {
    "id": 3,
    "title": "Booster Club Guidance for Posters and Banners",
    "description": "Guidelines for team & individual banners.",
    "url": "/api/artifacts/3"
  },
  {
    "id": 8,
    "title": "WIAA Eligibility",
    "description": "State association rules.",
    "url": "https://www.wiaa.com/"
  }
]
```

Note the resolution rule: a resource points to **either** an external `url`
**or** an uploaded `artifact_id`, never both. The endpoint collapses that into a
single `url` field so the front-end doesn't care which it is.

---

## Auth endpoints

| Method | Path | Body | Effect |
|---|---|---|---|
| POST | `/api/auth/login` | `{ username, password }` | On success sets the `ewa_session` cookie; `401` on bad credentials |
| POST | `/api/auth/logout` | — | Clears the session cookie |
| GET | `/api/auth/me` | — (cookie) | `{ username }` if logged in, else `401` |

### Authentication

- Passwords are verified with **bcrypt** (`bcrypt.compare`) against the stored
  `password_hash`. Plaintext is never stored or logged.
- The session is a **JWT** (`{ sub: username }`, 7-day expiry) signed with the
  `JWT_SECRET` env var, delivered as the **HttpOnly, Secure, SameSite=Lax**
  cookie `ewa_session`.
- There is a single admin class — any valid session may edit all content.

---

## Admin endpoints (auth required)

All support `GET` (list) and mutation methods, and return the **refreshed list**
after a successful write so the UI can update without a second request.

| Resource | Path | Methods | Notes |
|---|---|---|---|
| Clubs | `/api/admin/clubs` | GET · POST · PUT · DELETE | Manages clubs and their nested `payment_methods` |
| News | `/api/admin/news` | GET · POST · PUT · DELETE | Returns camelCase (`isPublished`, `publishedAt`); publishing sets `published_at` |
| Officers | `/api/admin/officers` | GET · POST · PUT · DELETE | |
| Resources | `/api/admin/resources` | GET · POST · PUT · DELETE | Link either a `url` or an uploaded `artifactId` |
| Fundraiser | `/api/admin/fundraiser` | GET · PUT | Single row — update headline / goal / raised / active |
| Artifacts | `/api/admin/artifacts` | GET · POST · DELETE | File storage — see below |

### `POST /api/admin/artifacts` (file upload)

```json
// request
{ "filename": "handbook.pdf", "mimeType": "application/pdf", "dataBase64": "JVBERi0…" }

// 201 response
{ "id": 12, "filename": "handbook.pdf", "mimeType": "application/pdf", "url": "/api/artifacts/12" }
```

- **Max 8 MB** per file (`413` if larger). Empty payload → `400`.
- Stored as `bytea` via `decode(dataBase64,'base64')`; `GET` lists metadata only
  (id, filename, mime, `octet_length` size, uploaded_at) — never the bytes.
- Deleting an artifact sets any referencing `resources.artifact_id` to `NULL`
  (FK `ON DELETE SET NULL`), so a resource never points at a missing file.

### `POST` / `PUT /api/admin/news`

```json
{ "title": "…", "body": "…", "tag": "Announcement", "isPublished": true }
```

`isPublished` drives visibility on the public site. When it flips to `true` and
no `publishedAt` exists yet, the server stamps `published_at = now()`. The admin
list returns camelCase specifically so the UI's "Draft/Published" badge and edit
toggle read the correct field (an earlier bug showed everything as "Draft"
because the raw snake_case column was returned instead).

---

## Shared helpers

| Helper | File | Purpose |
|---|---|---|
| `sql` | `api/_lib/db.js` | Neon HTTP client bound to `DATABASE_URL` |
| `json(res, status, body)` | `api/_lib/http.js` | JSON response + `no-store` |
| `methodGuard(req, res, allowed)` | `api/_lib/http.js` | Method allow-list → `405` |
| `readBody(req)` | `api/_lib/http.js` | Parse JSON body (handles pre-parsed or streamed) |
| `requireAuth(req, res)` | `api/_lib/auth.js` | Verify session → user or `401` |
| `buildZelleUrl` / `decodeZelle` | `api/_lib/zelle.js` | Zelle QR URL encode/decode (see [Payments](Payments)) |