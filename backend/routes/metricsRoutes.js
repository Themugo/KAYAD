// backend/routes/metricsRoutes.js
// ─────────────────────────────────────────────────────────────
// Metrics Monitoring Routes
// Provides endpoints for monitoring scalability metrics
// ─────────────────────────────────────────────────────────────

import express from "express";
import mongoose from "mongoose";
import redis from "../config/redis.js";
import cacheService from "../services/cacheService.js";
import { getAllMetrics, getCounter, getGauge, getHistogram } from "../config/metrics.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";

const router = express.Router();

// Get all metrics
router.get("/", async (req, res) => {
  try {
    const metrics = getAllMetrics();

    // Add system metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
    };

    // Add database metrics
    const dbMetrics = {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };

    // Add cache metrics
    const cacheMetrics = cacheService.getStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      system: systemMetrics,
      database: dbMetrics,
      cache: cacheMetrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get HTTP metrics
router.get("/http", validateQuery(analyticsQuerySchema), async (req, res) => {
  try {
    const metrics = getAllMetrics();
    const httpMetrics = {};

    // Extract HTTP-related metrics
    Object.keys(metrics.counters).forEach((key) => {
      if (key.startsWith("http_requests_total")) {
        httpMetrics[key] = metrics.counters[key];
      }
    });

    Object.keys(metrics.histograms).forEach((key) => {
      if (key.startsWith("http_request_duration_ms")) {
        httpMetrics[key] = getHistogram(key.split(":")[0]);
      }
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      httpMetrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get database metrics
router.get("/database", async (req, res) => {
  try {
    const metrics = getAllMetrics();
    const dbMetrics = {};

    // Extract database-related metrics
    Object.keys(metrics.counters).forEach((key) => {
      if (key.startsWith("db_queries_total")) {
        dbMetrics[key] = metrics.counters[key];
      }
    });

    Object.keys(metrics.histograms).forEach((key) => {
      if (key.startsWith("db_query_duration_ms")) {
        dbMetrics[key] = getHistogram(key.split(":")[0]);
      }
    });

    // Add connection pool metrics
    const connectionPoolMetrics = {
      total: getGauge("connection_pool_total"),
      available: getGauge("connection_pool_available"),
      checkedOut: getGauge("connection_pool_checked_out"),
    };

    // Add replica set metrics
    const replicaSetMetrics = {
      status: getGauge("replica_set_status"),
      primaryAvailable: getGauge("replica_set_primary_available"),
      secondariesCount: getGauge("replica_set_secondaries_count"),
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: dbMetrics,
      connectionPool: connectionPoolMetrics,
      replicaSet: replicaSetMetrics,
      connectionInfo: {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get cache metrics
router.get("/cache", async (req, res) => {
  try {
    const metrics = getAllMetrics();
    const cacheMetrics = {};

    // Extract cache-related metrics
    Object.keys(metrics.counters).forEach((key) => {
      if (key.startsWith("cache_")) {
        cacheMetrics[key] = metrics.counters[key];
      }
    });

    // Add cache service stats
    const cacheStats = cacheService.getStats();

    // Calculate cache efficiency
    const totalRequests = (cacheStats.hits || 0) + (cacheStats.misses || 0);
    const hitRate = totalRequests > 0 ? ((cacheStats.hits / totalRequests) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      cacheMetrics,
      cacheStats,
      efficiency: {
        hitRate: `${hitRate}%`,
        totalRequests,
        hits: cacheStats.hits || 0,
        misses: cacheStats.misses || 0,
      },
      enabled: cacheService.isEnabled(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get replica set metrics
router.get("/replica-set", async (req, res) => {
  try {
    const metrics = getAllMetrics();
    const replicaSetMetrics = {};

    // Extract replica set metrics
    Object.keys(metrics.gauges).forEach((key) => {
      if (key.startsWith("replica_set_")) {
        replicaSetMetrics[key] = metrics.gauges[key];
      }
    });

    Object.keys(metrics.histograms).forEach((key) => {
      if (key.startsWith("replica_set_lag_ms")) {
        replicaSetMetrics[key] = getHistogram(key.split(":")[0]);
      }
    });

    // Get actual replica set status from MongoDB
    let replicaSetStatus = null;
    if (process.env.MONGO_REPLICA_SET_NAME) {
      try {
        const admin = mongoose.connection.db.admin();
        const status = await admin.command({ replSetGetStatus: 1 });
        replicaSetStatus = {
          name: status.set,
          primary: status.members.find((m) => m.stateStr === "PRIMARY")?.name,
          secondaries: status.members.filter((m) => m.stateStr === "SECONDARY").length,
          arbiters: status.members.filter((m) => m.stateStr === "ARBITER").length,
          members: status.members.map((m) => ({
            name: m.name,
            state: m.stateStr,
            health: m.health,
            optimeDate: m.optimeDate,
          })),
        };
      } catch (error) {
        replicaSetStatus = {
          error: error.message,
        };
      }
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      replicaSetMetrics,
      replicaSetStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get system metrics
router.get("/system", async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const systemMetrics = {
      uptime: process.uptime(),
      uptimeFormatted: formatUptime(process.uptime()),
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapUsedPercentage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: systemMetrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get error metrics
router.get("/errors", async (req, res) => {
  try {
    const metrics = getAllMetrics();
    const errorMetrics = {};

    // Extract error metrics
    Object.keys(metrics.counters).forEach((key) => {
      if (key.startsWith("errors_total")) {
        errorMetrics[key] = metrics.counters[key];
      }
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      errorMetrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Reset metrics (admin only - protected)
router.post("/reset", protect, adminOnly, async (req, res) => {
  try {
    const { resetMetrics } = await import("../config/metrics.js");
    resetMetrics();
    cacheService.resetStats();

    res.json({
      success: true,
      message: "Metrics reset successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

export default router;
