// backend/infrastructure/logging/pino.config.js - Production Hardened v6.0
// ─────────────────────────────────────────────────────────────
// Pino configuration for structured logging
// Environment-specific settings for development, staging, production
// ─────────────────────────────────────────────────────────────

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const isTest = process.env.NODE_ENV === "test";

// =============================
// 🎨 BASE CONFIGURATION
// =============================
export const baseConfig = {
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  // Added (Phase 14, performance/observability hardening): found the
  // existing objectSerializer in serializers.js (sensitiveKeys:
  // password/token/secret/apiKey/apiSecret) is structurally
  // disconnected from how logging is actually called throughout this
  // backend - logInfo/logWarn/logError (infrastructure/logging/index.js)
  // spread their meta object directly into the top-level log call
  // (logger.info(meta, message)), never wrapped under the "obj" key
  // that serializer requires to run at all. Confirmed by reading both
  // the serializer and every log-call helper directly, not assumed -
  // the redaction logic existed and looked correct in isolation but
  // never actually fired for a single real call site in this backend.
  //
  // No call site was found this phase that currently logs a raw
  // password/token/secret this way (checked directly - existing calls
  // pass IDs, masked phone numbers, or narrow error objects), so this
  // is a latent structural gap rather than a confirmed live leak - but
  // it is exactly the kind of footgun this phase's own "ensure logs do
  // not expose passwords/tokens/secrets" requirement exists to close
  // before a future call site trips it. Fixed using Pino's own native,
  // built-in redact option instead of trying to patch the disconnected
  // custom serializer - this applies globally to every log call
  // regardless of how the caller structures their meta object, rather
  // than requiring every caller to opt in correctly (the same class of
  // mistake that created this gap in the first place). Paths cover the
  // top level (meta spread directly, e.g. logError("...", err, {
  // password })) and one level deep (the most common real shape, e.g.
  // { user: { password } } or { req: { body: { password } } }) for
  // every sensitive field name already named in objectSerializer's own
  // list, plus otp/authorization/cookie/creditCard/cvv/pin, matching
  // the specific categories this phase's own instruction names
  // (passwords, tokens, payment credentials, secrets, PII).
  redact: {
    paths: [
      "password", "*.password", "*.*.password",
      "token", "*.token", "*.*.token",
      "accessToken", "*.accessToken",
      "refreshToken", "*.refreshToken",
      "secret", "*.secret", "*.*.secret",
      "apiKey", "*.apiKey",
      "apiSecret", "*.apiSecret",
      "otp", "*.otp", "otpHash", "*.otpHash",
      "authorization", "*.authorization", "headers.authorization",
      "cookie", "*.cookie", "headers.cookie",
      "creditCard", "*.creditCard",
      "cvv", "*.cvv",
      "pin", "*.pin",
      "mpesaReceiptNumber", "*.mpesaReceiptNumber",
    ],
    censor: "[REDACTED]",
    remove: false,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

// =============================
// 🖥️ DEVELOPMENT CONFIGURATION
// =============================
export const devConfig = {
  ...baseConfig,
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss",
      ignore: "pid,hostname",
      singleLine: false,
    },
  },
};

// =============================
// 🧪 TEST CONFIGURATION
// =============================
export const testConfig = {
  ...baseConfig,
  level: "silent", // Suppress logs during tests
};

// =============================
// 🚀 PRODUCTION CONFIGURATION
// =============================
export const prodConfig = {
  ...baseConfig,
  level: "info",
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

// =============================
// 🎭 ENVIRONMENT-SPECIFIC CONFIG
// =============================
export const getConfig = () => {
  if (isTest) return testConfig;
  if (isDev) return devConfig;
  return prodConfig;
};
