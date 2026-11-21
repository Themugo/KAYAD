// backend/infrastructure/logging/transports.js - Production Hardened v6.0
// ─────────────────────────────────────────────────────────────
// Log transports for Pino
// File rotation via pino-roll, error separation, console output
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
// 📄 FILE TRANSPORT WITH ROTATION (PRODUCTION)
// =============================
const rotateOpts = {
  target: "pino-roll",
  options: {
    file: path.join(logDir, "combined.log"),
    frequency: "daily",
    mkdir: true,
  },
};

const errorRotateOpts = {
  target: "pino-roll",
  options: {
    file: path.join(logDir, "error.log"),
    frequency: "daily",
    mkdir: true,
  },
};

export const fileTransport = pino.transport(rotateOpts);

export const errorTransport = pino.transport(errorRotateOpts);

// =============================
// 🔄 GET TRANSPORTS
// =============================
export const getTransports = () => {
  if (isDev) {
    return consoleTransport;
  }

  // Production: use pino.multistream for multiple outputs
  return pino.multistream([
    { level: "info", stream: fileTransport },
    { level: "error", stream: errorTransport },
  ]);
};
