/**
 * V14.3 controlled certification gate.
 *
 * Runs the canonical domain validators already present in the repository and
 * reports live provider/API certification as BLOCKED when credentials are not
 * supplied. It never fabricates production records and never silently replaces
 * a failed live certification with a local mock.
 */
import { spawnSync } from "node:child_process";

const root = process.cwd();
const gates = [
  ["production activation", "scripts/validate-v14-production-activation.mjs"],
  ["finance domain", "scripts/validate-finance-domain-end-to-end.mjs"],
  ["subscription domain", "scripts/validate-subscription-domain-e2e.mjs"],
  ["inspection/chat realtime", "scripts/validate-inspection-chat-realtime-e2e.mjs"],
  ["admin control plane", "scripts/validate-admin-control-plane-e2e.mjs"],
];

let failed = false;
for (const [name, script] of gates) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    failed = true;
    console.log(`FAIL gate: ${name}`);
  } else {
    console.log(`PASS gate: ${name}`);
  }
}

const liveApiReady = Boolean(process.env.KAYAD_CERT_EMAIL && process.env.KAYAD_CERT_PASSWORD);
const providerChannels = String(process.env.PROVIDER_CERT_CHANNELS || "email,sms")
  .split(",").map((x) => x.trim()).filter(Boolean);
const providerConfigured = {
  email: Boolean(process.env.RESEND_API_KEY && process.env.PROVIDER_CERT_EMAIL),
  sms: Boolean(process.env.AT_API_KEY && process.env.AT_USERNAME && process.env.PROVIDER_CERT_PHONE),
  whatsapp: Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER &&
    process.env.PROVIDER_CERT_PHONE,
  ),
};

console.log("\n=== live API ===");
if (liveApiReady) {
  const result = spawnSync(process.execPath, ["scripts/certify-v14-live-api.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) failed = true;
} else {
  console.log("BLOCKED live API certification: KAYAD_CERT_EMAIL/KAYAD_CERT_PASSWORD are not configured.");
}

console.log("\n=== provider certification ===");
const requested = providerChannels.length ? providerChannels : ["email", "sms"];
const missing = requested.filter((channel) => !providerConfigured[channel]);
if (missing.length) {
  console.log(`BLOCKED provider certification: missing ${missing.join(", ")} credentials/recipients.`);
} else {
  const result = spawnSync(process.execPath, ["scripts/validate-communications-provider-certification.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) failed = true;
}

console.log(`\nV14.3 controlled certification gate: ${failed ? "FAILED" : "PASS WITH LIVE GATES EXPLICITLY IDENTIFIED"}`);
if (failed) process.exit(1);
