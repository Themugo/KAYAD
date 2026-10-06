#!/usr/bin/env node
import assert from "node:assert/strict";

const original = { ...process.env };

const core = {
  NODE_ENV: "production",
  PORT: "5000",
  FRONTEND_URL: "https://kayad.space",
  BACKEND_URL: "https://api.kayad.space",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
  JWT_SECRET: "a".repeat(40),
  REFRESH_TOKEN_SECRET: "b".repeat(40),
  SESSION_SECRET: "c".repeat(40),
  BREVO_API_KEY: "test-brevo",
  BREVO_FROM_EMAIL: "no-reply@kayad.space",
  REDIS_URL: "redis://localhost:6379",
};

const optionalKeys = [
  "MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_SHORTCODE", "MPESA_PASSKEY",
  "AT_API_KEY", "AT_USERNAME",
  "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_NUMBER",
  "REQUIRE_MPESA", "REQUIRE_SMS", "REQUIRE_WHATSAPP",
];

try {
  for (const key of optionalKeys) delete process.env[key];
  Object.assign(process.env, core);

  const { validateEnv } = await import("../backend/utils/env.js");

  // The current launch profile intentionally has no M-Pesa, SMS or WhatsApp
  // credentials. Core registration/email/listing infrastructure must still validate.
  validateEnv({ silent: true });
  console.log("PASS production starts with optional M-Pesa/SMS/WhatsApp integrations absent");

  process.env.REQUIRE_MPESA = "true";
  let failed = false;
  try { validateEnv({ silent: true }); } catch { failed = true; }
  assert.equal(failed, true, "REQUIRE_MPESA=true must fail without M-Pesa credentials");
  console.log("PASS REQUIRE_MPESA=true fails closed without credentials");

  delete process.env.REQUIRE_MPESA;
  process.env.REQUIRE_SMS = "true";
  failed = false;
  try { validateEnv({ silent: true }); } catch { failed = true; }
  assert.equal(failed, true, "REQUIRE_SMS=true must fail without SMS credentials");
  console.log("PASS REQUIRE_SMS=true fails closed without credentials");

  delete process.env.REQUIRE_SMS;
  process.env.REQUIRE_WHATSAPP = "true";
  failed = false;
  try { validateEnv({ silent: true }); } catch { failed = true; }
  assert.equal(failed, true, "REQUIRE_WHATSAPP=true must fail without WhatsApp credentials");
  console.log("PASS REQUIRE_WHATSAPP=true fails closed without credentials");

  console.log("PRODUCTION OPTIONAL-INTEGRATION VALIDATION: 4/4 PASS");
} finally {
  for (const key of Object.keys(process.env)) {
    if (!(key in original)) delete process.env[key];
  }
  Object.assign(process.env, original);
}
