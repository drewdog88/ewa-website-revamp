# Operations & Troubleshooting

This page walks board operators and developers through what healthy looks like, the symptoms table for when it doesn't, where to look for diagnostic information, and when to escalate to a full data recovery.

---

## What healthy looks like

When everything is working:

- **The public site loads** at https://ewa-website-revamp.vercel.app. All five sections (Clubs, News, Resources, Officers, Fundraiser) render their content — or render empty if nothing is published/active.
- **An admin can log in** with their username and password; the Admin Panel opens and all content editors load.
- **Files upload and display.** Admins can attach PDFs and images under 8 MB; they display in the public site when referenced.
- **The nightly backup succeeds.** The `DB Backup` workflow (GitHub Actions → All workflows → DB Backup) is green, and a new `backup-YYYYMMDD-HHMMSS` Release appears in the repository.
- **The Monday restore drill passes.** The `Restore Drill` workflow shows a green check and the **Summary** tab lists row counts for all 8 tables (`artifacts`, `clubs`, `fundraiser`, `news`, `officers`, `payment_methods`, `resources`, `users`).

If all five of those are true, the system is operating as designed.

---

## Symptom table

| Symptom | Likely cause | Where to look | Fix |
|---|---|---|---|
| **A section is empty on the public site** (News / Clubs / Resources / Officers / Fundraiser shows nothing) | 1. Nothing is published / active in that section, OR<br>2. The content fetch for that section failed (network, database, function timeout) | Vercel function logs for `/api/news`, `/api/clubs`, etc.; Neon console for database status | 1. Log into Admin Panel, verify that content exists and is marked `is_published=TRUE` or `is_active=TRUE`.<br>2. If content exists but the section is still empty, check the Vercel deployment logs for errors in the corresponding `/api/*` function. See [How It Works](How-It-Works) — all five content fetches are parallel and independent; one failure is non-fatal and only affects that section. |
| **Can't log in to admin** (submitted credentials rejected) | 1. Wrong username or password, OR<br>2. `JWT_SECRET` environment variable missing/changed, OR<br>3. Cookie not being set/read (HTTPS required for `Secure` cookies, or browser blocking third-party cookies) | Vercel function logs for `/api/auth/login`; Vercel project → Settings → Environment Variables | 1. Verify credentials with a known-good admin user row in the `users` table (see [Database](Database)).<br>2. Check that `JWT_SECRET` is set in Vercel environment variables (see [Configuration](Configuration)).<br>3. Confirm the site is served over HTTPS (Vercel deployments are HTTPS by default). See [How It Works](How-It-Works)#authentication for cookie requirements (`HttpOnly`, `Secure`, `SameSite=Lax`). Clear browser cookies and retry. |
| **Uploaded file won't display / upload rejected** | 1. File exceeds **8 MB** (serverless limit), OR<br>2. Unsupported MIME type, OR<br>3. Database `artifact_id` reference is wrong, OR<br>4. Resource is marked `is_active=FALSE` | Admin panel upload feedback; Vercel function logs for `/api/admin/artifacts` and `/api/artifacts/[id]`; database `artifacts` and `resources` tables | 1. Check file size — must be under 8 MB. Compress images or split large PDFs.<br>2. Verify MIME type is standard (PDF: `application/pdf`, PNG: `image/png`, JPEG: `image/jpeg`, etc.).<br>3. In the Admin Panel, open the resource and confirm `artifact_id` matches an existing row in the `artifacts` table (see [Database](Database)). Resources have **either** `url` (external link) **or** `artifact_id` (uploaded file), never both.<br>4. Verify the resource `is_active=TRUE`. |
| **A payment method / QR looks wrong** | 1. Zelle QR `value` URL is malformed or missing, OR<br>2. `display_token` (email/phone fallback) is stale, OR<br>3. Payment method is marked `is_active=FALSE` | Admin Panel → Clubs → select club → Payment Methods; database `payment_methods` table | 1. For Zelle: verify the `value` field contains the full `https://enroll.zellepay.com/qr-codes?data=…` URL and `display_token` matches the enrolled email/phone. Use the Zelle URL builder in the Admin Panel to regenerate if needed.<br>2. For other providers (Stripe, PayPal, Venmo): verify the `value` field contains the correct payment page URL.<br>3. Verify `is_active=TRUE` and `sort_order` is correct. See [Payments](Payments) for the full flow. |
| **The nightly backup failed** | 1. `AGE_PUBLIC_KEY` variable is missing (job **intentionally** fails to prevent uploading an unencrypted dump), OR<br>2. `BACKUP_DATABASE_URL` secret is missing/wrong, OR<br>3. Database connection string is **pooled** (should be **direct** for `pg_dump`) | GitHub Actions → All workflows → DB Backup → View latest run; Logs for each step | 1. Verify `AGE_PUBLIC_KEY` (a repo **variable**, not a secret) is set in GitHub → Settings → Secrets and variables → Actions → Variables. It should start with `age1…`. See [Backups & Recovery](Backups-and-Recovery) for setup.<br>2. Verify `BACKUP_DATABASE_URL` (a repo **secret**) is set and contains a **direct** (non-pooled) Neon connection string ending in `?sslmode=require` (not `?sslmode=require&pgbouncer=true`). Pooled connections break `pg_dump`.<br>3. Check Neon console for database status (paused/sleeping on free tier). |
| **The Monday drill went red** (restore failed) | 1. `BACKUP_AGE_KEY` secret is missing (can't decrypt the backup), OR<br>2. The most recent backup is corrupted/incomplete, OR<br>3. Schema changed but the drill's table assertions were not updated | GitHub Actions → All workflows → Restore Drill → View latest run; Summary tab for row counts and missing tables | 1. Verify `BACKUP_AGE_KEY` (a repo **secret**) is set. It should start with `AGE-SECRET-KEY-1…` and match the private key for `AGE_PUBLIC_KEY`. See [Backups & Recovery](Backups-and-Recovery).<br>2. Read the **Verify schema + data** step logs. If a table is **MISSING**, the backup is bad — investigate the database before the next backup runs.<br>3. If `users` row count is 0, the restored database can't be logged into. This is a critical failure. See [Backups & Recovery](Backups-and-Recovery) for the one-click restore workflow to inspect the backup in a throwaway branch. |
| **Site not being indexed by Google after launch** | The `<meta name="robots" content="noindex, nofollow">` tag is still in `index.html` | `index.html` line 10 | Remove or comment out `<meta name="robots" content="noindex, nofollow">` in [`index.html`](https://github.com/drewdog88/ewa-website-revamp/blob/main/index.html), commit, and redeploy. This was intentionally set to prevent search indexing during development. See [Deployment](Deployment). |
| **Database connection errors** (any API call returns 500 / "Failed to load …") | 1. `DATABASE_URL` environment variable missing, OR<br>2. Neon database paused/sleeping (free tier idles after inactivity), OR<br>3. Connection string is malformed | Vercel function logs (every `/api/*` handler); Neon console | 1. Verify `DATABASE_URL` is set in Vercel → Settings → Environment Variables. See [Configuration](Configuration).<br>2. Open the Neon console → Projects → your project. If the database shows "Idle" or "Suspended", any incoming request will wake it (cold start adds 1-2 seconds). On the free tier, databases idle after 5 minutes of inactivity; this is normal.<br>3. Verify the connection string format: `postgresql://<user>:<password>@<host>/<db>?sslmode=require`. For API usage use the **pooled** connection string (ends with `…?sslmode=require&pgbouncer=true`); for backups use the **direct** connection string (no `pgbouncer=true`). |

---

## Where to look

When diagnosing an issue, these are your primary sources of truth:

### 1. Vercel deployment logs
**Vercel dashboard → your project → Deployments → select deployment → Runtime Logs**

- Function-level errors (`/api/*` handlers) — database query failures, auth rejections, malformed requests.
- Useful filters: `Error`, `500`, `/api/auth`, `/api/admin`, `/api/artifacts`.

### 2. Vercel function logs (real-time)
**Vercel dashboard → your project → Logs**

- Real-time stream of all serverless function invocations.
- Look for `401 Not authenticated` (admin auth failed), `404 Not found` (artifact missing), `500 Failed to load …` (database/query error).

### 3. GitHub Actions
**Repository → Actions tab**

- **DB Backup** (nightly ~2 AM PT, or on-demand) — encryption and Release upload. A red run means no backup was created.
- **Restore Drill** (every Monday, or on-demand) — proof that the most recent backup is restorable. A red run means the backup is bad.
- Read the **Summary** tab first for a high-level pass/fail, then drill into failed steps for details.

### 4. Neon console
**https://console.neon.tech → your project**

- Database status (Active / Idle / Suspended).
- Connection strings (pooled vs. direct).
- Query performance and connection pool stats.
- Point-in-Time Restore (PITR) for recent mistakes — faster than a full backup restore for changes made within the free plan's retention window (7 days).

### 5. GitHub Releases
**Repository → Releases**

- Every `backup-YYYYMMDD-HHMMSS` tag holds one `.dump.age` (encrypted backup).
- If a recent backup is missing, check the `DB Backup` workflow run for that night.

---

## Escalation & recovery

### For a bad edit / accidental deletion (within the last 7 days)

Use Neon's **Point-in-Time Restore** (PITR) in the console:

1. Open **Neon console → your project → Branches → main → Restore**.
2. Pick a timestamp **before** the bad change (within the free plan's 7-day retention).
3. Neon creates a new branch with the database at that point in time.
4. Inspect the branch's data (Neon provides a read-only connection string).
5. If it looks right, copy the branch's **pooled** connection string, set it as Vercel's `DATABASE_URL`, and redeploy.
6. Delete the branch when done.

PITR is **faster** than a full backup restore for recent mistakes.

### For a catastrophic failure / data loss beyond PITR retention

See **[Backups & Recovery](Backups-and-Recovery)** for the one-click restore workflow:

1. **Actions → Restore backup to new Neon branch → Run workflow.**
2. Inspect the restored data in the new branch (never touches production).
3. If it looks right, copy the branch's **pooled** connection string, set it as Vercel's `DATABASE_URL`, and redeploy.

The restore workflow **never** touches the live database — you inspect first, then promote by repointing `DATABASE_URL`.

### For deployment / configuration issues

See **[Deployment](Deployment)** and **[Configuration](Configuration)** for the full setup and redeploy process.

### For API / authentication issues

See **[API Reference](API)** for endpoint specs and **[How It Works](How-It-Works)#authentication** for the session cookie flow.

---

## Notes

- **Every content section fails independently.** If one `/api/*` endpoint is down, the others still render. An empty section on the public site is not a site-wide outage — it's a localized fetch failure. See [How It Works](How-It-Works) for the parallel-load design.
- **Database connection errors are self-healing on the free tier.** Neon idles the database after 5 minutes of inactivity; the next request wakes it with a 1-2 second cold start. This is normal and requires no operator action.
- **The nightly backup intentionally fails if `AGE_PUBLIC_KEY` is missing.** This prevents uploading an unencrypted dump to a public repository. A failed backup is better than an exposed backup.
- **The Monday drill is the real test.** A green backup job only proves the dump was created and encrypted; a green drill proves it can be **restored** and **logged into**.
