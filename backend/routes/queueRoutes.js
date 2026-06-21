// backend/routes/queueRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Queue monitoring routes
// Admin-only endpoints for queue monitoring and management
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  getQueueMetricsHandler,
  getQueueStatisticsHandler,
  getQueueHealthHandler,
  getAggregatedMetricsHandler,
  getCircuitBreakerStatesHandler,
  getDLQStatisticsHandler,
  getDLQJobsHandler,
  retryDLQJobHandler,
  deleteDLQJobHandler,
  getJobFailuresHandler,
  getJobFailureDetailsHandler,
  resolveJobFailureHandler,
} from "../controllers/queueController.js";

const router = express.Router();

// =============================
// 📊 QUEUE METRICS ENDPOINTS
// =============================

// Get queue metrics for all queues
router.get("/metrics", protect, adminOnly, asyncHandler(getQueueMetricsHandler));

// Get queue statistics (failures, processing time, etc.)
router.get("/statistics", protect, adminOnly, asyncHandler(getQueueStatisticsHandler));

// Get queue health status
router.get("/health", protect, adminOnly, asyncHandler(getQueueHealthHandler));

// Get aggregated metrics across all queues
router.get("/aggregated", protect, adminOnly, asyncHandler(getAggregatedMetricsHandler));

// =============================
// 🔌 CIRCUIT BREAKER ENDPOINTS
// =============================

// Get circuit breaker states for all services
router.get("/circuit-breakers", protect, adminOnly, asyncHandler(getCircuitBreakerStatesHandler));

// =============================
// 💀 DEAD LETTER QUEUE ENDPOINTS
// =============================

// Get DLQ statistics
router.get("/dlq/statistics", protect, adminOnly, asyncHandler(getDLQStatisticsHandler));

// Get DLQ jobs
router.get("/dlq/jobs", protect, adminOnly, asyncHandler(getDLQJobsHandler));

// Retry a failed job from DLQ
router.post("/dlq/retry/:jobId", protect, adminOnly, asyncHandler(retryDLQJobHandler));

// Delete a failed job from DLQ
router.delete("/dlq/delete/:jobId", protect, adminOnly, asyncHandler(deleteDLQJobHandler));

// =============================
// 📊 JOB FAILURE ENDPOINTS
// =============================

// Get job failures
router.get("/failures", protect, adminOnly, asyncHandler(getJobFailuresHandler));

// Get job failure details
router.get("/failures/:failureId", protect, adminOnly, asyncHandler(getJobFailureDetailsHandler));

// Resolve a job failure
router.post("/failures/:failureId/resolve", protect, adminOnly, asyncHandler(resolveJobFailureHandler));

export default router;
