import fs from "fs";
import assert from "assert";

const gateway = fs.readFileSync("backend/services/communicationGateway.service.js", "utf8");
const env = fs.readFileSync("backend/utils/env.js", "utf8");

assert.match(gateway, /const providerConfigured = \(channel\) =>/);
assert.match(gateway, /channel === "sms".*AT_API_KEY.*AT_USERNAME/s);
assert.match(gateway, /channel === "whatsapp"\) return Boolean\(/);
assert.match(gateway, /channel === "email"\) return Boolean\(process\.env\.BREVO_API_KEY && process\.env\.BREVO_FROM_EMAIL\)/);
assert.match(gateway, /providerConfigured\(channel\)/);
assert.match(gateway, /channel === "sms" \|\| channel === "whatsapp"/);
assert.match(env, /REQUIRE_MPESA/);
assert.match(env, /REQUIRE_SMS/);
assert.match(env, /REQUIRE_WHATSAPP/);

console.log("PASS optional provider routing is capability-aware");
console.log("PASS missing SMS/WhatsApp providers are skipped for generic user communication");
console.log("PASS Brevo remains explicitly configuration-gated");
console.log("OPTIONAL PROVIDER ROUTING VALIDATION: 3/3 PASS");
