// backend/utils/healthCheck.js
// ─────────────────────────────────────────────────────────────
// Adds /health and /health/deep endpoints.
// UptimeRobot pings /health every 5 min — zero config needed.
// Kubernetes uses /health/ready and /health/live.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import { isRedisConnected } from "./cache.js";
import { isPostHogEnabled } from "./posthog.js";

const START_TIME = Date.now();

// ── SHALLOW CHECK — for load balancers (fast) ─────────────────
const shallowHealth = (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.json({
    status: dbReady ? "ok" : "degraded",
    service: "Kayad API",
    version: process.env.APP_VERSION || "1.0.0",
    checks: {
      mongodb: dbReady ? "ok" : "degraded",
    },
    uptime: Math.round((Date.now() - START_TIME) / 1000),
    env: process.env.NODE_ENV,
    ts: new Date().toISOString(),
  });
};

// ── DEEP CHECK — checks DB, Redis, etc. ───────────────────────
const deepHealth = async (req, res) => {
  const checks = {};

  // MongoDB
  try {
    const state = mongoose.connection.readyState;
    checks.mongodb = {
      status: state === 1 ? "ok" : "degraded",
      state: ["disconnected","connected","connecting","disconnecting"][state] || "unknown",
    };
  } catch {
    checks.mongodb = { status: "error" };
  }

  // Redis (optional)
  checks.redis = {
    status: isRedisConnected() ? "ok" : (process.env.REDIS_URL ? "error" : "disabled"),
  };

  // PostHog
  checks.posthog = {
    status: isPostHogEnabled() ? "ok" : (process.env.POSTHOG_API_KEY ? "error" : "disabled"),
  };

  // Memory
  const mem = process.memoryUsage();
  checks.memory = {
    status: mem.heapUsed / mem.heapTotal < 0.9 ? "ok" : "warn",
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
  };

  const allOk = Object.values(checks).every(c => ["ok","disabled"].includes(c.status));
  const statusCode = allOk ? 200 : 503;

  res.status(statusCode).json({
    status: allOk ? "ok" : "degraded",
    uptime: Math.round((Date.now() - START_TIME) / 1000),
    checks,
    ts: new Date().toISOString(),
  });
};

// ── REGISTER ROUTES ───────────────────────────────────────────
export const registerHealthRoutes = (app) => {
  // Primary health endpoint — UptimeRobot pings this
  app.get("/health", shallowHealth);
  app.get("/api/health", shallowHealth);

  // Deep health — internal monitoring
  app.get("/health/deep", deepHealth);
  app.get("/api/health/deep", deepHealth);

  // Kubernetes liveness probe
  app.get("/health/live", (_, res) => res.json({ status: "ok" }));
  app.get("/api/health/live", (_, res) => res.json({ status: "ok" }));

  // Kubernetes readiness probe
  app.get("/health/ready", async (_, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    if (!dbReady) return res.status(503).json({ status: "not ready", reason: "db" });
    res.json({ status: "ready" });
  });
  app.get("/api/health/ready", async (_, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    if (!dbReady) return res.status(503).json({ status: "not ready", reason: "db" });
    res.json({ status: "ready" });
  });

  console.log("🏥 Health checks: /health  /health/deep  /health/live  /health/ready");
};
