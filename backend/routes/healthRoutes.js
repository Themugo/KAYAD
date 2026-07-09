// backend/routes/healthRoutes.js
// ─────────────────────────────────────────────────────────────
// Health Check Routes
// Provides comprehensive health monitoring for the platform
// ─────────────────────────────────────────────────────────────

import express from "express";
import redis from "../config/redis.js";
import cacheService from "../services/cacheService.js";
// import { checkReplicaSetHealth } from "../middleware/replicaSetHealth.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";
import { getSupabase } from "../utils/supabase.js";

const router = express.Router();

// Main health check endpoint
router.get("/", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
  };

  try {
    const sb = getSupabase();
    const { error: dbError } = await sb.from("cars").select("id", { count: 'exact', head: true }).limit(1);
    if (!dbError) {
      health.checks.database = { status: "healthy" };
    } else {
      health.checks.database = { status: "unhealthy", error: dbError.message };
      health.status = "degraded";
    }
  } catch (error) {
    health.checks.database = { status: "error", error: error.message };
    health.status = "unhealthy";
  }

  try {
    // Redis health
    if (redis && redis.status === "ready") {
      await redis.ping();
      health.checks.redis = {
        status: "healthy",
        connected: true,
      };
    } else {
      health.checks.redis = {
        status: "unhealthy",
        connected: false,
      };
      health.status = "degraded";
    }
  } catch (error) {
    health.checks.redis = {
      status: "error",
      error: error.message,
    };
    health.status = "degraded";
  }

  // Memory health
  const memoryUsage = process.memoryUsage();
  health.checks.memory = {
    status: "healthy",
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
  };

  // Cache health
  const cacheStats = cacheService.getStats();
  health.checks.cache = {
    status: "healthy",
    enabled: cacheService.isEnabled(),
    stats: cacheStats,
  };

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  res.status(statusCode).json(health);
});

// Detailed health check with replica set info
router.get("/detailed", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: {},
      redis: {},
      memory: {},
      cache: {},
    },
  };

  try {
    const sb = getSupabase();
    const { error: dbError } = await sb.from("cars").select("id", { count: 'exact', head: true }).limit(1);
    if (!dbError) {
      health.checks.database = { status: "healthy" };
    } else {
      health.checks.database = { status: "unhealthy", error: dbError.message };
      health.status = "degraded";
    }
  } catch (error) {
    health.checks.database = { status: "error", error: error.message };
    health.status = "unhealthy";
  }

  try {
    // Redis health
    if (redis && redis.status === "ready") {
      await redis.ping();
      health.checks.redis = {
        status: "healthy",
        connected: true,
      };
    } else {
      health.checks.redis = {
        status: "unhealthy",
        connected: false,
      };
      health.status = "degraded";
    }
  } catch (error) {
    health.checks.redis = {
      status: "error",
      error: error.message,
    };
    health.status = "degraded";
  }

  // Memory health
  const memoryUsage = process.memoryUsage();
  health.checks.memory = {
    status: "healthy",
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
  };

  // Cache health
  const cacheStats = cacheService.getStats();
  health.checks.cache = {
    status: "healthy",
    enabled: cacheService.isEnabled(),
    stats: cacheStats,
  };


  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  res.status(statusCode).json(health);
});

// Cache statistics endpoint
router.get("/cache", validateQuery(analyticsQuerySchema), async (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    stats,
    enabled: cacheService.isEnabled(),
  });
});

// Flush cache endpoint (admin only - protected)
router.post("/cache/flush", protect, adminOnly, async (req, res) => {
  await cacheService.flushAll();
  cacheService.resetStats();
  res.json({
    success: true,
    message: "Cache flushed successfully",
  });
});

export default router;
