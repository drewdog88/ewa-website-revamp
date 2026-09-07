# Observability

Optional ops telemetry. It does **not** power the public site. If R2 writes fail, visitors and admin still work.

## What the app writes

After each JSON API response, [`api/_lib/http.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/http.js) best-effort updates one private Cloudflare R2 object (`stats.json` in bucket `ewa-ops`):

- Request counts by path and status
- Login counters (ok / fail / blocked / session)
- Last 25 error snippets (no passwords or usernames)

Implementation: [`api/_lib/ops-log.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/ops-log.js) and [`api/_lib/r2.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/r2.js). Concurrent homepage fetches all hit the same object; etag races are retried. A Vercel log line `ops-log write failed: fetch failed` means that extra R2 hop missed — not that Neon or login broke.

There is **no** Google Analytics, Cloudflare Web Analytics, or visitor pixel on the public site. Turnstile runs only on the admin login.

## NAS / Grafana

Prometheus, blackbox probes, and a blob exporter that reads `stats.json` into Pushgateway live under [`observability/`](https://github.com/drewdog88/ewa-website-revamp/tree/main/observability). Setup (tokens, compose, dashboard path) is in [`observability/README.md`](https://github.com/drewdog88/ewa-website-revamp/blob/main/observability/README.md).

Use a **bucket-scoped** R2 token. Do not put that token in the repo.

## Related

- [Configuration](Configuration) — `OPS_R2_*` and Turnstile / BotID env vars
- [Operations](Operations) — when a log line is noise vs a real outage
