# Development Process

How to run, change, and migrate the EWA website **locally** — from a fresh clone to editing content tables, seeding users, and migrating data. For deployment and production operations, see [Deployment](Deployment) and [Operations & Troubleshooting](Operations).

---

## Prerequisites

| What | Why | Version |
|---|---|---|
| **Node.js** | Runs the Vite dev server and Vercel serverless functions | 21+ (for native WebSocket support in `apply-schema.mjs`) |
| **npm** | Installs dependencies | Bundled with Node |
| **A Neon database** | The source of truth for all content and files | Free tier works fine |
| **Two local env files** | Hold database connection strings and secrets | Gitignored — see below |

You'll need two separate Neon database URLs (or two schemas on one database):

1. **`DATABASE_URL`** (in `.env.local`) — what the running app reads from. The React app and `/api` functions read this.
2. **`NEW_DATABASE_URL`** (in `.env.migrate`) — the target for schema DDL and migration scripts. Tooling writes here.

It's a good practice to start with two **separate databases** while developing — one for the live app, one for schema experiments. Once you're confident, point them at the same database.

---

## The two env files (never committed)

Both are **gitignored** and hold sensitive connection strings. Create them by hand:

### `.env.local` (for the running app)

Used by the Vite dev server and the `/api` serverless functions.

```
DATABASE_URL=postgres://user:pass@host.neon.tech/dbname?sslmode=require
JWT_SECRET=some-random-secret-at-least-32-chars
```

Replace `DATABASE_URL` with your Neon database connection string (pooled or unpooled, either works for the app). `JWT_SECRET` is used to sign session cookies; generate a random 32+ character string.

### `.env.migrate` (for migration scripts)

Used by schema tooling and one-time migration scripts in `scripts/`.

```
NEW_DATABASE_URL=postgres://user:pass@host.neon.tech/dbname?sslmode=require
NEW_DATABASE_URL_UNPOOLED=postgres://user:pass@host.neon.tech/dbname?sslmode=require

OLD_PROD_DATABASE_URL=postgres://...   # optional, only needed for `import.mjs`
ADMIN_PASSWORD=your-first-admin-password
```

The scripts prefer `NEW_DATABASE_URL_UNPOOLED` for DDL if defined (Neon's WebSocket Pool works best with unpooled endpoints for multi-statement DDL). If you only have a pooled URL, just set `NEW_DATABASE_URL` — the scripts will fall back to it.

`OLD_PROD_DATABASE_URL` is only required if you're running [`scripts/import.mjs`](https://github.com/drewdog88/ewa-website-revamp/blob/main/scripts/import.mjs) to migrate from the prior schema. `ADMIN_PASSWORD` is optional — if omitted, `seed-admin.mjs` generates a strong random password and prints it once.

---

## Running it locally

### 1. Install dependencies

```bash
npm install
```

Pulls React 18, Vite, Tailwind v4, shadcn/ui, the Neon client (`@neondatabase/serverless`), and about 50 other dependencies listed in [`package.json`](https://github.com/drewdog88/ewa-website-revamp/blob/main/package.json).

### 2. Start the dev server

```bash
npm run dev
```

This runs **`vite`** ([`vite.config.ts`](https://github.com/drewdog88/ewa-website-revamp/blob/main/vite.config.ts)), which:

- Compiles the React SPA in [`src/`](https://github.com/drewdog88/ewa-website-revamp/tree/main/src)
- Hot-reloads on file changes
- Serves the app at `http://localhost:5173` (default Vite port)

**How `/api` calls work locally:** When you run `npm run dev`, Vite serves only the React front-end. The `/api` serverless functions are **not automatically invoked**. During local development you have two options:

1. **Point your local app at a deployed Vercel preview or production API** by overriding the API base URL in [`src/app/api.ts`](https://github.com/drewdog88/ewa-website-revamp/blob/main/src/app/api.ts) (set `API_BASE` to `https://<your-vercel-preview>.vercel.app`).
2. **Test API functions directly** by invoking them as Node modules — each function in [`api/`](https://github.com/drewdog88/ewa-website-revamp/tree/main/api) is a plain ES module that exports a default handler compatible with Vercel's serverless runtime. You can run them with `node --loader` or a local serverless emulator.

For most content editing, option 1 is simplest: deploy to a Vercel preview, then point your local Vite dev server at that preview's API. The React UI hot-reloads, and the API is stable.

**Why not `vercel dev`?** The project is configured with a simple `vite` dev server ([`vercel.json`](https://github.com/drewdog88/ewa-website-revamp/blob/main/vercel.json) sets `framework: "vite"`). You *can* run `vercel dev` to emulate the full serverless environment locally, but it's slower and requires the Vercel CLI. Most developers skip it.

---

## Schema workflow

### Applying the schema

The canonical DDL is [`scripts/schema.sql`](https://github.com/drewdog88/ewa-website-revamp/blob/main/scripts/schema.sql) — **eight tables** (`clubs`, `payment_methods`, `news`, `officers`, `resources`, `artifacts`, `fundraiser`, `users`) plus triggers.

To apply it to your database:

```bash
node scripts/apply-schema.mjs
```

This runs the entire `schema.sql` file against the database specified by `NEW_DATABASE_URL` (or `NEW_DATABASE_URL_UNPOOLED` if defined) in `.env.migrate`.

**Why a separate script?** The schema contains **multi-statement DDL** — `CREATE OR REPLACE FUNCTION`, `DO` blocks, and multiple table definitions. Neon's **HTTP driver** (the `neon(url)` client used by the app) rejects multi-statement SQL for security. Schema DDL must use the **WebSocket Pool** instead ([`Pool` from `@neondatabase/serverless`](https://github.com/drewdog88/ewa-website-revamp/blob/main/scripts/apply-schema.mjs#L6)), which supports the PostgreSQL simple-query protocol that can run the entire file as one transaction.

The app's `/api` functions use the HTTP driver for single-statement queries (`SELECT`, `INSERT`, `UPDATE`). Schema application uses the Pool. This distinction is mentioned in [Architecture](Architecture) and matters when writing new DDL.

**After applying:** The script prints a list of all tables now present in `public`. You should see:

```
Schema applied. Tables now present:
  - artifacts
  - clubs
  - fundraiser
  - news
  - officers
  - payment_methods
  - resources
  - users
```

If any are missing, the schema failed partway and you'll see a Postgres error above the table list.

---

## Seeding an admin user

The `users` table backs admin login. **No public sign-up** — admins are seeded manually.

```bash
node scripts/seed-admin.mjs [username] [password]
```

Defaults to `username="admin"` and a **generated strong password** (printed once, then gone). The password is **bcrypt-hashed** (cost 12) before storage — plaintext passwords never touch the database.

**Examples:**

```bash
# Generate a random password and print it
node scripts/seed-admin.mjs

# Set a specific username + password
node scripts/seed-admin.mjs admin MySecurePassword123

# Read password from env (ADMIN_PASSWORD in .env.migrate)
node scripts/seed-admin.mjs
```

**Idempotent:** Re-running with the same `username` **updates** the password hash (via `ON CONFLICT (username) DO UPDATE`). This is how you reset a forgotten password.

**Why bcrypt cost 12?** A deliberate balance: slow enough to resist brute-force (each hash takes ~250ms on a modern CPU), fast enough that legitimate login is imperceptible. The nightly [restore drill](Backups-and-Recovery) fails loudly if the `users` table is empty — a backup nobody can log into is a failed backup.

---

## Data migration tooling

Two scripts were written to move the old site's data into the new schema. **You likely won't need these** unless you're replicating this site's migration path, but they're documented here because they demonstrate useful patterns.

### `import.mjs` — one-shot bulk import

```bash
node scripts/import.mjs
```

**What it does:** Reads from `OLD_PROD_DATABASE_URL` (the prior site's schema) and writes into `NEW_DATABASE_URL` (the new schema). **Idempotent** — truncates `NEW` content tables first, then re-imports everything. **Read-only on `OLD`** — never writes to the old database.

Covers:
- Clubs + payment methods (Zelle URLs decoded to extract `display_token`)
- Officers
- News (maps `status="published"` to `is_published=true`)
- Resources (from the old `links` table)

**Why separate old/new databases?** The old schema lived on a different Neon project and used a different table structure (`booster_clubs` → `clubs`, `links` → `resources`, Zelle config stored differently). This script bridges the two. If you're starting fresh, you don't need it.

### `migrate-blob-to-bytea.mjs` — pull files from Vercel Blob into Postgres

```bash
node scripts/migrate-blob-to-bytea.mjs [--dry-run]
```

**What it does:** Finds any `resources` row whose `url` still points at `*.blob.vercel-storage.com` (the old external file store), downloads the file, stores it as `bytea` in the `artifacts` table, and updates the resource to point at the artifact instead of the Blob URL.

**Why?** The new architecture stores **all uploaded files inside the database** (see [Database](Database#artifacts) and [Architecture](Architecture)). This eliminated the external Blob dependency and simplified backups — `pg_dump` now captures the entire site, files included. This script was the one-time migration that moved historical files off Blob and into `artifacts`.

**Idempotent:** Only touches resources that *still* have a Blob URL. Re-running is safe. External website links (`lwsd.org`, `wiaa.com`, etc.) are left untouched.

**Dry run:** `--dry-run` prints what *would* be migrated without writing anything.

**Example output:**

```
Found 3 blob-hosted resource(s) to migrate:

  #12 "Booster Handbook 2024" -> handbook-2024.pdf ... stored 245823 bytes as artifact #5, resource now served from /api/artifacts/5
  #14 "Membership Form" -> membership.docx ... stored 18432 bytes as artifact #6, resource now served from /api/artifacts/6
  #19 "Team Logo" -> logo.png ... stored 12048 bytes as artifact #7, resource now served from /api/artifacts/7

Done.
```

---

## Other scripts

### `introspect.mjs` — read-only schema inspection

```bash
node scripts/introspect.mjs <ENV_KEY>
```

Lists all tables, columns, and row counts for a given database. Pass the env var name (e.g., `OLD_PROD_DATABASE_URL`, `NEW_DATABASE_URL`) to inspect that database. Useful for comparing schemas or sanity-checking a migration.

**Example:**

```bash
node scripts/introspect.mjs NEW_DATABASE_URL
```

Prints:

```
# DB: NEW_DATABASE_URL @ ep-cool-forest-12345.us-east-2.aws.neon.tech

## artifacts  (3 rows)
   - id : integer
   - filename : text
   - mime_type : text
   - bytes : bytea
   - uploaded_at : timestamp with time zone

## clubs  (12 rows)
   - id : integer
   - name : text
   ...
```

---

## Making a code change

### Front-end (React)

1. Edit files in [`src/`](https://github.com/drewdog88/ewa-website-revamp/tree/main/src).
2. Save — Vite hot-reloads the browser automatically.
3. Check the browser console for errors.

**Component structure:** The app is a single-page React app with no client-side router. [`src/app/App.tsx`](https://github.com/drewdog88/ewa-website-revamp/blob/main/src/app/App.tsx) holds a `view` state that swaps between three screens: `"site"` (public), `"login"`, and `"admin"` (admin panel).

**Tailwind v4 + shadcn/ui:** Styling is in [`src/styles/theme.css`](https://github.com/drewdog88/ewa-website-revamp/blob/main/src/styles/theme.css) (CSS-variable theming), and components are built on Radix primitives in [`src/app/components/ui/`](https://github.com/drewdog88/ewa-website-revamp/tree/main/src/app/components/ui).

### API function (`/api`)

1. Edit a file in [`api/`](https://github.com/drewdog88/ewa-website-revamp/tree/main/api).
2. Deploy to a Vercel preview (or re-run your local serverless emulator if you set one up).
3. Call the function via `curl` or the React app to test.

**Shared helpers:** All functions import from `api/_lib/`:

- [`db.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/db.js) — the shared `sql` client (`neon(DATABASE_URL)`)
- [`http.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/http.js) — `json()`, `methodGuard()`, `readBody()`
- [`auth.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/auth.js) — `requireAuth()`, session cookie helpers
- [`zelle.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/zelle.js) — Zelle QR URL generation

See the full list of endpoints on [API Reference](API).

**Hot-reload caveat:** Vercel serverless functions are **not** hot-reloaded in local `npm run dev`. You must either:

- Deploy to Vercel and test the deployed function, or
- Use `vercel dev` (slower but runs functions locally).

Most developers deploy to a preview branch and test there.

---

## Conventions worth knowing

These are consistent across the app, API, and database — knowing them saves debugging time:

| Convention | Why |
|---|---|
| **Money in cents** | `goal_cents`, `raised_cents` are stored as integers to avoid float rounding. Format to dollars in the UI (`(cents / 100).toFixed(2)`). |
| **Soft visibility, not deletion** | `is_active` / `is_published` flags hide content without losing data. Deletion is reversible. |
| **camelCase API responses** | The API returns `{ isActive, sortOrder }` — JavaScript convention. The database is `snake_case` (`is_active`, `sort_order`). |
| **`updated_at` triggers** | `clubs`, `news`, `fundraiser` auto-stamp `updated_at = now()` on update via a shared `set_updated_at()` trigger function. |
| **Eight expected tables** | The nightly [restore drill](Backups-and-Recovery) asserts these eight exist: `artifacts`, `clubs`, `fundraiser`, `news`, `officers`, `payment_methods`, `resources`, `users`. |

See [Database](Database) for the full schema reference.

---

## Testing your changes

### Automated tests

There are **no automated tests** in this repo yet. The site is small enough (8 tables, 10 API routes, one React SPA) that manual QA has been sufficient. If you add tests, run them with:

```bash
npm test
```

(Add a `test` script to `package.json` first.)

### Manual testing checklist

- **Public site:** Does the content render? Do links work?
- **Admin panel:** Can you log in? Edit a club, publish a news item, upload a file?
- **File uploads:** Do PDFs and images render at `/api/artifacts/:id`?
- **Payment methods:** Do Zelle QR codes generate correctly? Do Stripe links open?

See [Operations & Troubleshooting](Operations) for common issues.

---

## Related pages

- **[Architecture](Architecture)** — how the pieces connect
- **[Database](Database)** — full schema reference
- **[API Reference](API)** — every endpoint and auth pattern
- **[Deployment](Deployment)** — how it ships to Vercel
- **[Configuration](Configuration)** — every environment variable
- **[Backups & Recovery](Backups-and-Recovery)** — nightly dumps, restore drill, disaster recovery runbook
