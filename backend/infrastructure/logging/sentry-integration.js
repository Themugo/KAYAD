// backend/infrastructure/logging/sentry-integration.js - Production Hardened v6.0
// ─────────────────────────────────────────────────────────────
// Sentry integration for Pino
// Error tracking and performance monitoring
// ─────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/node";

// =============================
// 🔗 SENTRY INTEGRATION
// =============================
export const sentryTransport = (options = {}) => {
  return {
    write: (data) => {
      const logEntry = JSON.parse(data);

      // Send errors to Sentry
      if (logEntry.level === "error" || logEntry.level >= 50) {
        Sentry.withScope((scope) => {
          scope.setLevel(logEntry.level);
          scope.setExtras(logEntry);

          if (logEntry.err) {
            Sentry.captureException(logEntry.err);
          } else {
            Sentry.captureMessage(logEntry.msg || "Unknown error");
          }
        });
      }

      // Send warnings to Sentry (optional)
      if (logEntry.level === "warn" && options.captureWarnings) {
        Sentry.withScope((scope) => {
          scope.setLevel("warning");
          scope.setExtras(logEntry);
          Sentry.captureMessage(logEntry.msg || "Warning");
        });
      }
    },
  };
};

// =============================
// 🎯 SENTRY CONFIGURATION
// =============================
export const configureSentry = (dsn, options = {}) => {
  if (!dsn) {
    console.warn("Sentry DSN not provided, skipping Sentry integration");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: options.tracesSampleRate || 0.1,
    ...options,
  });
};

// =============================
// 📤 EXPORT SENTRY FUNCTIONS
// =============================
export { Sentry };
