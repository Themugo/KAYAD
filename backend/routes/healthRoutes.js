// backend/routes/healthRoutes.js
// ─────────────────────────────────────────────────────────────
// Health Check Routes
// Provides comprehensive health monitoring for the platform
// ─────────────────────────────────────────────────────────────

import express from "express";
import mongoose from "mongoose";
import redis from "../config/redis.js";
import cacheService from "../services/cacheService.js";
import { checkReplicaSetHealth } from "../middleware/replicaSetHealth.js";

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
    // Database health
    if (mongoose.connection.readyState === 1) {
      health.checks.database = {
        status: "healthy",
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
      };

      // Replica set health if configured
      if (process.env.MONGO_REPLICA_SET_NAME) {
        try {
          const admin = mongoose.connection.db.admin();
          const status = await admin.command({ replSetGetStatus: 1 });
          health.checks.replicaSet = {
            status: "healthy",
            name: status.set,
            primary: status.members.find((m) => m.stateStr === "PRIMARY")?.name,
            secondaries: status.members.filter((m) => m.stateStr === "SECONDARY").length,
            members: status.members.length,
          };
        } catch (error) {
          health.checks.replicaSet = {
            status: "error",
            error: error.message,
          };
          health.status = "degraded";
        }
      }
    } else {
      health.checks.database = {
        status: "unhealthy",
        state: mongoose.connection.readyState,
      };
      health.status = "degraded";
    }
  } catch (error) {
    health.checks.database = {
      status: "error",
      error: error.message,
    };
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
router.get("/detailed", checkReplicaSetHealth, async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: {},
      redis: {},
      memory: {},
      cache: {},
      replicaSet: req.replicaSetHealth,
    },
  };

  try {
    // Database health
    if (mongoose.connection.readyState === 1) {
      health.checks.database = {
        status: "healthy",
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState,
      };
    } else {
      health.checks.database = {
        status: "unhealthy",
        state: mongoose.connection.readyState,
      };
      health.status = "degraded";
    }
  } catch (error) {
    health.checks.database = {
      status: "error",
      error: error.message,
    };
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

  // Check replica set health status
  if (req.replicaSetHealth && req.replicaSetHealth.status !== "healthy") {
    health.status = req.replicaSetHealth.status;
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  res.status(statusCode).json(health);
});

// Cache statistics endpoint
router.get("/cache", async (req, res) => {
  const stats = cacheService.getStats();
  res.json({
    success: true,
    stats,
    enabled: cacheService.isEnabled(),
  });
});

// Flush cache endpoint (admin only - to be protected)
router.post("/cache/flush", async (req, res) => {
  await cacheService.flushAll();
  cacheService.resetStats();
  res.json({
    success: true,
    message: "Cache flushed successfully",
  });
});

export default router;
