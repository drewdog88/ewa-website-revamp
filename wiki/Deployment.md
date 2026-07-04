# Deployment

One `git push` to main ships the entire site — static React bundle and serverless
functions — to Vercel's edge. There is no separate backend server to manage, no
deploy script to remember, no multi-step release. Push and the site is live in
under two minutes.

## The deployment model

The site runs as **one Vercel project** with two parts:

1. **Static React SPA** — the `dist/` bundle built by Vite, served from Vercel's
   global CDN. One JavaScript bundle, one CSS file, one HTML shell.
2. **Serverless functions** — every `api/*.js` file becomes a Node function on
   Vercel's runtime. File-per-route, no framework, plain ES modules.

Both deploy together, atomically. A commit to `main` triggers Vercel to build the
React app, snapshot every `/api` function, and wire them together — one deployment
unit, one rollback point.

## The build

Vercel runs the exact command defined in
[`vercel.json`](https://github.com/drewdog88/ewa-website-revamp/blob/main/vercel.json):

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

Behind `npm run build` is **Vite** (see
[`vite.config.ts`](https://github.com/drewdog88/ewa-website-revamp/blob/main/vite.config.ts)),
which:

1. Bundles the React app (`src/main.tsx`) into one optimized JS file with treeshaking
2. Processes Tailwind v4 into a single CSS bundle
3. Resolves `@/` imports to `src/`
4. Emits everything to `dist/`

Vercel takes `dist/`, spreads it across the CDN, and maps every request that isn't
`/api/*` to `index.html` (the SPA entry point).

### What goes in the bundle

| Path | What it is |
|---|---|
| `dist/index.html` | The single-page shell — Vercel serves this for `/`, `/admin`, `/anything` |
| `dist/assets/*.js` | The minified React app (code-split by Vite if configured) |
| `dist/assets/*.css` | The compiled Tailwind v4 bundle |
| `dist/assets/*.svg`, `.png`, etc. | Static assets from `src/assets/` |

All of it is immutable once built. The only thing that changes content *without*
a redeploy is **the database** — see [How It Works](How-It-Works).

## Serverless functions

Every `.js` file directly under `api/` becomes a route. Vercel maps the filesystem
to HTTP:

```
api/
  clubs.js          → GET /api/clubs
  news.js           → GET /api/news
  fundraiser.js     → GET /api/fundraiser
  auth/
    login.js        → POST /api/auth/login
    logout.js       → POST /api/auth/logout
    me.js           → GET /api/auth/me
  admin/
    clubs.js        → GET/POST/PUT/DELETE /api/admin/clubs
    news.js         → GET/POST/PUT/DELETE /api/admin/news
    artifacts.js    → POST /api/admin/artifacts
  artifacts/
    [id].js         → GET /api/artifacts/:id
```

Each function is a **Vercel Node.js ESM handler** (Node 20 runtime) with a 10-second
default timeout and 1 GB memory. They run stateless, ephemeral, and cold-start on
every request outside of keep-warm windows. That's why the functions are thin — one
SQL call, return JSON, done.

Shared helpers (`api/_lib/db.js`, `http.js`, `auth.js`, `zelle.js`) are bundled
into every function that imports them. Vercel doesn't deploy `_lib/` as routes
because the underscore prefix is reserved.

## SPA routing and rewrites

Because this is a single-page app with no client-side router (view switching happens
in `App.tsx` state, not URL paths), there are no explicit rewrites in `vercel.json`.
Vercel's default behavior already does what the site needs:

- Requests to `/api/*` → serverless function
- Everything else → `dist/index.html`

So `/`, `/admin`, `/login`, and `/nonexistent-path` all serve the same HTML shell,
and the React app decides what to show based on internal state (not the URL).

If we later add client-side routing (e.g., React Router with browser history), we'd
add a rewrite rule to catch 404s and return `index.html` so direct navigation to
`/admin` still works. For now, none is needed.

## Environment variables

The serverless functions need secrets to talk to the database and sign sessions.
These **never** live in the repo — they're set in Vercel's encrypted environment
store and injected at runtime.

| Variable | Purpose | Where it's used |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection string (WSS) | `api/_lib/db.js` — the `sql` client |
| `JWT_SECRET` | HMAC key for signing session tokens | `api/_lib/auth.js` — login/verify |
| `NEON_POOL_URL` | Neon Postgres Pool connection string (for migration scripts) | `scripts/*.mjs` — DDL + seed |

See **[Configuration](Configuration)** for the full list, how to set them locally
(`.env.local`), and how to add them to Vercel's dashboard.

> **Security note:** `.env.local` and `.env.migrate` are `.gitignore`'d. The
> connection strings and secrets inside them are the keys to the database — treat
> them like root passwords.

## How a deploy happens

### Automatic deploys (production)

1. A commit lands on `main` (via direct push or merged PR).
2. Vercel detects the push via the GitHub integration.
3. Vercel runs `npm install`, then `npm run build`.
4. Vercel snapshots the `dist/` directory and every `api/*.js` function.
5. The new bundle and functions go live at the production URL:  
   **https://ewa-website-revamp.vercel.app**
6. The previous deployment becomes the rollback target (one-click in Vercel's dashboard).

Total time: **~90 seconds** from push to live.

### Preview deploys (branches)

Every branch pushed to GitHub gets a **preview deployment** at a unique URL
(e.g., `ewa-website-revamp-git-feature-branch.vercel.app`). Preview deploys:

- Run the same build as production
- Use the same environment variables (unless branch-specific overrides are set)
- Are isolated — they don't affect the production site
- Auto-delete when the branch is deleted

Preview deploys are useful for:

- Testing changes in a live environment before merging
- Sharing a WIP feature with the board for feedback
- Verifying a fix in isolation

### What triggers a deploy

| Event | Result |
|---|---|
| Push to `main` | Production deploy |
| Push to any other branch | Preview deploy for that branch |
| Merge a PR | Production deploy (because it updates `main`) |
| Direct edit in Vercel dashboard | No deploy (config-only change) |
| Database content change via admin panel | **No deploy** — content is live instantly |

## Pre-launch checklist

Before announcing the site publicly, **remove the `noindex` meta tag** from
[`index.html`](https://github.com/drewdog88/ewa-website-revamp/blob/main/index.html).
Right now it reads:

```html
<meta name="robots" content="noindex, nofollow" />
```

This tells Google and other search engines **not to index the site**. It's there
because the site is in preview and we don't want it appearing in search results
yet. Once the board is ready to go public:

1. Delete that line (line 10 in `index.html`).
2. Commit: `Remove noindex — site is ready for public launch`.
3. Push to `main`.

The next deploy will allow search engines to crawl and index the site.

## Rollback

If a deploy breaks something, rollback is instant and non-destructive:

1. Open the Vercel dashboard → **Deployments**.
2. Find the last known-good deployment (the one before the bad commit).
3. Click the "..." menu → **Promote to Production**.

Vercel atomically switches traffic back to the old deployment. The broken
deployment stays in history — nothing is deleted — so you can roll forward again
later if needed.

> Rollback only affects **code** (the React bundle and serverless functions).
> It does **not** rewind the database. If a deploy also ran a migration that
> changed the schema or deleted data, you need to restore from backup — see
> [Backups & Recovery](Backups-and-Recovery).

## Why content changes don't require a deploy

Every piece of visible content — clubs, news, officers, resources, fundraiser
settings, uploaded files — lives in **Neon Postgres**, not in the code. When
a board member edits an announcement in the admin panel:

1. The change is written to the `news` table immediately.
2. The public site's next load fetches from that same table.
3. The new content appears in seconds, with no build, no deploy, no developer.

The React app and serverless functions are just the *interface* to the database.
Shipping new code only matters when the interface itself changes — a new feature,
a layout tweak, a bug fix. For everything else, the database is the deploy.

See **[How It Works](How-It-Works)** for the full request lifecycle.

---

## Related pages

- **[Architecture](Architecture)** — how the pieces fit together
- **[Configuration](Configuration)** — every environment variable and how to set it
- **[Backups & Recovery](Backups-and-Recovery)** — restoring from disaster
- **[Development Process](Development-Process)** — running and changing the site locally
- **[Operations & Troubleshooting](Operations)** — what breaks and how to tell
