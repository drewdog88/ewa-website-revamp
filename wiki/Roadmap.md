# Roadmap

Where the project stands and what's next. Nothing here blocks the site from
running — the core (public site, admin panel, payments, backups) is built and
proven.

## Before public launch

A short, concrete checklist to flip from "ready" to "live":

| Item | Why | Where |
|---|---|---|
| **Remove the `noindex` meta tag** | `index.html` currently ships `<meta name="robots" content="noindex, nofollow">` so search engines skip the pre-launch site. Remove it so the site can be found. | [Deployment](Deployment), [Operations](Operations) |
| **Confirm all five backup config values are set** | Backups fail on purpose without `AGE_PUBLIC_KEY`; recovery needs the Neon secrets. Run one manual backup + one drill and watch them go green. | [Backups & Recovery](Backups-and-Recovery), [Configuration](Configuration) |
| **Store the backup private key in a password manager** | Losing it makes every encrypted backup permanently unreadable — the one truly unrecoverable risk. | [Backups & Recovery](Backups-and-Recovery) |
| **Seed the real board content** | Replace any placeholder clubs / officers / news with the actual roster and announcements. | [Admin Panel](Admin-Panel) |
| **Point the custom domain at Vercel** | Move from the `*.vercel.app` URL to the club's own domain. | [Deployment](Deployment) |

## Nice-to-have next

Improvements worth doing once the site is live and stable — none are required:

- **Email notifications** for new admin logins or content changes, so the board has
  a light audit trail.
- **Multiple admin accounts with names**, so edits can be attributed (the schema
  already supports more than one `users` row).
- **A richer news editor** (image embeds, scheduling) building on the existing
  `is_published` / `published_at` fields.
- **Per-club analytics** — simple counts of donation-button clicks, without any
  tracking of individual donors.
- **A public "annual report" view** driven by the fundraiser tracker.

## Deliberately out of scope

Decisions made on purpose — kept here so they aren't re-litigated:

- **No on-site card processing.** Every payment path hands off to Zelle or a trusted
  provider; EWA stores only public payment addresses/links and never card data. See
  [Payments](Payments).
- **No external file/blob store.** Files live in Postgres as `bytea` so one backup
  captures everything. See [Database](Database).
- **No public sign-up.** `users` is admins-only; the board provisions accounts. See
  [Database](Database).
- **No heavyweight framework or separate backend server.** A single Vercel project
  with thin serverless functions is intentionally boring, cheap, and durable across
  volunteer-board turnovers. See [Architecture](Architecture).

## Guiding principle

Every addition should keep the site **board-editable, self-contained, and safe in
the open**. If a feature would require a developer for routine use, reintroduce an
external datastore to back up, or put anything sensitive in the public repo, it
probably doesn't belong here.
