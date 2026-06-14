// backend/config/sentry.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Sentry APM configuration
// Provides error tracking, performance monitoring, and profiling
// ─────────────────────────────────────────────────────────────

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// =============================
// 🔧 SENTRY CONFIGURATION
// =============================

export const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    console.log("ℹ️  Sentry: DSN not configured - APM disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || `kayad-backend@${process.env.npm_package_version || "2.0.0"}`,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    
    // Integrations
    integrations: [
      nodeProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: null }),
      new Sentry.Integrations.Mongo({ tracing: true }),
    ],
    
    // Before send for error filtering
    beforeSend(event, hint) {
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
      
      return event;
    },
    
    // Before send transaction for filtering
    beforeSendTransaction(transaction) {
      // Filter out health check transactions
      if (transaction.transaction === "GET /health" || transaction.transaction === "GET /api/health") {
        return null;
      }
      return transaction;
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

  console.log("✅ Sentry initialized");
};

export default Sentry;
