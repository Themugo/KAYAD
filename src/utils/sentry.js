// src/utils/sentry.js
// ─────────────────────────────────────────────────────────────
// Frontend Sentry error tracking.
// Zero-code to enable:
//   1. npm install @sentry/react
//   2. Add VITE_SENTRY_DSN=https://xxx@sentry.io/xxx to .env
// ─────────────────────────────────────────────────────────────

let Sentry = null;
let initialized = false;

export const initSentry = async () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  try {
    // Dynamic import — won't crash if package not installed
    const mod = await import("@sentry/react").catch(() => null);
    if (!mod) {
      console.warn("[Sentry] @sentry/react not installed. Run: npm install @sentry/react");
      return;
    }

    Sentry = mod;

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION || "1.0.0",
      tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACE_RATE || "0.1"),
      replaysOnErrorSampleRate: 1.0,   // full session replay on errors

      // Don't capture known noise
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "ChunkLoadError",
        "Failed to fetch",
        "NetworkError",
        /^Network Error$/,
        /Loading chunk \d+ failed/,
      ],

      beforeSend(event) {
        // Strip sensitive data
        if (event.request?.data) {
          ["password", "token", "phone"].forEach(k => {
            if (event.request.data[k]) event.request.data[k] = "[REDACTED]";
          });
        }
        return event;
      },
    });

    initialized = true;
    if (import.meta.env.DEV) console.log("[Sentry] Initialized");
  } catch (err) {
    console.warn("[Sentry] Init failed:", err.message);
  }
};

// Manually report an error
export const reportError = (err, context = {}) => {
  if (!initialized || !Sentry) {
    console.error("[Error]", err);
    return;
  }
  Sentry.withScope(scope => {
    Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureException(err);
  });
};

// Set user context when logged in
export const setSentryUser = (user) => {
  if (!initialized || !Sentry || !user) return;
  Sentry.setUser({ id: user._id || user.id, email: user.email, role: user.role });
};

// Clear user on logout
export const clearSentryUser = () => {
  if (!initialized || !Sentry) return;
  Sentry.setUser(null);
};

export const isSentryInitialized = () => initialized;
