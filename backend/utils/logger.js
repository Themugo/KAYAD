// utils/logger.js - Production Hardened v2.0
// ============================================================
// Structured logging with Winston for production readiness
// Replaces all console.log statements with proper logging
// ============================================================

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== "production";

// =============================
// 🧠 GENERATE REQUEST ID
// =============================
export const generateRequestId = () => crypto.randomBytes(6).toString("hex");

// =============================
// 📁 LOG DIRECTORY
// =============================
const logDir = path.join(__dirname, "../../logs");

// =============================
// 🎨 CUSTOM FORMAT
// =============================
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// =============================
// 🖨️ CONSOLE FORMAT (DEV)
// =============================
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// =============================
// 📄 FILE TRANSPORTS (PRODUCTION)
// =============================
const transports = [];

if (!isDev) {
  // Combined log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      format: customFormat,
    })
  );

  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "30d",
      format: customFormat,
    })
  );
} else {
  // Console transport for development
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// =============================
// 🚀 WINSTON LOGGER
// =============================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  format: customFormat,
  transports,
  exitOnError: false,
});

// =============================
// 🟢 INFO
// =============================
export const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

// =============================
// 🟡 WARN
// =============================
export const logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

// =============================
// 🔴 ERROR
// =============================
export const logError = (message, error = null, meta = {}) => {
  logger.error(message, {
    ...meta,
    ...(error && {
      error: error.message,
      stack: error.stack,
    }),
  });
};

// =============================
// 🔵 DEBUG
// =============================
export const logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
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

// =============================
// 📤 EXPORT WINSTON INSTANCE
// =============================
export default logger;
