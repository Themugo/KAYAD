// backend/utils/sentry.js
// ─────────────────────────────────────────────────────────────
// Sentry error tracking. Zero-code to enable:
//   1. npm install @sentry/node
//   2. Add SENTRY_DSN=https://xxx@sentry.io/xxx to .env
//   3. Everything else is automatic
// ─────────────────────────────────────────────────────────────

let Sentry = null;
let sentryEnabled = false;

export const initSentry = async (app) => {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.log("ℹ️  Sentry disabled — set SENTRY_DSN to enable");
    return;
  }

  try {
    // Dynamic import — won't crash if package not installed
    const SentryModule = await import("@sentry/node").catch(() => null);
    if (!SentryModule) {
      console.warn("⚠️  SENTRY_DSN set but @sentry/node not installed. Run: npm install @sentry/node");
      return;
    }

    Sentry = SentryModule;

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "development",
      release: process.env.APP_VERSION || "1.0.0",
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_RATE || "0.1"), // 10% of requests
      profilesSampleRate: 0.1,

      // Don't send in development unless forced
      enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_FORCE === "true",

      // Scrub sensitive fields from error reports
      beforeSend(event) {
        if (event.request?.data) {
          const scrub = ["password", "currentPassword", "newPassword", "token", "refreshToken"];
          for (const field of scrub) {
            if (event.request.data[field]) event.request.data[field] = "[REDACTED]";
          }
        }
        return event;
      },
    });

    sentryEnabled = true;

    // Add Sentry request handler (must be first middleware)
    if (app && Sentry.Handlers) {
      app.use(Sentry.Handlers.requestHandler());
      app.use(Sentry.Handlers.tracingHandler());
    }

    console.log(`✅ Sentry initialized (${process.env.NODE_ENV})`);
  } catch (err) {
    console.error("❌ Sentry init failed:", err.message);
  }
};

// Add Sentry error handler (must be last middleware, before your own errorHandler)
export const sentryErrorHandler = (app) => {
  if (sentryEnabled && Sentry && Sentry.Handlers && app) {
    app.use(Sentry.Handlers.errorHandler());
  }
};

// Manually capture an exception
export const captureException = (err, context = {}) => {
  if (!sentryEnabled || !Sentry) {
    console.error("[Error]", err?.message, context);
    return;
  }
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureException(err);
  });
};

// Capture a message (info/warning level)
export const captureMessage = (msg, level = "info") => {
  if (!sentryEnabled || !Sentry) return;
  Sentry.captureMessage(msg, level);
};

export const isSentryEnabled = () => sentryEnabled;
