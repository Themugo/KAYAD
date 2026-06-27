// backend/infrastructure/logging/index.js - Production Hardened v6.0
// ─────────────────────────────────────────────────────────────
// Main logger export with Pino
// Preserves existing API (logInfo, logWarn, logError, logDebug)
// Environment-specific logging, log rotation, Sentry integration
// ─────────────────────────────────────────────────────────────

import pino from "pino";
import crypto from "crypto";
import { getConfig } from "./pino.config.js";
import { getTransports } from "./transports.js";
import { serializers } from "./serializers.js";
import {
  createChildLogger,
  createRequestLogger,
  createTransactionLogger,
  createFeatureLogger,
} from "./child-logger.js";
import { sentryTransport } from "./sentry-integration.js";

// =============================
// 🚀 CREATE PINO LOGGER
// =============================
const config = getConfig();
const transports = getTransports();

const logger = pino(
  {
    ...config,
    serializers: {
      ...config.serializers,
      ...serializers,
    },
  },
  transports,
);

// Note: Sentry.init() is already called by server.js → config/sentry.js with full
// profiling, beforeSend filters, circuit breaker, and error queue. The Pino sentryTransport
// below uses that already-initialized Sentry instance — no duplicate init needed.

// =============================
// 🧠 GENERATE REQUEST ID
// =============================
export const generateRequestId = () => crypto.randomBytes(6).toString("hex");

// =============================
// 🟢 INFO
// =============================
export const logInfo = (message, meta = {}) => {
  logger.info(meta, message);
};

// =============================
// 🟡 WARN
// =============================
export const logWarn = (message, meta = {}) => {
  logger.warn(meta, message);
};

// =============================
// 🔴 ERROR
// =============================
export const logError = (message, error = null, meta = {}) => {
  logger.error({ ...meta, err: error }, message);
};

// =============================
// 🔵 DEBUG
// =============================
export const logDebug = (message, meta = {}) => {
  logger.debug(meta, message);
};

// =============================
// 🔵 REQUEST LOGGER
// =============================
export const logRequest = (req) => {
  const requestId = generateRequestId();
  req.requestId = requestId;

  logger.info(
    {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
    },
    "Incoming Request",
  );
};

// =============================
// ✅ RESPONSE LOGGER
// =============================
export const logResponse = (req, res, duration) => {
  logger.info(
    {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
    },
    "Request Completed",
  );
};

// =============================
// 👶 CHILD LOGGER EXPORTS
// =============================
export { createChildLogger, createRequestLogger, createTransactionLogger, createFeatureLogger };

// =============================
// 📤 EXPORT LOGGER INSTANCE
// =============================
export default logger;
