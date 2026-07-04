# Architecture

One React app, a thin serverless API, one Postgres database. Everything is a
single Vercel deployment — there is no separate backend server to run.

![EWA system architecture — visitors and board members reach one React app on Vercel's edge; it calls thin serverless /api functions that read and write a single Neon Postgres database holding all eight tables and every uploaded file, with nightly age-encrypted backups pushed to GitHub Releases](assets/architecture.png)

## The three layers

### 1. The React SPA (the browser)

A single-page app built with **Vite + React 18 + TypeScript**, styled with
**Tailwind v4** (CSS-variable theming) on top of **shadcn/ui + Radix** primitives.
It ships as one static bundle to Vercel's CDN.

There's no client-side router in play for navigation between "pages" — instead
[`src/app/App.tsx`](https://github.com/drewdog88/ewa-website-revamp/blob/main/src/app/App.tsx)
holds a single `view` state that swaps between three top-level screens:

| `view` | Screen | Shown when |
|---|---|---|
| `"site"` | `PublicSite` | Default — what everyone sees |
| `"login"` | `LoginScreen` | Reached from a discreet admin entry |
| `"admin"` | `AdminPanel` | Only if a valid session exists |

On load, `App` fetches all public content in parallel and, silently, asks the API
"am I already logged in?" (`/api/auth/me`) so a returning admin lands straight in
the panel. Any single content fetch that fails is non-fatal — that section just
renders empty rather than taking down the page.

### 2. The serverless API (`/api`)

Plain **Vercel Node functions**, one file per route, written as ES modules. They
are deliberately thin — validate, run one or two SQL statements, return JSON.
Three tiny shared helpers keep them consistent:

| Helper | File | Job |
|---|---|---|
| `sql` | `api/_lib/db.js` | The shared Neon client (`neon(DATABASE_URL)`) |
| `json` / `methodGuard` / `readBody` | `api/_lib/http.js` | Uniform responses, method allow-lists, body parsing |
| `requireAuth` / session helpers | `api/_lib/auth.js` | JWT session cookie verify + set/clear |

See the full list on the **[API Reference](API)**.

### 3. Neon Postgres (the source of truth)

One database, **eight tables**. Content tables (`clubs`, `news`, `officers`,
`resources`, `fundraiser`, `payment_methods`) plus `users` (admins) and
`artifacts` (uploaded files as `bytea`). Because files live *in* the database,
there is no external blob store to manage or back up separately.

The app talks to Neon with the **`@neondatabase/serverless` HTTP driver** — a good
fit for short-lived serverless calls. (Schema DDL is applied with Neon's
WebSocket `Pool` instead, because multi-statement DDL needs it — see
[Development Process](Development-Process).)

## Why one database matters

An edit made in the admin panel is immediately visible everywhere — the public
site reloads its content from the same tables the admin just wrote. There is no
cache to invalidate, no second datastore to reconcile, no build step to trigger.
"Save" in the panel *is* the deploy for content.

## Repository layout

```
ewa-website-revamp/
  api/
    _lib/          db.js, http.js, auth.js, zelle.js  (shared helpers)
    admin/         clubs, news, officers, resources, fundraiser, artifacts  (auth)
    auth/          login, logout, me
    artifacts/     [id].js   (public file serving)
    *.js           public GETs: clubs, news, officers, resources, fundraiser
  src/
    app/           App, PublicSite, AdminPanel, LoginScreen, PaymentModal, api.ts
    app/components/ui/   shadcn/ui + Radix components
    styles/        Tailwind v4 + theme.css (CSS-variable theming)
  scripts/         schema.sql + migration/seed tooling (*.mjs)
  wiki/            this documentation (synced to the GitHub Wiki)
  .github/workflows/   backup, restore-drill, restore, sync-wiki
  BACKUP.md        disaster-recovery runbook
```

Next: the full request lifecycle on **[How It Works](How-It-Works)**.