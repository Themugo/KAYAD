// backend/infrastructure/logging/transports.js - Production Hardened v6.0
// ─────────────────────────────────────────────────────────────
// Log transports for Pino
// File rotation, error separation, console output
// ─────────────────────────────────────────────────────────────

import pino from "pino";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== "production";

// =============================
// 📁 LOG DIRECTORY
// =============================
const logDir = path.join(__dirname, "../../../logs");

// Ensure log directory exists
if (!isDev && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// =============================
// 🖥️ CONSOLE TRANSPORT (DEV)
// =============================
export const consoleTransport = pino.transport({
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "HH:MM:ss",
    ignore: "pid,hostname",
    singleLine: false,
  },
});

// =============================
// 📄 FILE TRANSPORT (PRODUCTION)
// =============================
export const fileTransport = pino.transport({
  target: "pino/file",
  options: {
    destination: path.join(logDir, "combined.log"),
    mkdir: true,
  },
});

// =============================
// 🔴 ERROR FILE TRANSPORT (PRODUCTION)
// =============================
export const errorTransport = pino.transport({
  target: "pino/file",
  options: {
    destination: path.join(logDir, "error.log"),
    mkdir: true,
  },
});

// =============================
// 🔄 GET TRANSPORTS
// =============================
export const getTransports = () => {
  if (isDev) {
    return consoleTransport;
  }

  // Production: use pino.multi-stream for multiple outputs
  return pino.multistream([
    { level: "info", stream: fileTransport },
    { level: "error", stream: errorTransport },
  ]);
};
