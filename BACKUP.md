# Backup & Disaster Recovery

**The database (Neon Postgres) is the single source of truth for the site.** These
automated jobs make sure a copy of it always exists, that the copy is safe to store
in a public repo, and — importantly — that the copy actually *works* if you ever
need it.

> ⚠️ **This repo is PUBLIC.** Backups are stored as GitHub *Release* files, which
> anyone can download. So every backup is **age-encrypted** before it's uploaded —
> a downloaded file is useless without your private key. A plaintext copy of the
> data never leaves the job.

There are three automated jobs (all under the **Actions** tab on GitHub):

| Job | What it does | When |
|-----|--------------|------|
| **DB Backup** | Makes an encrypted snapshot and saves it as a GitHub Release | Nightly (~2am Pacific), or on demand |
| **Restore Drill** | *Proves* the latest backup can actually be restored, and opens an alert if it can't | Every Monday, or on demand |
| **Restore backup to new Neon branch** | One-click recovery into a **safe, separate** copy you inspect before using | Only when you click Run |

Why a "drill"? *A backup you have never restored is only a hope.* The drill quietly
restores the newest backup into a throwaway database every week and counts the rows,
so you find out a backup is bad **before** you actually need it — not during a crisis.

---

## One-time setup (~15 minutes, done once)

You'll (1) make an encryption key pair, then (2) hand GitHub five values. After that,
everything runs on its own.

### Step 1 — Make your encryption keys

On a Mac, open **Terminal** and run:

```bash
brew install age gh          # one-time: installs the encryption tool + GitHub CLI
mkdir -p ~/.config/ewa
age-keygen -o ~/.config/ewa/backup-age.key
```

That last command prints a line like **`Public key: age1xxxxxxxx...`** — that whole
`age1...` value is your **public key** (safe to share; it only *locks* backups). The
file `~/.config/ewa/backup-age.key` holds your **private key** (a line starting
`AGE-SECRET-KEY-1...`) — this is the only thing that can *unlock* backups.

**Save the file `~/.config/ewa/backup-age.key` in your password manager now.** If it's
ever lost, every encrypted backup becomes permanently unreadable. Consider giving a
trusted second board member a copy.

### Step 2 — Give GitHub the five values

GitHub keeps these encrypted. The jobs read them when they run. You can do this from
the Terminal (shown below) or in the browser (**repo → Settings → Secrets and
variables → Actions** — note the two tabs: **Variables** vs **Secrets**).

**Two are set as VARIABLES** (not sensitive):

```bash
# Public encryption key — used to LOCK backups.
gh variable set AGE_PUBLIC_KEY --repo drewdog88/ewa-website-revamp --body "age1xxxxxxxx..."

# Optional: only needed if your Neon account has more than one project.
# gh variable set NEON_PROJECT_ID --repo drewdog88/ewa-website-revamp --body "your-project-id"
```

**Three are set as SECRETS** (sensitive — GitHub hides them):

```bash
# Private key — lets the restore/drill jobs UNLOCK backups.
gh secret set BACKUP_AGE_KEY --repo drewdog88/ewa-website-revamp < ~/.config/ewa/backup-age.key

# The DIRECT (non-pooled) Neon connection string — what pg_dump connects to.
gh secret set BACKUP_DATABASE_URL --repo drewdog88/ewa-website-revamp
#   (it will prompt you to paste the value, then press Enter)

# A Neon API key — lets the one-click restore create a fresh branch.
gh secret set NEON_API --repo drewdog88/ewa-website-revamp
```

**Where the Neon values come from** (in the Neon console, https://console.neon.tech):

- **`BACKUP_DATABASE_URL`** — your project's *Connect* screen. Choose the **direct**
  connection, **not** the "Pooled connection" (the direct host does **not** contain
  `-pooler`). `pg_dump` must not go through the pooler.
- **`NEON_API`** — *Account settings → API keys → Create new API key*.
- **`NEON_PROJECT_ID`** — *Project settings → General* (looks like `dark-forest-12345678`).
  Only needed if you have multiple Neon projects.

> Until `AGE_PUBLIC_KEY` is set, the nightly backup **fails on purpose** rather than
> upload an unencrypted file to a public repo. That's intended — it's a safety catch.

### Step 3 — Prove it works

1. GitHub → **Actions** → **DB Backup** → **Run workflow**. In a minute a new
   pre-release named `backup-YYYYMMDD-HHMMSS` appears with a `.dump.age` file.
2. GitHub → **Actions** → **Restore Drill** → **Run workflow**. When it's green, open
   its **Summary** — you'll see a table with each table's row count. That's your proof
   the backup restores cleanly.

You're done. Backups now happen nightly and are verified every Monday.

---

## If something goes wrong — restoring for real

This **never** overwrites the live site. It rebuilds the data into a **separate copy**
(a Neon "branch") that you look at first.

1. GitHub → **Actions** → **Restore backup to new Neon branch** → **Run workflow**.
   - **tag**: leave blank for the newest backup, or paste one like `backup-20260705-090000`.
   - **branch_name**: leave blank (it'll name it `restore-<number>`) or type your own.
2. Click **Run**. When it finishes, open the run's **Summary** — it lists the restored
   row counts and confirms the admin `users` table has data (so you could log in).
3. Open the **Neon console** and find the new branch. Look it over.
4. **Only if it looks right** and you want it to become the live data: in the Neon
   console, copy that branch's **POOLED** connection string, set it as Vercel's
   `DATABASE_URL`, and redeploy. Delete the branch when done. If it looks wrong, just
   delete the branch — nothing live was ever touched.

For a *recent* mistake (a bad edit an hour ago), Neon's own **Point-in-Time Restore**
in the console is faster than a full restore — within the free plan's retention window.

---

## Good to know

- **Uploaded files are covered.** Attachments (PDFs, images) are stored inside the
  database as `bytea`, so they're included in every backup automatically.
- **Only the newest 14 backups are kept** (older Releases are pruned), so the list
  never grows without limit.
- **Nothing sensitive lives in this repo.** The database password, the private key,
  and the Neon API key are only ever in GitHub's encrypted secrets and your password
  manager — never in the code.

### Rotating (changing) the keys later

Generate a new pair with `age-keygen`, then update `AGE_PUBLIC_KEY` (variable) and
`BACKUP_AGE_KEY` (secret). Keep the old private key as long as you might still need to
open backups made with it.
