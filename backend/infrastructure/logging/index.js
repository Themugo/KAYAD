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
import { redactUrl } from "../../utils/redactUrl.js";

// =============================
// 🚀 CREATE PINO LOGGER
// =============================
const config = getConfig();
const transports = getTransports();

// Phase 14.9: customer phone numbers (M-Pesa STK, SMS, OTP) must not be written to logs in clear. The value is masked to its last
// three digits so a log line can still be correlated by support, and credentials are fully redacted at any of these keys.
const PHONE_KEYS = ["phone", "phoneNumber", "msisdn", "PhoneNumber", "PartyA"];
const SECRET_KEYS = ["password", "currentPassword", "newPassword", "passkey", "consumerSecret", "SecurityCredential"];
const redactPaths = [...PHONE_KEYS, ...SECRET_KEYS].flatMap((k) => [k, `*.${k}`]);
export const maskLogValue = (value, path) => {
  const key = Array.isArray(path) ? path[path.length - 1] : String(path || "").split(".").pop();
  if (PHONE_KEYS.includes(key)) return String(value).replace(/\d(?=\d{3})/g, "*");
  return "[REDACTED]";
};

const logger = pino(
  {
    ...config,
    redact: { paths: [...(config.redact?.paths || []), ...redactPaths], censor: maskLogValue },
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
  // Many call sites pass a plain object ({ error: err.message, ... }) in the `error` slot. pino's err serializer
  // renders anything that is not an Error as `{}`, which hid the real cause of production failures (D-OBS-1).
  // Treat a plain object as structured metadata instead of dropping it.
  if (error && typeof error === "object" && !(error instanceof Error) && Object.getPrototypeOf(error) === Object.prototype) {
    logger.error({ ...error, ...meta }, message);
    return;
  }
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
      url: redactUrl(req.originalUrl || req.url),
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
      url: redactUrl(req.originalUrl || req.url),
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
