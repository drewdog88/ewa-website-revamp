// Replace __CARTO_TILES_KEY__ in the provisioned dashboard.
// Reads CARTO_TILES_KEY from the environment (GitHub Actions secret or local env).
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "dashboards", "ewa-site-health.json");
const dest = process.argv[2] || src;
const key = (process.env.CARTO_TILES_KEY || "").trim();
if (!key) {
  console.error("CARTO_TILES_KEY is not set");
  process.exit(1);
}

const json = await readFile(src, "utf8");
if (!json.includes("__CARTO_TILES_KEY__")) {
  console.error("dashboard is missing __CARTO_TILES_KEY__ placeholder");
  process.exit(1);
}
await writeFile(dest, json.replaceAll("__CARTO_TILES_KEY__", key));
console.log(`wrote ${dest}`);
