// backend/config/sentry.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Sentry APM configuration
// Provides error tracking, performance monitoring, and profiling
// ─────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { withRetry, createServiceConfig } from "../utils/retry.js";
import { recordMetric, incrementCounter } from "./metrics.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { triggerAlert } from "./alerting.js";

// =============================
// 🔧 SENTRY CONFIGURATION
// =============================

// Sentry service configuration with SRE
const sentryConfig = createServiceConfig("sentry", {
  circuitBreaker: true,
  onCircuitOpen: (key, failures, resetMs) => {
    triggerAlert({
      level: "warning",
      message: `Sentry circuit breaker opened after ${failures} failures`,
      source: "sentry",
      metrics: { failures, resetMs },
    });
  },
  fallback: async () => {
    logInfo("Sentry unavailable, using fallback logging");
    incrementCounter("sentry_fallback_used");
    return false;
  },
});

// Local error queue for when Sentry is down
const errorQueue = [];
const MAX_ERROR_QUEUE_SIZE = 1000;

// Queue error for retry when Sentry is available
const queueError = (error, context) => {
  if (errorQueue.length >= MAX_ERROR_QUEUE_SIZE) {
    errorQueue.shift(); // Remove oldest
  }
  errorQueue.push({ error, context, timestamp: Date.now() });
  incrementCounter("sentry_error_queued");
};

// Retry queued errors
export const retryQueuedErrors = async () => {
  if (errorQueue.length === 0) return;

  logInfo(`Retrying ${errorQueue.length} queued Sentry errors`);

  const queueCopy = [...errorQueue];
  errorQueue.length = 0; // Clear queue

  for (const item of queueCopy) {
    try {
      Sentry.captureException(item.error, item.context);
      incrementCounter("sentry_error_retry_success");
    } catch (err) {
      // Re-queue if still failing
      queueError(item.error, item.context);
      incrementCounter("sentry_error_retry_failure");
    }
  }
};

export const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    logInfo("Sentry: DSN not configured - APM disabled");
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      release: process.env.SENTRY_RELEASE || `kayad-backend@${process.env.npm_package_version || "2.0.0"}`,

      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Profiling
      profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Integrations - only use profiling integration, others are auto-instrumented
      integrations: [nodeProfilingIntegration()],

      // Before send for error filtering
      beforeSend(event, hint) {
        const startTime = Date.now();

        try {
          // Filter out sensitive data
          if (event.request) {
            delete event.request.cookies;
            if (event.request.headers) {
              delete event.request.headers.authorization;
              delete event.request.headers.cookie;
            }
          }

          // Filter out 404 errors
          if (event.exception?.values?.[0]?.type === "NotFoundError") {
            return null;
          }

          const duration = Date.now() - startTime;
          recordMetric("sentry_before_send_duration", duration);
          incrementCounter("sentry_before_send_success");

          return event;
        } catch (err) {
          const duration = Date.now() - startTime;
          recordMetric("sentry_before_send_duration", duration, { status: "error" });
          incrementCounter("sentry_before_send_failure");

          // Queue error for retry
          queueError(err, { event });
          return event; // Return event anyway
        }
      },

      // Before send transaction for filtering
      beforeSendTransaction(transaction) {
        const startTime = Date.now();

        try {
          // Filter out health check transactions
          if (transaction.transaction === "GET /health" || transaction.transaction === "GET /api/health") {
            return null;
          }

          const duration = Date.now() - startTime;
          recordMetric("sentry_before_send_transaction_duration", duration);
          incrementCounter("sentry_transaction_sent");

          return transaction;
        } catch (err) {
          const duration = Date.now() - startTime;
          recordMetric("sentry_before_send_transaction_duration", duration, { status: "error" });
          incrementCounter("sentry_transaction_send_failure");
          return transaction;
        }
      },

      // Attach stack traces
      attachStacktrace: true,

      // Environment
      environment: process.env.NODE_ENV || "development",

      // Server name
      serverName: process.env.SENTRY_SERVER_NAME || "kayad-backend",

      // Max breadcrumbs
      maxBreadcrumbs: 50,

      // Debug mode
      debug: process.env.SENTRY_DEBUG === "true",
    });

    logInfo("Sentry initialized successfully");
    incrementCounter("sentry_initialized");
  } catch (err) {
    logError("Failed to initialize Sentry", err);
    incrementCounter("sentry_init_failure");

    triggerAlert({
      level: "warning",
      message: "Failed to initialize Sentry",
      source: "sentry",
      metrics: { error: err.message },
    });
  }
};

// Safe Sentry capture with retry and fallback
export const safeCaptureException = async (error, context = {}) => {
  const startTime = Date.now();

  try {
    await withRetry(
      () => {
        return new Promise((resolve, reject) => {
          try {
            Sentry.captureException(error, context);
            resolve(true);
          } catch (err) {
            reject(err);
          }
        });
      },
      {
        ...sentryConfig,
        timeoutMs: 10000,
        onRetry: (err, attempt) => {
          logWarn(`Sentry capture retry ${attempt}`, { error: err.message });
          incrementCounter("sentry_capture_retry", { attempt });
        },
      },
    );

    const duration = Date.now() - startTime;
    recordMetric("sentry_capture_duration", duration);
    incrementCounter("sentry_capture_success");
  } catch (err) {
    const duration = Date.now() - startTime;
    recordMetric("sentry_capture_duration", duration, { status: "error" });
    incrementCounter("sentry_capture_failure");

    logError("Sentry capture failed, queuing error", err);
    queueError(error, context);
  }
};

// Safe Sentry message capture with retry and fallback
export const safeCaptureMessage = async (message, level = "info", context = {}) => {
  const startTime = Date.now();

  try {
    await withRetry(
      () => {
        return new Promise((resolve, reject) => {
          try {
            Sentry.captureMessage(message, level, context);
            resolve(true);
          } catch (err) {
            reject(err);
          }
        });
      },
      {
        ...sentryConfig,
        timeoutMs: 10000,
        onRetry: (err, attempt) => {
          logWarn(`Sentry message capture retry ${attempt}`, { error: err.message });
          incrementCounter("sentry_message_retry", { attempt });
        },
      },
    );

    const duration = Date.now() - startTime;
    recordMetric("sentry_message_capture_duration", duration);
    incrementCounter("sentry_message_capture_success");
  } catch (err) {
    const duration = Date.now() - startTime;
    recordMetric("sentry_message_capture_duration", duration, { status: "error" });
    incrementCounter("sentry_message_capture_failure");

    logError("Sentry message capture failed", err);
  }
};

export default Sentry;
