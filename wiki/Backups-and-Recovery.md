# Backups & Recovery

**The Neon Postgres database is the single source of truth for the entire site —
content, settings, and every uploaded file.** These jobs make sure a copy of it
always exists, that the copy is safe to store next to a *public* repository, and —
the part most backup setups skip — that the copy has been *proven to restore*.

> A backup you have never restored is only a hope. This one is tested every week.

![EWA's backup and recovery pipeline — every night the live Neon Postgres database (all eight tables plus every uploaded file stored as bytea) is captured by a full pg_dump in a GitHub Action, encrypted with age using a public key before it ever leaves the build, and uploaded as a pre-release asset to GitHub Releases. Backups run nightly around 2 AM Pacific; a restore drill runs every Monday; a one-click restore is available on demand. The weekly drill spins up a throwaway Postgres 17 container, decrypts the latest backup, restores it, and asserts all 8 tables exist and at least one admin user is present — if a backup can't be restored the build goes red. One-click recovery restores any backup into a fresh isolated Neon branch so production is never touched](assets/backup-recovery.png)

## The three jobs

All three live under the repo's **Actions** tab
([`.github/workflows/`](https://github.com/drewdog88/ewa-website-revamp/tree/main/.github/workflows)).

| Job | Workflow | What it does | When |
|---|---|---|---|
| **DB Backup** | `backup.yml` | Full `pg_dump`, age-encrypted, uploaded as a GitHub pre-release | Nightly ~2 AM PT, or on demand |
| **Restore Drill** | `restore-drill.yml` | *Proves* the newest backup restores; fails loudly if it can't | Every Monday, or on demand |
| **Restore to new Neon branch** | `restore.yml` | One-click recovery into a **separate** branch you inspect first | Only when you click Run |

## Why it's safe in a public repo

The repository is public, so GitHub Release assets are downloadable by anyone.
That is fine here because **every backup is age-encrypted before it is uploaded** —
a downloaded `.dump.age` file is useless without the private key, which lives only
in a password manager and in GitHub's encrypted secrets, never in the repo.

If `AGE_PUBLIC_KEY` is ever missing, the nightly backup **fails on purpose** rather
than upload an unencrypted dump — a deliberate safety catch, not a bug.

## The weekly restore drill

Every Monday a workflow:

1. Spins up a throwaway **Postgres 17** container.
2. Downloads and `age`-decrypts the latest backup.
3. Restores it into the container.
4. **Asserts all 8 expected tables exist** (`artifacts`, `clubs`, `fundraiser`,
   `news`, `officers`, `payment_methods`, `resources`, `users`) **and that at least
   one admin `users` row is present** — a backup nobody could log into is a failed
   backup.

If any step fails the build goes red, so you learn a backup is bad on a quiet
Monday rather than during an emergency.

## Recovering for real

The one-click restore **never touches the live site.** It rebuilds the data into a
**separate Neon branch** that you look at first:

1. **Actions → Restore backup to new Neon branch → Run workflow.**
   - **tag** — leave blank for the newest backup, or paste one like
     `backup-20260705-090000`.
   - **branch_name** — leave blank (auto-named `restore-<number>`) or set your own.
2. When it finishes, open the run **Summary**: it lists restored row counts and
   confirms the admin `users` table has data.
3. Open the **Neon console**, find the new branch, and inspect it.
4. **Only if it looks right:** copy that branch's **pooled** connection string, set
   it as Vercel's `DATABASE_URL`, and redeploy. Delete the branch when done. If it
   looks wrong, just delete the branch — nothing live was ever touched.

For a *recent* mistake (a bad edit an hour ago), Neon's own **Point-in-Time
Restore** in the console is faster than a full restore, within the free plan's
retention window.

## Retention & housekeeping

- **Only the newest 14 backups are kept** — older Releases are pruned so the list
  never grows without bound.
- **Uploaded files are always included** — attachments live in the database as
  `bytea`, so a single `pg_dump` captures them automatically.

## The five configuration values

Set once; everything then runs on its own. Full walkthrough in
[`BACKUP.md`](https://github.com/drewdog88/ewa-website-revamp/blob/main/BACKUP.md)
and [Configuration](Configuration).

| Name | Kind | Purpose |
|---|---|---|
| `AGE_PUBLIC_KEY` | Variable | Public key used to **lock** (encrypt) backups |
| `NEON_PROJECT_ID` | Variable | Only if the Neon account has multiple projects |
| `BACKUP_AGE_KEY` | Secret | Private key that lets the drill/restore **unlock** backups |
| `BACKUP_DATABASE_URL` | Secret | **Direct** (non-pooled) Neon string `pg_dump` connects to |
| `NEON_API` | Secret | Neon API key so one-click restore can create a branch |

> **Losing the private key — not the data — is the only unrecoverable risk.** Store
> `~/.config/ewa/backup-age.key` in a password manager, and consider giving a
> trusted second board member a copy.

### Rotating the keys later

Generate a new pair with `age-keygen`, then update `AGE_PUBLIC_KEY` (variable) and
`BACKUP_AGE_KEY` (secret). Keep the old private key as long as any backup made with
it might still need to be opened.
