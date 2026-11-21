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
      health.checks.database = { status: "unhealthy", error: "Database check failed" };
      health.status = "degraded";
    }
  } catch (error) {
    health.checks.database = { status: "error", error: "Database check failed" };
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
      error: "Redis check failed",
    };
    health.status = "degraded";
  }

  // Required/optional external dependencies are reported separately so an
  // optional provider outage does not masquerade as total application failure.
  health.checks.brevo = {
    configured: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL),
    status: process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL ? "env_present" : "not_configured",
  };

  // Email delivery ledger schema must match the code, otherwise every
  // verification/reset email fails before reaching Brevo.
  try {
    const { checkCommunicationReadiness } = await import("../services/communicationReadiness.service.js");
    const readiness = await checkCommunicationReadiness();
    health.checks.communications = {
      schema: readiness.schema,
      missingColumns: readiness.missingColumns,
      providerConfig: readiness.providerConfig,
      providerAcceptance: readiness.providerAcceptance,
      mailboxDelivery: readiness.mailboxDelivery,
    };
    if (readiness.schema === "schema_mismatch") health.status = "degraded";
  } catch {
    health.checks.communications = { schema: "unknown" };
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

// Detailed health check with replica set info — admin only (leaks memory,
// cache stats and raw infrastructure error messages)
router.get("/detailed", protect, adminOnly, async (req, res) => {
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
      health.checks.database = { status: "unhealthy", error: "Database check failed" };
      health.status = "degraded";
    }
  } catch (error) {
    health.checks.database = { status: "error", error: "Database check failed" };
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
      error: "Redis check failed",
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

  // Provider credential presence is configuration evidence only, never proof
  // of provider connectivity or message delivery. Do not expose secret values.
  health.checks.providers = {
    brevo: { configured: Boolean(process.env.BREVO_API_KEY && (process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM)), status: process.env.BREVO_API_KEY && (process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM) ? "configured" : "not_configured" },
    africastalking: { configured: Boolean(process.env.AT_API_KEY && process.env.AT_USERNAME), status: process.env.AT_API_KEY && process.env.AT_USERNAME ? "configured" : "not_configured" },
    twilioWhatsApp: { configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER), status: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER ? "configured" : "not_configured" },
    mpesa: { configured: Boolean(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY), status: process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY ? "configured" : "not_configured", probe: "not_run_no_transaction" },
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

// Cache statistics endpoint — admin only
router.get("/cache", protect, adminOnly, validateQuery(analyticsQuerySchema), async (req, res) => {
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
