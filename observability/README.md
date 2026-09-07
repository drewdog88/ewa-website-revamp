# EWA observability

Branch: `feat/observability`

Site health and app logs for https://www.eastlakewolfpack.org on the Synology NAS.
Uses the **existing Grafana** at http://192.168.1.190:3000. On the LAN or VPN, use the real cert at https://grafana.eastlakewolfpack.org:3443.

**No tunnel. No UniFi port forwards. No public object URL.**

| Container | Port | Role |
|---|---|---|
| `ewa-blackbox` | 9115 | HTTPS + DNS probes |
| `ewa-pushgateway` | 9091 | Holds app counters pulled from R2 |
| `ewa-blob-exporter` | none | Private R2 GET → Pushgateway |
| `ewa-cf-exporter` | none | Cloudflare DNS analytics → Pushgateway |
| `ewa-grafana-proxy` | 3443 | Caddy TLS for Grafana (`grafana.eastlakewolfpack.org`) |

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

## Cloudflare DNS stats

A second NAS puller reads the Cloudflare DNS analytics API (free plan: last 6 hours) and pushes totals to the same Grafana.

Create a **zone-scoped** API token (not the R2 token):

- Zone → Analytics → Read
- Zone → DNS → Read
- Zone → Zone → Read
- Resources: `eastlakewolfpack.org` only

Put it in `/volume1/docker/ewa-observability/cloudflare/exporter.env` as `OPS_CF_API_TOKEN`.

## NAS deploy

Copy `observability/` to `/volume1/docker/ewa-observability`. Copy `blob/exporter.env.example` to `blob/exporter.env` and fill the read-only keys.

Replace UniFi Prometheus config with `prometheus/prometheus.yml` (UniFi jobs stay). Copy the dashboard JSON to:

`/volume1/docker/unifipoller/grafana/provisioning/dashboards/ewa/ewa-site-health.json`

Restart `ewa-blackbox`, `prometheus`, and `grafana`. Recreate `ewa-blob-exporter` after compose changes.

Grafana TLS (Let’s Encrypt, DNS-01 via Cloudflare):

- URL: https://grafana.eastlakewolfpack.org:3443
- Hostname: `grafana.eastlakewolfpack.org` (grey-cloud A to `192.168.1.190`, not the WAN IP)
- Proxy: `ewa-grafana-proxy` on **3443** so DSM keeps 443. If Docker needs sudo, `caddy/start-host.sh` can bind 3443 as the NAS user.
- Cert files: `/volume1/docker/ewa-observability/caddy/certs/` (not in git)
- Re-issue: `node observability/caddy/issue.mjs` after `npm install` in `observability/caddy`. Create the printed TXT at `_acme-challenge.grafana`, then write `challenge.ready`.
- After compose changes: `sudo /usr/local/bin/docker-compose -f /volume1/docker/ewa-observability/docker-compose.yml up -d grafana-proxy` and `sudo /usr/local/bin/docker restart grafana` so `GF_SERVER_ROOT_URL` applies.

Do **not** add these services to the UniFi compose. Do **not** delete `unifipoller`.
