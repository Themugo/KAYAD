// backend/utils/healthCheck.js
// ─────────────────────────────────────────────────────────────
// Adds /health and /health/deep endpoints.
// UptimeRobot pings /health every 5 min — zero config needed.
// Kubernetes uses /health/ready and /health/live.
// ─────────────────────────────────────────────────────────────

import { isRedisConnected } from "./cache.js";
import { isPostHogEnabled } from "./posthog.js";
import { getQueueMetrics, connection as queueConnection } from "../config/queue.js";
import { isSupabaseConnected } from "./supabase.js";

const START_TIME = Date.now();

// ── SHALLOW CHECK — for load balancers (fast) ─────────────────
const shallowHealth = (req, res) => {
  const dbReady = isSupabaseConnected();
  res.json({
    status: dbReady ? "ok" : "degraded",
    service: "Kayad API",
    version: process.env.APP_VERSION || "1.0.0",
    checks: {
      database: dbReady ? "ok" : "degraded",
    },
    uptime: Math.round((Date.now() - START_TIME) / 1000),
    env: process.env.NODE_ENV,
    ts: new Date().toISOString(),
  });
};

// ── DEEP CHECK — checks DB, Redis, etc. ───────────────────────
const deepHealth = async (req, res) => {
  const checks = {};

  // Database
  try {
    checks.database = {
      status: isSupabaseConnected() ? "ok" : "degraded",
    };
  } catch {
    checks.database = { status: "error" };
  }

  // Redis (optional)
  checks.redis = {
    status: isRedisConnected() ? "ok" : process.env.REDIS_URL ? "error" : "disabled",
  };

  // PostHog
  checks.posthog = {
    status: isPostHogEnabled() ? "ok" : process.env.POSTHOG_API_KEY ? "error" : "disabled",
  };

  // Memory
  const mem = process.memoryUsage();
  checks.memory = {
    status: mem.heapUsed / mem.heapTotal < 0.9 ? "ok" : "warn",
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
  };

  // Queue System (BullMQ)
  try {
    const queueStatus = queueConnection.status === "ready" ? "ok" : "degraded";
    const queueNames = ["notification", "email", "sms", "fraud", "image", "seo"];
    const queueDetails = {};

    for (const name of queueNames) {
      try {
        const metrics = await getQueueMetrics(name);
        const totalJobs = metrics.waiting + metrics.active + metrics.delayed;
        const queueHealth = totalJobs > 1000 ? "warn" : "ok";

        queueDetails[name] = {
          status: queueHealth,
          waiting: metrics.waiting,
          active: metrics.active,
          completed: metrics.completed,
          failed: metrics.failed,
          delayed: metrics.delayed,
          total: totalJobs,
        };
      } catch (err) {
        queueDetails[name] = {
          status: "error",
          error: err.message,
        };
      }
    }

    checks.queue = {
      status: queueStatus,
      connection: queueConnection.status,
      queues: queueDetails,
    };
  } catch (err) {
    checks.queue = {
      status: "error",
      error: err.message,
    };
  }

  const allOk = Object.values(checks).every((c) => ["ok", "disabled"].includes(c.status));
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
    const dbReady = isSupabaseConnected();
    if (!dbReady) return res.status(503).json({ status: "not ready", reason: "db" });
    res.json({ status: "ready" });
  });
  app.get("/api/health/ready", async (_, res) => {
    const dbReady = isSupabaseConnected();
    if (!dbReady) return res.status(503).json({ status: "not ready", reason: "db" });
    res.json({ status: "ready" });
  });

  console.log("🏥 Health checks: /health  /health/deep  /health/live  /health/ready");
};
