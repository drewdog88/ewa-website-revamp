# Roadmap

Where the project stands and what's next. Nothing here blocks the site from
running — the core (public site, admin panel, payments, backups) is built and
proven.

## Already done (was on the old launch list)

- Search engines allowed (`index, follow`); AI scrapers blocked in `robots.txt` and middleware
- Custom domain `eastlakewolfpack.org` in use
- Cloudflare Turnstile on admin login; BotID advisory
- Washington Charities disclosure on Pay / Donate; privacy + accessibility hashes
- Resource list order (admin arrows → public site + footer)
- Self-hosted fonts (no Google Fonts request)
- Optional private R2 ops stats for NAS Grafana

## Still worth confirming

| Item | Why | Where |
|---|---|---|
| **Confirm all five backup config values are set** | Backups fail on purpose without `AGE_PUBLIC_KEY`; recovery needs the Neon secrets. Run one manual backup + one drill and watch them go green. | [Backups & Recovery](Backups-and-Recovery), [Configuration](Configuration) |
| **Store the backup private key in a password manager** | Losing it makes every encrypted backup permanently unreadable — the one truly unrecoverable risk. | [Backups & Recovery](Backups-and-Recovery) |
| **Keep the Charities Program website field current** | The SOS filing should list `https://eastlakewolfpack.org`. | Washington Charities renewal |

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
- **No marketing analytics or cookie banner.** Public pages do not load analytics
  scripts. See [FAQ](FAQ) and [Observability](Observability).
- **No heavyweight framework or separate backend server.** A single Vercel project
  with thin serverless functions is intentionally boring, cheap, and durable across
  volunteer-board turnovers. See [Architecture](Architecture).

## Guiding principle

Every addition should keep the site **board-editable, self-contained, and safe in
the open**. If a feature would require a developer for routine use, reintroduce an
external datastore to back up, or put anything sensitive in the public repo, it
probably doesn't belong here.
