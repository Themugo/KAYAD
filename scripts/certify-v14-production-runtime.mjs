import { spawn } from "node:child_process";

const run = (script, env = {}) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [script], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  child.on("error", reject);
  child.on("exit", (code, signal) => resolve({ code: code ?? 1, signal }));
});

const required = process.env.KAYAD_REQUIRE_LIVE_CERTIFICATION === "true";
const hasCredentials = Boolean(process.env.KAYAD_CERT_EMAIL && process.env.KAYAD_CERT_PASSWORD);

console.log("KAYAD V14 production runtime certification");
console.log(`Live authenticated certification required: ${required ? "yes" : "no"}`);

const production = await run("scripts/verify-production-deployment.mjs");
if (production.code !== 0) {
  console.error("Production deployment verification failed; stopping before authenticated certification.");
  process.exit(production.code || 1);
}

if (!hasCredentials) {
  const message = "Authenticated live certification is blocked: KAYAD_CERT_EMAIL/KAYAD_CERT_PASSWORD are not configured.";
  if (required) {
    console.error(`FAIL ${message}`);
    process.exit(2);
  }
  console.warn(`WARN ${message}`);
  console.log("Production runtime certification: public deployment verified; authenticated certification pending credentials.");
  process.exit(0);
}

const live = await run("scripts/certify-v14-live-api.mjs");
if (live.code !== 0) process.exit(live.code || 1);

console.log("Production runtime certification: PASS");
