#!/bin/sh
# User-space fallback when Docker needs sudo. Prefer ewa-grafana-proxy in compose.
cd /volume1/docker/ewa-observability/caddy || exit 1
if netstat -lnt 2>/dev/null | grep -q ':3443 '; then
  echo "3443 already listening"
  exit 0
fi
nohup ./caddy run --config Caddyfile.host --adapter caddyfile >> caddy.log 2>&1 &
echo "started $!"
