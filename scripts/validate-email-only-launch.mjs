#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const env = read("backend/utils/env.js");
const gateway = read("backend/services/communicationGateway.service.js");
const auth = read("backend/controllers/authController.js");
const events = read("backend/services/communicationEvents.service.js");
const render = read("render.yaml");

check("Brevo is the canonical email provider", env.includes('BREVO_API_KEY') && gateway.includes('"brevo"') && gateway.includes("sendRawEmail"));
check("M-Pesa is optional by default", env.includes('flag: "REQUIRE_MPESA"') && env.includes('flag: "REQUIRE_SMS"') && env.includes('flag: "REQUIRE_WHATSAPP"'));
check("Optional providers fail closed when explicitly required", env.includes('process.env[group.flag] !== "true"') && env.includes("hasError = true"));
check("Generic communication skips unavailable SMS/WhatsApp", gateway.includes('channel === "sms" || channel === "whatsapp"') && gateway.includes('!providerConfigured(channel)') && gateway.includes('continue;'));
check("Registration sends verification through email only", auth.includes('eventType: COMMUNICATION_EVENTS.EMAIL_VERIFICATION') && auth.includes('channel: "email"') && !auth.slice(auth.indexOf('export const register'), auth.indexOf('// =============================\n// 🔑 LOGIN')).includes('sendSMS') && !auth.slice(auth.indexOf('export const register'), auth.indexOf('// =============================\n// 🔑 LOGIN')).includes('sendTwilioWhatsApp'));
check("Registration survives verification-provider failure after atomic account creation", auth.includes("kayad_register_identity_atomic") && auth.includes("void deliver(verificationPayload).catch") && !auth.includes("User.findByIdAndDelete(user.id)"));
check("Registration uses atomic identity creation without provider rollback", auth.includes("kayad_register_identity_atomic") && auth.includes("p_email_verify_token") && auth.includes("void deliver(verificationPayload).catch") && !auth.includes("User.findByIdAndDelete(user.id)"));
check("Verification resend preserves the previous token when replacement delivery fails", auth.includes("const nextVerifyTokenHash = hashToken(verifyToken)") && auth.includes("const nextVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000)") && auth.includes("userAuth.emailVerifyToken = nextVerifyTokenHash") && auth.includes("Provider acceptance is the commit point for the replacement token") && !auth.includes("const previousVerifyToken = userAuth.emailVerifyToken"));
check("Registration sends welcome email through canonical gateway", auth.includes('eventType: COMMUNICATION_EVENTS.REGISTRATION') && auth.includes('channel: "email"') && auth.includes('templateCode: "account_welcome_email"'));
check("Communication defaults remain in-app plus email", events.includes('channels: ["in_app", "email"]'));
check("Render keeps optional provider credentials available for later activation", render.includes('key: MPESA_CONSUMER_KEY') && render.includes('key: AT_API_KEY') && render.includes('key: TWILIO_ACCOUNT_SID'));

const failed = checks.filter((x) => !x.ok);
console.log(`\nEMAIL-ONLY LAUNCH CONTRACT: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
