// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { initPostHog } from "./utils/posthog";
import { initSentry } from "./utils/sentry";
import { initAnalytics } from "./lib/analytics";
import { logError, logInfo } from "./utils/logger";

try {
  initPostHog();
  logInfo("PostHog initialized");
} catch (err) {
  logError("PostHog init failed (non-fatal)", { error: String(err) });
}

try {
  initSentry();
  logInfo("Sentry initialized");
} catch (err) {
  logError("Sentry init failed (non-fatal)", { error: String(err) });
}

try {
  initAnalytics();
  logInfo("Analytics initialized");
} catch (err) {
  logError("Analytics init failed (non-fatal)", { error: String(err) });
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<div style="font-family:system-ui;padding:32px;text-align:center">' +
    '<h1 style="color:#D4C4A8">Kayad</h1>' +
    "<p>Application failed to start. Please refresh the page.</p>" +
    "</div>";
  throw new Error("Root element #root not found in DOM");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

window.addEventListener("error", (event) => {
  logError("Unhandled window error", { error: String(event.error), message: event.message });
});
window.addEventListener("unhandledrejection", (event) => {
  logError("Unhandled promise rejection", { reason: String(event.reason) });
});
