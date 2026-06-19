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
