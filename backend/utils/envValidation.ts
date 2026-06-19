// backend/utils/envValidation.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Environment variable validation
// Validates required environment variables at startup
// ─────────────────────────────────────────────────────────────

import { logError, logWarn, logInfo } from "./logger.ts";

// =============================
// 🔧 REQUIRED ENVIRONMENT VARIABLES
// =============================

const REQUIRED_ENV_VARS = [
  // Database
  "MONGODB_URI",

  // JWT
  "JWT_SECRET",

  // Server
  "PORT",
  "NODE_ENV",

  // Frontend
  "FRONTEND_URL",

  // Email (optional but recommended)
  // "EMAIL_HOST",
  // "EMAIL_USER",
  // "EMAIL_PASS",
  // "EMAIL_FROM",

  // SMS (optional but recommended)
  // "TWILIO_ACCOUNT_SID",
  // "TWILIO_AUTH_TOKEN",
  // "TWILIO_PHONE_NUMBER",

  // Cloudinary (optional but recommended)
  // "CLOUDINARY_CLOUD_NAME",
  // "CLOUDINARY_API_KEY",
  // "CLOUDINARY_API_SECRET",

  // M-Pesa (required for payments)
  "MPESA_CONSUMER_KEY",
  "MPESA_CONSUMER_SECRET",
  "MPESA_PASSKEY",
  "MPESA_SHORTCODE",
];

// =============================
// 🔧 OPTIONAL ENVIRONMENT VARIABLES
// =============================

const OPTIONAL_ENV_VARS = [
  "REDIS_URL",
  "REDIS_HOST",
  "REDIS_PORT",
  "SENTRY_DSN",
  "SENTRY_RELEASE",
  "SENTRY_SERVER_NAME",
  "SENTRY_DEBUG",
  "SLACK_WEBHOOK_URL",
  "ALERT_EMAIL_TO",
  "ALERT_PHONE_TO",
  "ALERT_WEBHOOK_URL",
  "RATE_LIMIT_MAX",
  "MAX_QUERY_LIMIT",
  "MAX_BODY_BYTES",
  "REQUIRE_EMAIL_VERIFICATION",
  "ESCROW_AUTO_RELEASE_DAYS",
  "ESCROW_CRON_ENABLED",
  "AUCTION_REMINDER_ENABLED",
  "QUEUE_MODE",
  "APP_NAME",
];

// =============================
// ✅ VALIDATE ENVIRONMENT VARIABLES
// =============================

export const validateEnv = () => {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check optional variables
  for (const envVar of OPTIONAL_ENV_VARS) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }

  // Log missing required variables
  if (missing.length > 0) {
    logError("Missing required environment variables", { missing });
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // Log warnings for optional variables
  if (warnings.length > 0) {
    logWarn("Optional environment variables not set", { warnings });
    console.warn(`⚠️  Optional environment variables not set: ${warnings.join(", ")}`);
  }

  // Validate specific variable formats
  validateFormats();

  logInfo("Environment variables validated successfully");

  return {
    valid: true,
    missing,
    warnings,
  };
};

// =============================
// 🔍 VALIDATE VARIABLE FORMATS
// =============================

const validateFormats = () => {
  // Validate MongoDB URI
  if (
    process.env.MONGODB_URI &&
    !process.env.MONGODB_URI.startsWith("mongodb://") &&
    !process.env.MONGODB_URI.startsWith("mongodb+srv://")
  ) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  }

  // Validate PORT
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error("PORT must be a valid port number (1-65535)");
    }
  }

  // Validate FRONTEND_URL
  if (process.env.FRONTEND_URL) {
    try {
      new URL(process.env.FRONTEND_URL);
    } catch (err) {
      throw new Error("FRONTEND_URL must be a valid URL");
    }
  }

  // Validate JWT_SECRET
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logWarn("JWT_SECRET should be at least 32 characters for security");
  }

  // Validate Redis URL if provided
  if (process.env.REDIS_URL) {
    try {
      new URL(process.env.REDIS_URL);
    } catch (err) {
      throw new Error("REDIS_URL must be a valid URL");
    }
  }

  // Validate Sentry DSN if provided
  if (process.env.SENTRY_DSN) {
    try {
      new URL(process.env.SENTRY_DSN);
    } catch (err) {
      throw new Error("SENTRY_DSN must be a valid URL");
    }
  }
};

// =============================
// 📋 GET ENVIRONMENT INFO
// =============================

export const getEnvInfo = () => {
  return {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    frontendUrl: process.env.FRONTEND_URL,
    hasRedis: !!process.env.REDIS_URL || !!process.env.REDIS_HOST,
    hasSentry: !!process.env.SENTRY_DSN,
    hasEmail: !!process.env.EMAIL_HOST,
    hasSMS: !!process.env.TWILIO_ACCOUNT_SID,
    hasCloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
    hasMpesa: !!process.env.MPESA_CONSUMER_KEY,
  };
};

export default {
  validateEnv,
  getEnvInfo,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS,
};
