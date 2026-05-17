// utils/logger.js

import crypto from "crypto";

const isDev = process.env.NODE_ENV !== "production";

// =============================
// 🧠 GENERATE REQUEST ID
// =============================
export const generateRequestId = () =>
  crypto.randomBytes(6).toString("hex");

// =============================
// 🧾 BASE LOGGER
// =============================
const baseLog = (level, message, meta = {}) => {
  const log = {
    level,
    message,
    time: new Date().toISOString(),
    ...meta,
  };

  const output = JSON.stringify(log, null, isDev ? 2 : 0);

  if (level === "ERROR") console.error(output);
  else if (level === "WARN") console.warn(output);
  else console.log(output);
};

// =============================
// 🟢 INFO
// =============================
export const logInfo = (message, meta = {}) => {
  baseLog("INFO", message, meta);
};

// =============================
// 🟡 WARN
// =============================
export const logWarn = (message, meta = {}) => {
  baseLog("WARN", message, meta);
};

// =============================
// 🔴 ERROR
// =============================
export const logError = (message, error = null, meta = {}) => {
  baseLog("ERROR", message, {
    ...meta,
    ...(error && {
      error: error.message,
      stack: isDev ? error.stack : undefined,
    }),
  });
};

// =============================
// 🔵 REQUEST LOGGER (ENHANCED)
// =============================
export const logRequest = (req) => {
  const requestId = generateRequestId();

  req.requestId = requestId;

  logInfo("Incoming Request", {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
};

// =============================
// ✅ RESPONSE LOGGER (OPTIONAL)
// =============================
export const logResponse = (req, res, duration) => {
  logInfo("Request Completed", {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
  });
};