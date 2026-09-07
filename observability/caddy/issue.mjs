/**
 * Issue a Let's Encrypt cert for grafana.eastlakewolfpack.org via DNS-01.
 * Writes the TXT value to challenge.json, waits for challenge.ready, then
 * writes fullchain.pem + privkey.pem under ./certs.
 */
import acme from "acme-client";
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const domain = "grafana.eastlakewolfpack.org";
const email = process.env.ACME_EMAIL || "Abrill1970@gmail.com";
const certsDir = join(__dirname, "certs");
const challengePath = join(__dirname, "challenge.json");
const readyPath = join(__dirname, "challenge.ready");
const directoryUrl =
  process.env.ACME_DIRECTORY || acme.directory.letsencrypt.production;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(expected) {
  const started = Date.now();
  while (Date.now() - started < 15 * 60 * 1000) {
    try {
      await access(readyPath);
      const body = JSON.parse(await readFile(challengePath, "utf8"));
      if (body.keyAuthorization === expected) return;
    } catch {
      // still waiting
    }
    await sleep(2000);
  }
  throw new Error("Timed out waiting for challenge.ready");
}

const client = new acme.Client({
  directoryUrl,
  accountKey: await acme.crypto.createPrivateKey(),
});

await client.createAccount({
  termsOfServiceAgreed: true,
  contact: [`mailto:${email}`],
});

const [key, csr] = await acme.crypto.createCsr({
  commonName: domain,
});

const cert = await client.auto({
  csr,
  email,
  termsOfServiceAgreed: true,
  challengePriority: ["dns-01"],
  skipChallengeVerification: true,
  async challengeCreateFn(_authz, challenge, keyAuthorization) {
    if (challenge.type !== "dns-01") {
      throw new Error(`Unsupported challenge ${challenge.type}`);
    }
    const record = `_acme-challenge.${domain.replace(/\.$/, "")}`;
    const payload = {
      domain,
      record,
      type: "TXT",
      keyAuthorization,
      createdAt: new Date().toISOString(),
    };
    await writeFile(challengePath, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`Create TXT ${record} = ${keyAuthorization}`);
    console.log(`Then write ${readyPath}`);
    await waitForReady(keyAuthorization);
  },
  async challengeRemoveFn() {
    // Cloudflare record is deleted by the operator after issue.
  },
});

await mkdir(certsDir, { recursive: true });
await writeFile(join(certsDir, "privkey.pem"), key.toString());
await writeFile(join(certsDir, "fullchain.pem"), cert.toString());
console.log(`Wrote ${certsDir}/fullchain.pem and privkey.pem`);
