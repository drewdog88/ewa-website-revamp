# Admin Panel

The board's control room — edit clubs, post news, update the team roster, upload files, and manage the fundraiser. Every change saves to the database and appears on the public site **in seconds**, without a deploy. No code changes, no developer needed, no waiting.

This page walks a board member through logging in, using each manager, and understanding what happens under the hood when they hit Save.

## Reaching the admin panel

There is a discreet admin entry point on the public site — click it and you'll land on a login screen. (The exact location is documented outside the public repo to keep the login page off search engines.)

## Logging in

[`LoginScreen.tsx`](https://github.com/drewdog88/ewa-website-revamp/blob/main/src/app/LoginScreen.tsx) presents a simple username + password form. On submit:

1. The credentials are sent to `POST /api/auth/login` via [`api/auth/login.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/auth/login.js).
2. The handler looks up the `username` in the `users` table and runs `bcrypt.compare()` on the submitted password against the stored hash. Passwords are never stored in plaintext — only the bcrypt hash sits in the database.
3. If the password matches, the server signs a **JWT** containing `{ sub: username }` with `JWT_SECRET`, sets a 7-day expiry, and returns it as an **HttpOnly, Secure, SameSite=Lax** cookie named `ewa_session`.
4. The browser stores the cookie and attaches it automatically to every subsequent request. JavaScript can't read it (HttpOnly), which blunts token theft via XSS.

> See [Configuration](Configuration) for how `JWT_SECRET` is set (never committed to the repo).

## Staying logged in

When [`App.tsx`](https://github.com/drewdog88/ewa-website-revamp/blob/main/src/app/App.tsx) loads, it silently calls `GET /api/auth/me` ([`api/auth/me.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/auth/me.js)). If the session cookie is valid, the app restores the admin view — you skip the login screen and land straight in the panel. If the cookie is missing or expired, you see the public site as usual.

**Logging out:** Click "Sign Out" in the top-right corner. This calls `POST /api/auth/logout` ([`api/auth/logout.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/auth/logout.js)), which clears the cookie and returns you to the public site.

## What the panel can manage

[`AdminPanel.tsx`](https://github.com/drewdog88/ewa-website-revamp/blob/main/src/app/AdminPanel.tsx) holds five tabbed managers:

| Tab | Manager Component | What it edits | API endpoint |
|-----|-------------------|---------------|--------------|
| **Clubs** | `ClubsManager` | Booster clubs — name, description, website, Zelle QR, payment link, active/hidden | `/api/admin/clubs` |
| **News** | `NewsManager` | Announcements — title, body, tag, published/draft | `/api/admin/news` |
| **Team** | `TeamManager` | EWA officers — name, role, email | `/api/admin/officers` |
| **Resources** | `ResourcesManager` | Quick links or uploaded files (PDFs, handbooks) | `/api/admin/resources` |
| **Fundraiser** | `FundraiserManager` | The progress band — headline, goal, raised, visible/hidden | `/api/admin/fundraiser` |

Each manager follows the same pattern: the left column lists existing items, the right column is a sticky form for editing. Click **Edit**, change fields, **Save**. The save returns the refreshed list and the form slides away. Changes are live on the public site immediately.

## Everyday workflow — edit, save, live

A typical board action looks like this:

1. Open the admin panel (login if needed).
2. Navigate to the tab — **News**, for example.
3. Click **Add Post** or **Edit** on an existing post.
4. Fill in the title, body, tag ("Announcements" / "Athletics" / "Fundraising"), and set **Published** on or off.
5. Click **Save**.
6. Within a second, the post appears in the refreshed list. If it's published and active, it's now visible on the public site.
7. Open the public site in another tab (or refresh) and the new post is there.

**No deploy triggered. No code change. No waiting.** The public site fetches content from the same tables the admin just wrote — one database, instant consistency.

## Clubs manager — Zelle QR codes and payment links

The **Clubs** tab edits the booster clubs directory. Each club can have:

- **Name**, **Description**, **Website URL** — what visitors see.
- **Zelle recipient name** and **Zelle email or phone** — the admin enters these and the system generates the Zelle QR code URL on the server. The code is live in the QR preview as you type.
- **Payment link** (Stripe / PayPal / other) — if the club prefers a hosted payment page instead of, or in addition to, Zelle.
- **Active / Hidden** toggle — hidden clubs stay in the database but don't appear on the public site.

When you save a club, [`api/admin/clubs.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/admin/clubs.js) writes the club row *and* its `payment_methods` entries as a single transaction. The Zelle URL is built server-side from the recipient name and token (see [Payments](Payments) for the QR generation logic).

**The QR preview** in the form is a live client-side render — it mirrors the server's logic so you see exactly what the public site will display. The preview switches between the Zelle QR and the payment link QR via tabs.

## News manager — announcements and drafts

Post updates, mark them **Published** or **Draft**. Drafts are saved in the database but filtered out by `GET /api/news` — they never reach the public site. Published posts appear immediately.

The **Tag** dropdown offers "Announcements", "Athletics", "Fundraising" — used for visual grouping on the public site (and future filtering if needed).

## Team manager — officers and volunteers

Add board members and volunteers to the public **Our Team** section. Name, role (e.g., "President", "Treasurer"), and optional email.

## Resources manager — files and links

The **Resources** tab manages the helpful links shown in the public Resources section and footer. Each resource can be:

- **A URL** — an external link (e.g., the district calendar).
- **An uploaded file** — a PDF, handbook, or document stored in the database as `bytea`.

You can't have both a URL and an uploaded file on the same resource — choosing one clears the other. The public site resolves `url` if present, otherwise `/api/artifacts/<artifactId>`.

### Uploading files

The file picker calls [`api/admin/artifacts.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/admin/artifacts.js):

1. The browser reads the file as a **base64 data URL** via `FileReader`.
2. The admin client sends `{ filename, mimeType, dataBase64 }` to `POST /api/admin/artifacts`.
3. The handler decodes the base64 back to bytes and inserts it into the `artifacts` table as `bytea` — capped at **8 MB** to stay within serverless memory limits.
4. The handler returns `{ id, url: "/api/artifacts/<id>" }` and the form attaches the `artifactId` to the resource.
5. When a visitor clicks the resource, the browser requests `GET /api/artifacts/<id>`, which fetches the bytes, sets `Content-Type` to the stored MIME type, and streams the file with `Content-Disposition: inline`.

Files live **inside the database**, so backing up the database captures the entire site — content *and* files. There is no external blob store to manage or pay for separately. See [Backups & Recovery](Backups-and-Recovery).

## Fundraiser manager — the progress band

The **Fundraiser** tab edits the single fundraiser row shown near the top of the public site. Fields:

- **Headline** — e.g., "Weight Room Equipment Fund".
- **Goal ($)** and **Raised ($)** — entered as dollars, stored as cents.
- **Show fundraiser band** toggle — when off, the band is hidden from the public site.

The progress bar and percentage are computed from the goal and raised amounts. Save and it's live immediately.

## How editing maps to the database

Every Save in the admin panel is a guarded write:

1. [`api.ts`](https://github.com/drewdog88/ewa-website-revamp/blob/main/src/app/api.ts) sends a `POST`, `PUT`, or `DELETE` to the corresponding `/api/admin/*` handler with `credentials: "include"` — the session cookie rides along.
2. The handler calls `requireAuth(req, res)` ([`api/_lib/auth.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/auth.js)) — if the cookie is missing or invalid, the request fails with `401` and the database is never touched.
3. If auth succeeds, the handler runs **one SQL statement** (or a small transaction for clubs + payment methods) against Neon and returns the refreshed list.
4. The admin UI receives the new list and re-renders.

There is no cache to invalidate, no CDN to purge, no second datastore to reconcile. The public site fetches from the same tables the admin just wrote. "Save" in the panel *is* the deploy for content.

> See [Database](Database) for the full schema — every admin-editable field maps to a column in `clubs`, `news`, `officers`, `resources`, or `fundraiser`.

## Session behavior for the operator

- **Session length:** 7 days. After 7 days of no activity, the JWT expires and you'll be redirected to the login screen on your next action.
- **Concurrent sessions:** Only one admin can be logged in at a time from a given browser. The session cookie is scoped to the origin, so opening the panel in an incognito window or a different browser starts a separate session.
- **What a 401 means:** If the session cookie expires or is cleared, any admin API call returns `{ error: "Not authenticated" }` with status `401`. The UI shows an error banner; log in again to continue.
- **Logout behavior:** `POST /api/auth/logout` clears the cookie by setting `Max-Age=0`. You're returned to the public site and must log in again to access the panel.

## Managing payment methods and Zelle

The admin sets Zelle recipient name and email/phone per club. The server generates the Zelle QR URL using the logic in [`api/_lib/zelle.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/zelle.js) — see [Payments](Payments) for the exact encoding. The admin panel mirrors this logic client-side so the QR preview matches what visitors will see.

**Payment links** (Stripe, PayPal, other) are stored as generic `payment_methods` rows with `type = "other"`. The public site renders them as "Donate Online" buttons or QR codes (depending on whether the visitor is on mobile or desktop).

## What happens on a 401 — staying authorized

If the session expires mid-edit, the next Save returns `401`. The admin panel shows an error banner: "Not authenticated". Close the form, refresh the page, log in again, and your in-progress changes are lost (the form state is client-side only). This is rare — the 7-day session is long enough that most board members stay logged in across their editing sessions.

If a 401 surprises you (you were logged in a moment ago), check:

- Did you clear cookies or switch browsers?
- Did someone else log in on your account from another device (invalidating your session)?
- Did the JWT secret rotate (unlikely unless the deploy environment was rebuilt)?

## Cross-linking and next reads

- **[How It Works](How-It-Works)** — the full request lifecycle: how a login, save, and file upload flow through the system.
- **[API Reference](API)** — every `/api/admin/*` endpoint, request/response format, and auth requirement.
- **[Database](Database)** — the tables and columns the admin panel writes to.
- **[Payments](Payments)** — Zelle QR generation logic and per-club payment method wiring.
- **[Configuration](Configuration)** — environment variables (`JWT_SECRET`, `DATABASE_URL`) that power authentication and database access.

---

**In short:** the admin panel is a single-purpose editing interface for the board. Log in, edit, save, and it's live in seconds. No developer, no deploy, no waiting. The session is secure (HttpOnly, Secure, bcrypt-hashed passwords, signed JWT), the workflow is self-serve, and the database is the single source of truth — back it up and you've captured the entire site, content and files.
