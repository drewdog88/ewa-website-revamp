# Configuration

Every environment variable and secret the EWA site uses — what they're for, where
they live, and how to set them. **This repo is PUBLIC, so nothing sensitive ever
enters it:** secrets exist only in Vercel's encrypted environment, GitHub's
encrypted secrets, and your password manager.

---

## Runtime environment (Vercel)

These power the live site and API — set once in the Vercel dashboard (Project
Settings → Environment Variables), they're available to every serverless function
and deployed edge bundle.

| Name | Where set | Purpose | Notes |
|---|---|---|---|
| `DATABASE_URL` | Vercel env | **Pooled** Neon Postgres connection string the app & API use at runtime | Format: `postgres://...@...-pooler.neon.tech/...?sslmode=require` — the `-pooler` host is critical for short-lived serverless functions. Automatically set by the Neon → Vercel integration. |
| `JWT_SECRET` | Vercel env | Signing key for admin session tokens | A long random string (e.g. 64 hex chars). Used by [`api/_lib/auth.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/auth.js) to sign and verify JWT cookies. If ever rotated, every admin is immediately logged out (harmless). |

### Where to set them

Vercel dashboard → your project → **Settings → Environment Variables**. Mark both
as sensitive (encrypted); Vercel never logs their values. They apply to Production
+ Preview + Development scopes.

The Neon–Vercel integration sets `DATABASE_URL` automatically on first connect,
but you can override it manually if needed (e.g., to point at a different branch).

---

## Backup & recovery (GitHub Actions)

The three automated backup jobs ([Backups & Recovery](Backups-and-Recovery)) read
five values — two as **Variables** (public metadata) and three as **Secrets**
(sensitive). Set them once in the GitHub repo and the jobs run on their own.

| Name | Kind | Purpose | Notes |
|---|---|---|---|
| `AGE_PUBLIC_KEY` | Variable | **Public** age encryption recipient (locks backups) | Starts with `age1...`; safe to share. Used by `backup.yml` to encrypt dumps BEFORE upload. If missing, the backup job **fails on purpose** rather than upload plaintext to a public repo. Generate with `age-keygen` (see [BACKUP.md](https://github.com/drewdog88/ewa-website-revamp/blob/main/BACKUP.md)). |
| `NEON_PROJECT_ID` | Variable | Neon project identifier (optional) | Only needed if your Neon account has **multiple** projects. Format: `dark-forest-12345678`. When unset, the restore job auto-discovers the project by matching the backup DB's hostname. |
| `BACKUP_AGE_KEY` | Secret | **Private** age identity (unlocks backups) | Starts with `AGE-SECRET-KEY-1...`. Used by `restore-drill.yml` and `restore.yml` to decrypt backups. Store the key file (`~/.config/ewa/backup-age.key`) in a password manager — losing it makes all backups permanently unreadable. |
| `BACKUP_DATABASE_URL` | Secret | **Direct** (non-pooled) Neon connection string for `pg_dump` | Format: `postgres://...@<host-without-pooler>.neon.tech/...?sslmode=require` — the host does **NOT** contain `-pooler`. `pg_dump` cannot run through a connection pooler. Get this from Neon's *Connect* screen under "Direct connection". |
| `NEON_API` | Secret | Neon API key | Lets the one-click restore job create a fresh isolated branch via the Neon API. Generate at *Account settings → API keys → Create new API key* in the Neon console. |

### Where to set them

GitHub repo → **Settings → Secrets and variables → Actions** — note the two tabs:

- **Variables** tab: set `AGE_PUBLIC_KEY` and `NEON_PROJECT_ID`.
- **Secrets** tab: set `BACKUP_AGE_KEY`, `BACKUP_DATABASE_URL`, `NEON_API`.

Or set them from the command line with the `gh` CLI (see
[BACKUP.md](https://github.com/drewdog88/ewa-website-revamp/blob/main/BACKUP.md)).

### Pooled vs direct — the Neon distinction

- **Pooled** (`-pooler` in the hostname) = serverless functions talking to Neon
  via PgBouncer; handles thousands of short-lived connections efficiently. The
  **app** uses this (`DATABASE_URL` in Vercel).
- **Direct** (no `-pooler`) = a traditional Postgres wire-protocol connection;
  what `pg_dump` and multi-statement DDL need. The **backup jobs** use this
  (`BACKUP_DATABASE_URL` in GitHub secrets).

Both point to the same live database; only the connection layer differs.

---

## Local development (`.env.local` & `.env.migrate`)

Two gitignored files hold secrets for running the site and scripts on your laptop.
They live **only** on your machine; git never sees them (enforced by
[`.gitignore`](https://github.com/drewdog88/ewa-website-revamp/blob/main/.gitignore)).

| File | Purpose | Format |
|---|---|---|
| `.env.local` | Runtime secrets for local dev server (`npm run dev`) | Plain text `KEY=VALUE` pairs read by Vite. Set `DATABASE_URL` (pooled) and `JWT_SECRET` here so the local app can talk to a Neon branch. |
| `.env.migrate` | Connection strings for migration/seed scripts (`scripts/*.mjs`) | Read by [`scripts/lib/env.mjs`](https://github.com/drewdog88/ewa-website-revamp/blob/main/scripts/lib/env.mjs). Typically holds `NEW_DATABASE_URL` (pooled), `NEW_DATABASE_URL_UNPOOLED` (direct), and optionally `ADMIN_PASSWORD` for `seed-admin.mjs`. |

### Variables used in scripts

| Name | Where used | Purpose |
|---|---|---|
| `NEW_DATABASE_URL` | `apply-schema.mjs`, `seed-admin.mjs`, other migration scripts | Pooled connection string to a **non-production** Neon branch you're testing schema changes on. |
| `NEW_DATABASE_URL_UNPOOLED` | `apply-schema.mjs` (optional fallback) | Direct connection string (non-pooled) for `apply-schema.mjs` when applying multi-statement DDL. If absent, `apply-schema.mjs` uses `NEW_DATABASE_URL`. |
| `ADMIN_PASSWORD` | `seed-admin.mjs` (optional) | Plaintext password for the admin user. If not set, `seed-admin.mjs` generates a strong random password and prints it once. |

### Creating them

Neither file is committed or tracked. Create them manually:

```bash
# Runtime secrets for local dev
echo 'DATABASE_URL=postgres://...-pooler.neon.tech/...?sslmode=require' > .env.local
echo 'JWT_SECRET=<a-long-random-hex-string>' >> .env.local

# Migration/seed secrets
echo 'NEW_DATABASE_URL=postgres://...-pooler.neon.tech/...?sslmode=require' > .env.migrate
echo 'ADMIN_PASSWORD=<temp-password-for-testing>' >> .env.migrate
```

Point `NEW_DATABASE_URL` at a **separate Neon branch** (not production) so schema
experiments never touch the live site. See
[Database](Database#conventions) for applying schema changes safely.

---

## Secrets hygiene

**Repository:** Public on GitHub. Zero secrets in the code, ever. Passwords exist
only bcrypt-hashed in the database; backups are age-encrypted before upload.

**Vercel environment:** Encrypted at rest + in transit. Secrets are injected into
serverless function invocations and never logged.

**GitHub Actions secrets:** Encrypted at rest; masked in logs. Workflows pass them
via `env:` blocks and never interpolate them into shell commands (to prevent
injection).

**Password manager:** The **only** safe place to store the private age key
(`~/.config/ewa/backup-age.key`) and the initial admin password. Consider giving a
trusted second board member a copy of the age key — losing it makes every backup
permanently unreadable.

**No plaintext passwords, ever:** `users.password_hash` is bcrypt (cost 12),
computed by [`scripts/seed-admin.mjs`](https://github.com/drewdog88/ewa-website-revamp/blob/main/scripts/seed-admin.mjs).
The plaintext password never touches the database or the code.

---

## Cross-references

- **[Backups & Recovery](Backups-and-Recovery)** — how the five backup config
  values are generated and used.
- **[Database](Database)** — the schema every connection string points to.
- **[Deployment](Deployment)** — how Vercel reads `DATABASE_URL` and `JWT_SECRET`
  at deploy time.
- **[API Reference](API)** — how `api/_lib/db.js` and `api/_lib/auth.js` consume
  the runtime secrets.
