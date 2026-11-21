// middleware/logger.js - Production Hardened v6.0
// ============================================================
// Request/response logging middleware using Pino
// Migrated from console.log to structured logging
// ============================================================

import { logInfo, logRequest, logResponse, generateRequestId } from "../utils/logger.js";

const SILENT = process.env.NODE_ENV === "test" || process.env.LOG_SILENT === "true";

const logger = (req, res, next) => {
  const start = Date.now();

  // =============================
  // 🧠 UNIQUE REQUEST ID
  // =============================
  const requestId = generateRequestId();
  req.requestId = requestId;

  // Skip verbose request/response logging during tests (keeps CI logs readable)
  if (SILENT) return next();

  // =============================
  // 📡 REQUEST LOG
  // =============================
  logRequest(req);

  // =============================
  // 📤 RESPONSE LOG (AFTER FINISH)
  // =============================
  res.on("finish", () => {
    const duration = Date.now() - start;
    logResponse(req, res, duration);
  });

  next();
};

export default logger;
