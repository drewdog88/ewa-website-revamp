// Pull Cloudflare DNS analytics for eastlakewolfpack.org and push to Pushgateway.
// Totals use the REST report. Colo map uses GraphQL (Free plan blocks REST coloName).
// Outbound only. No tunnel.

const PUSHGATEWAY = process.env.PUSHGATEWAY_URL || "http://ewa-pushgateway:9091";
const TOKEN = process.env.OPS_CF_API_TOKEN || "";
const ZONE_ID = process.env.OPS_CF_ZONE_ID || "77c206de9fd97c9d208e4845e28ed2ea";
const INTERVAL_MS = Number(process.env.OPS_POLL_MS || 300000);

const COLO_GEO = {
  AMS: { city: "Amsterdam", country: "Netherlands", lat: 52.31, lon: 4.76 },
  ARN: { city: "Stockholm", country: "Sweden", lat: 59.65, lon: 17.92 },
  ATL: { city: "Atlanta", country: "United States", lat: 33.64, lon: -84.43 },
  BKK: { city: "Bangkok", country: "Thailand", lat: 13.69, lon: 100.75 },
  BOM: { city: "Mumbai", country: "India", lat: 19.09, lon: 72.87 },
  BOS: { city: "Boston", country: "United States", lat: 42.36, lon: -71.01 },
  CDG: { city: "Paris", country: "France", lat: 49.01, lon: 2.55 },
  DEN: { city: "Denver", country: "United States", lat: 39.86, lon: -104.67 },
  DFW: { city: "Dallas", country: "United States", lat: 32.90, lon: -97.04 },
  DUB: { city: "Dublin", country: "Ireland", lat: 53.43, lon: -6.25 },
  EWR: { city: "Newark", country: "United States", lat: 40.69, lon: -74.17 },
  FRA: { city: "Frankfurt", country: "Germany", lat: 50.04, lon: 8.56 },
  HKG: { city: "Hong Kong", country: "Hong Kong", lat: 22.31, lon: 113.91 },
  IAD: { city: "Washington", country: "United States", lat: 38.95, lon: -77.46 },
  ICN: { city: "Seoul", country: "South Korea", lat: 37.46, lon: 126.44 },
  KIX: { city: "Osaka", country: "Japan", lat: 34.43, lon: 135.24 },
  LAX: { city: "Los Angeles", country: "United States", lat: 33.94, lon: -118.41 },
  LHR: { city: "London", country: "United Kingdom", lat: 51.47, lon: -0.45 },
  MAD: { city: "Madrid", country: "Spain", lat: 40.50, lon: -3.57 },
  MCI: { city: "Kansas City", country: "United States", lat: 39.30, lon: -94.71 },
  MEL: { city: "Melbourne", country: "Australia", lat: -37.67, lon: 144.84 },
  MIA: { city: "Miami", country: "United States", lat: 25.80, lon: -80.29 },
  MXP: { city: "Milan", country: "Italy", lat: 45.63, lon: 8.72 },
  NRT: { city: "Tokyo", country: "Japan", lat: 35.77, lon: 140.39 },
  ORD: { city: "Chicago", country: "United States", lat: 41.97, lon: -87.91 },
  OSL: { city: "Oslo", country: "Norway", lat: 60.19, lon: 11.10 },
  PDX: { city: "Portland", country: "United States", lat: 45.59, lon: -122.60 },
  PHX: { city: "Phoenix", country: "United States", lat: 33.43, lon: -112.01 },
  SEA: { city: "Seattle", country: "United States", lat: 47.45, lon: -122.31 },
  SIN: { city: "Singapore", country: "Singapore", lat: 1.36, lon: 103.99 },
  SJC: { city: "San Jose", country: "United States", lat: 37.36, lon: -121.93 },
  SYD: { city: "Sydney", country: "Australia", lat: -33.94, lon: 151.18 },
  TXL: { city: "Berlin", country: "Germany", lat: 52.56, lon: 13.29 },
  YUL: { city: "Montreal", country: "Canada", lat: 45.47, lon: -73.74 },
  YVR: { city: "Vancouver", country: "Canada", lat: 49.19, lon: -123.18 },
  YYC: { city: "Calgary", country: "Canada", lat: 51.12, lon: -114.01 },
  YYZ: { city: "Toronto", country: "Canada", lat: 43.68, lon: -79.63 },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeLabel(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/"/g, "\\\"");
}

async function cfGet(path) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const msg = (body.errors || []).map((e) => e.message).join("; ") || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body.result;
}

async function fetchDnsReport() {
  const until = new Date();
  const since = new Date(until.getTime() - 6 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    metrics: "queryCount,uncachedCount,staleCount",
    dimensions: "queryName,responseCode",
    since: since.toISOString(),
    until: until.toISOString(),
    limit: "50",
  });
  return cfGet(`/zones/${ZONE_ID}/dns_analytics/report?${params}`);
}

async function fetchColoReport() {
  const until = new Date().toISOString();
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const query = `query {
    viewer {
      zones(filter: { zoneTag: "${ZONE_ID}" }) {
        dnsAnalyticsAdaptiveGroups(
          limit: 40
          filter: { datetime_geq: "${since}", datetime_lt: "${until}" }
          orderBy: [count_DESC]
        ) {
          count
          dimensions { coloName }
        }
      }
    }
  }`;
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors?.length) {
    const msg = (body.errors || []).map((e) => e.message).join("; ") || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body.data?.viewer?.zones?.[0]?.dnsAnalyticsAdaptiveGroups || [];
}

function toMetrics(report, colos) {
  const totals = report.totals || {};
  const lines = [
    "# TYPE ewa_cf_dns_queries_6h gauge",
    `ewa_cf_dns_queries_6h ${Number(totals.queryCount) || 0}`,
    "# TYPE ewa_cf_dns_uncached_6h gauge",
    `ewa_cf_dns_uncached_6h ${Number(totals.uncachedCount) || 0}`,
    "# TYPE ewa_cf_dns_stale_6h gauge",
    `ewa_cf_dns_stale_6h ${Number(totals.staleCount) || 0}`,
    "# TYPE ewa_cf_dns_name_queries_6h gauge",
  ];
  for (const row of report.data || []) {
    const name = row.dimensions?.[0] || "unknown";
    const code = row.dimensions?.[1] || "unknown";
    const count = Number(row.metrics?.[0]) || 0;
    const uncached = Number(row.metrics?.[1]) || 0;
    lines.push(
      `ewa_cf_dns_name_queries_6h{name="${escapeLabel(name)}",code="${escapeLabel(code)}"} ${count}`,
    );
    lines.push(
      `ewa_cf_dns_name_uncached_6h{name="${escapeLabel(name)}",code="${escapeLabel(code)}"} ${uncached}`,
    );
  }

  lines.push("# TYPE ewa_cf_dns_colo_queries_6h gauge");
  for (const row of colos) {
    const colo = String(row.dimensions?.coloName || "UNK").toUpperCase();
    const geo = COLO_GEO[colo] || { city: colo, country: "Unknown", lat: 0, lon: 0 };
    if (!COLO_GEO[colo]) continue;
    const count = Number(row.count) || 0;
    lines.push(
      `ewa_cf_dns_colo_queries_6h{colo="${escapeLabel(colo)}",city="${escapeLabel(geo.city)}",country="${escapeLabel(geo.country)}",lat="${geo.lat}",lon="${geo.lon}"} ${count}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

async function pushOnce() {
  if (!TOKEN) {
    console.log("OPS_CF_API_TOKEN is empty; waiting.");
    return;
  }
  const [report, colos] = await Promise.all([fetchDnsReport(), fetchColoReport()]);
  const dest = `${PUSHGATEWAY.replace(/\/$/, "")}/metrics/job/ewa_cf_dns/instance/cloudflare`;
  const push = await fetch(dest, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: toMetrics(report, colos),
  });
  if (!push.ok) throw new Error(`pushgateway ${push.status}`);
  console.log(`pushed ${report.totals?.queryCount || 0} DNS queries, ${colos.length} colos (6h)`);
}

async function main() {
  console.log(`Cloudflare DNS exporter started; interval=${INTERVAL_MS}ms`);
  for (;;) {
    try {
      await pushOnce();
    } catch (err) {
      console.error("export failed:", err?.message || err);
    }
    await sleep(INTERVAL_MS);
  }
}

main();
