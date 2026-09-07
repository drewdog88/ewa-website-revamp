# EWA observability

On `main` (merged). Optional NAS stack — the public site does not depend on it.

Site health and app logs for https://www.eastlakewolfpack.org on the Synology NAS.
Uses the **existing Grafana** at http://192.168.1.190:3000.

**No tunnel. No UniFi port forwards. No public object URL.**

| Container | Port | Role |
|---|---|---|
| `ewa-blackbox` | 9115 | HTTPS + DNS probes |
| `ewa-pushgateway` | 9091 | Holds app counters pulled from R2 |
| `ewa-blob-exporter` | none | Private R2 GET → Pushgateway |

## Private R2 bucket

Dedicated bucket **`ewa-ops`** (Western North America). It is not Vercel Blob and it is not shared with any other R2 bucket.

- `r2.dev` public access is **off**
- Lifecycle deletes stray objects after 8 days
- App overwrites one private object: `stats.json`
- Snapshot is capped on every API write (25 recent errors, 7-day age, 7 daily summaries)
- No Vercel cron

## Credentials (two tokens, do not mix)

Cloudflare dashboard → **R2** → **Overview** → **API Tokens** → Create API token.

1. **Vercel (object read & write)** — apply **only** to bucket `ewa-ops`  
   Set one Vercel secret:
   - `OPS_R2_CREDENTIALS` = `ACCESS_KEY_ID,SECRET_ACCESS_KEY`
2. **NAS (object read only)** — apply **only** to bucket `ewa-ops`  
   Put those keys in `/volume1/docker/ewa-observability/blob/exporter.env`

Do not use a global Cloudflare API token. Do not reuse tokens from other buckets.

## NAS deploy

Copy `observability/` to `/volume1/docker/ewa-observability`. Copy `blob/exporter.env.example` to `blob/exporter.env` and fill the read-only keys.

Replace UniFi Prometheus config with `prometheus/prometheus.yml` (UniFi jobs stay). Copy the dashboard JSON to:

`/volume1/docker/unifipoller/grafana/provisioning/dashboards/ewa/ewa-site-health.json`

Restart `ewa-blackbox`, `prometheus`, and `grafana`. Recreate `ewa-blob-exporter` after compose changes.

Do **not** add these services to the UniFi compose. Do **not** delete `unifipoller`.
