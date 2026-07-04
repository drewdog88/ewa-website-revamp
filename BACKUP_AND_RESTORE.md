# Database Backup & Restore — Setup Guide

This site automatically backs up its database **once a week** and saves an
**encrypted** copy inside this repository (in the `backups/` folder). Because the
copy is encrypted, it is safe even though this repository is public — nobody can
read the member data without the secret key you create below.

You only have to do this setup **once**. After that, backups happen on their own
every Sunday.

There are two automated jobs:

| Job | What it does | When it runs |
|-----|--------------|--------------|
| **Weekly DB Backup** | Makes an encrypted snapshot of the database and saves it in `backups/` | Every Sunday (also runnable on demand) |
| **Restore DB to Safe Branch** | Takes an encrypted snapshot and rebuilds it into a **brand-new scratch copy** of the database so you can check it | Only when you click "Run" yourself |

> The restore job **never** touches the live database. It always builds a fresh,
> separate copy (a Neon "branch") that you can inspect and throw away.

---

## Part 1 — Make your encryption keys (one time, ~5 minutes)

The keys are made with a small free tool called **age**. You create a matching
pair: a **public key** (used to lock/encrypt backups) and a **private key** (used
to unlock/decrypt them). Keep the private key secret — it's the only thing that
can open your backups.

### On a Mac

1. Open the **Terminal** app.
2. Install age by pasting this and pressing Return:
   ```
   brew install age
   ```
   (If it says `brew: command not found`, first install Homebrew from https://brew.sh, then run the line above.)
3. Create your key pair:
   ```
   age-keygen -o ewa-backup-key.txt
   ```
4. This prints a line that starts with **`Public key: age1...`** — that whole
   `age1...` value is your **public key**. Copy it somewhere handy for a moment.
5. The file `ewa-backup-key.txt` now sits in your home folder and contains the
   **private key** (a line starting with `AGE-SECRET-KEY-...`). Open it:
   ```
   cat ewa-backup-key.txt
   ```

### Save your keys safely

- Put the **whole contents of `ewa-backup-key.txt`** (the `AGE-SECRET-KEY-...`
  line) into your password manager (1Password, Bitwarden, etc.). This is your
  lifeline — without it, backups can never be opened.
- You'll also paste both keys into GitHub in Part 2.
- After you've saved it in your password manager and GitHub, you can delete the
  local file:
  ```
  rm ewa-backup-key.txt
  ```

---

## Part 2 — Tell GitHub the secrets (one time, ~5 minutes)

GitHub keeps these values encrypted and hidden. The automated jobs read them when
they run.

1. Go to the repository on GitHub in your browser.
2. Click **Settings** (top menu) → in the left sidebar, **Secrets and variables**
   → **Actions**.
3. Click the green **New repository secret** button, once for each row below.
   Type the **Name** exactly as shown, paste the **Value**, and click *Add secret*.

| Name (type exactly) | Value to paste |
|---------------------|----------------|
| `AGE_PUBLIC_KEY` | The `age1...` public key from Part 1 |
| `AGE_PRIVATE_KEY` | The whole `AGE-SECRET-KEY-...` private key line from Part 1 |
| `DATABASE_URL_UNPOOLED` | The **direct** Neon connection string (see note below) |
| `NEON_API_KEY` | A Neon API key (see note below) |
| `NEON_PROJECT_ID` | Your Neon project id (see note below) |

**Where the Neon values come from** (all in the Neon console at https://console.neon.tech):

- **`DATABASE_URL_UNPOOLED`** — On your project's *Dashboard*/*Connect* screen,
  copy the connection string. Make sure it is the **direct** connection, **not**
  the "Pooled connection" — the pooled one won't work for backups. (The direct
  host usually does *not* contain the word `-pooler`.)
- **`NEON_API_KEY`** — Neon *Account settings* → *API keys* → *Create new API key*.
- **`NEON_PROJECT_ID`** — Neon *Project settings* → *General*; it looks like
  `dark-forest-12345678`.

That's it. The first automatic backup will appear the next Sunday. You can also
run one immediately using Part 3.

---

## Part 3 — Run a backup right now (optional)

1. On GitHub, click the **Actions** tab.
2. In the left list, click **Weekly DB Backup**.
3. Click **Run workflow** → **Run workflow**.
4. After a minute or two a new file like `backups/ewa-2026-07-05.sql.gz.age`
   will be committed. That's your encrypted snapshot.

Only the 12 most recent weekly backups are kept, so the folder never grows
without limit.

---

## Part 4 — Restore (only if something goes wrong)

This rebuilds a chosen backup into a **new, separate copy** of the database so you
can look before you leap. It never overwrites the live site's data.

1. On GitHub, click the **Actions** tab → **Restore DB to Safe Branch** →
   **Run workflow**.
2. Fill in:
   - **backup_file** — leave blank to use the newest backup, or paste a path like
     `backups/ewa-2026-06-28.sql.gz.age`.
   - **branch_name** — a name for the scratch copy, e.g. `restore-check`. (It will
     refuse names like `main` or `production` on purpose.)
3. Click **Run workflow**. When it finishes, open the **Neon console** — you'll
   see a new branch with that name containing the restored data.
4. Inspect it. If it looks right and you want it to become the live data, promote
   the branch **in the Neon console yourself** (Neon → Branches → the branch →
   *Set as primary* / promote). The automation deliberately stops short of this
   final, irreversible step.

---

## Frequently asked

**Is it safe that backups sit in a public repo?**
Yes — every backup is encrypted with your public key before it's committed. Only
someone holding your `AGE-SECRET-KEY-...` private key can read it, and that key is
only ever in your password manager and GitHub's encrypted secrets — never in the
repo.

**What if I lose the private key?**
Then existing backups can't be opened. Store it in your password manager now, and
consider giving a trusted second board member a copy.

**Can I rotate (change) the keys later?**
Yes. Generate a new pair with `age-keygen`, update `AGE_PUBLIC_KEY` and
`AGE_PRIVATE_KEY` in GitHub secrets, and keep the old private key around only as
long as you might need to open older backups made with the old key.
