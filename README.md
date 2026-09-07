# Eastlake Wolfpack Association

Board-editable website for the Eastlake High School booster umbrella (501(c)(3), EIN 77-0616862). Public brochure + admin CMS, one Neon Postgres database, deployed on Vercel.

**[Live site](https://www.eastlakewolfpack.org)** · **[Engineering wiki](wiki/Home.md)**

## Run locally

```bash
npm i
npm run dev
```

Point `.env.local` at a Neon database (`DATABASE_URL`, `JWT_SECRET`). Schema and admin seed: see [Development Process](wiki/Development-Process.md).

## What the repo is

| Piece | Role |
|---|---|
| `src/app` | Public site, login, admin panel |
| `api/` | Vercel serverless functions |
| `wiki/` | Source of truth for the GitHub Wiki (syncs on push to `main`) |
| `observability/` | Optional Grafana/Prometheus stack on the NAS; private R2 stats |

Login is protected with **Cloudflare Turnstile** (primary) and **Vercel BotID** (advisory unless `BOTID_ENFORCE_LOGIN=1`). Public pages have no marketing analytics. Fonts are self-hosted.

The footer and Pay / Donate modal carry Washington Charities registration **1126748**. Privacy and accessibility copy live at `#privacy` and `#accessibility`.
