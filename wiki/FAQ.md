# FAQ

Quick answers. Each links to the page with the full story.

## For the board

**Do I need a developer to change the website?**
No. Everything visible — clubs, news, officers, resources, the fundraiser tracker,
and per-club ways to give — is edited in the **admin panel**, and your changes are
live in seconds with no code change or deploy. See [Admin Panel](Admin-Panel).

**Where do uploaded files (PDFs, images) go?**
Into the database itself, stored as `bytea`. That's deliberate: one nightly backup
captures the entire site — content, settings, *and* every file — with nothing
external to manage. See [Database](Database).

**Is our data backed up? How do I know it actually works?**
Yes — every night, encrypted, stored on GitHub Releases. And every Monday a
**restore drill** actually restores the newest backup into a throwaway database and
checks all 8 tables and at least one admin account are present. If a backup were
bad, the job goes red on a Monday, not during an emergency. See
[Backups & Recovery](Backups-and-Recovery).

**I made a mistake / lost data. Can it be recovered?**
Yes, without touching the live site. A one-click job restores any backup into a
separate Neon branch you inspect first; you only promote it if it looks right. For
a recent slip, Neon's own point-in-time restore is even faster. See
[Backups & Recovery](Backups-and-Recovery).

**How do donations work — does the site take credit cards?**
No card data ever touches the site. Zelle shows a scannable QR that opens the
donor's banking app pre-addressed to the club; other providers (Stripe, PayPal,
Venmo) are simple link-outs to the provider's own page. See [Payments](Payments).

**How much does this cost to run?**
It's built to sit on free / low tiers — React + Vercel + Neon, backups on GitHub
Releases (free). No external file store to pay for. See [Architecture](Architecture).

## For developers & evaluators

**What's the stack?**
Vite + React 18 + TypeScript on the front end, Tailwind v4 for styling, Vercel
serverless functions for the API, and Neon Postgres as the single source of truth.
See [Architecture](Architecture).

**Where's the backend?**
There isn't a separate server. The API is a set of thin Node ESM functions under
`/api`, one file per route, deployed alongside the static front end in the same
Vercel project. See [Architecture](Architecture) and [API Reference](API).

**How is authentication handled?**
Admin passwords are bcrypt-hashed (never plaintext). Login issues a signed JWT in
an **HttpOnly, Secure, SameSite=Lax** cookie; every `/api/admin/*` call re-verifies
it before touching the database. See [How It Works](How-It-Works)#authentication-in-detail.

**Why store files in Postgres instead of a blob store / S3?**
So the backup story is trivially complete: a single `pg_dump` captures everything,
and there's no second datastore to reconcile, secure, or pay for. Uploads are
capped (8 MB) to stay within serverless limits. See [Database](Database).

**How does a content edit reach the public site with no deploy?**
The public site reads from the same tables the admin panel writes. "Save" *is* the
deploy for content — there's no cache to invalidate or build to trigger. See
[How It Works](How-It-Works).

**Is it safe that the repo is public?**
Yes, by design: no secrets in the repo, passwords stored only as bcrypt hashes, and
every backup age-encrypted before upload. Secrets live only in Vercel's encrypted
env and GitHub's encrypted secrets. See [Configuration](Configuration).

**How do I run it locally?**
Install, point it at a Neon database via a local env file, apply the schema, seed an
admin, and start the dev server. See [Development Process](Development-Process).

**What's not done yet?**
See the [Roadmap](Roadmap) — including removing the `noindex` meta tag before public
launch.
