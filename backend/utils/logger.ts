// utils/logger.js - Production Hardened v6.0
// ============================================================
// Structured logging with Pino for production readiness
// Migrated from Winston to Pino for improved observability
// ============================================================

// Re-export from infrastructure/logging for backward compatibility
export {
  logInfo,
  logWarn,
  logError,
  logDebug,
  logRequest,
  logResponse,
  generateRequestId,
  createChildLogger,
  createRequestLogger,
  createTransactionLogger,
  createFeatureLogger,
  default as logger,
} from "../infrastructure/logging/index.ts";
