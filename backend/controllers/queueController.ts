// backend/controllers/queueController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Queue monitoring controller
// Provides API endpoints for queue monitoring and management
// ─────────────────────────────────────────────────────────────

import { protect, adminOnly } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";
import { logInfo, logError } from "../utils/logger.ts";
import {
  getQueueMetrics,
  getAllQueueStatistics,
  checkQueueHealth,
  getAggregatedMetrics,
} from "../services/queueMetricsService.ts";
import { getAllCircuitBreakerStates } from "../infrastructure/circuitBreaker.ts";
import {
  getDLQStatistics,
  getDLQJobs,
  retryFailedJob,
  deleteFailedJob,
} from "../infrastructure/queues/deadLetterQueue.ts";
import JobFailure from "../models/JobFailure.ts";
import { initQueues } from "../services/queueService.ts";

// =============================
// 📊 GET QUEUE METRICS
// =============================

export const getQueueMetricsHandler = asyncHandler(async (req, res) => {
  try {
    const queues = await initQueues();
    if (!queues) {
      return res.status(503).json({
        success: false,
        message: "Queue service not available",
      });
    }

    const metrics = await getQueueMetrics(Object.values(queues));

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    logError("Failed to get queue metrics", error);
    res.status(500).json({
      success: false,
      message: "Failed to get queue metrics",
    });
  }
});

// =============================
// 📊 GET QUEUE STATISTICS
// =============================

export const getQueueStatisticsHandler = asyncHandler(async (req, res) => {
  try {
    const { hours = 24 } = req.query;

    const statistics = await getAllQueueStatistics(parseInt(hours));

    res.json({
      success: true,
      statistics,
    });
  } catch (error) {
    logError("Failed to get queue statistics", error);
    res.status(500).json({
      success: false,
      message: "Failed to get queue statistics",
    });
  }
});

// =============================
// 📊 GET QUEUE HEALTH
// =============================

export const getQueueHealthHandler = asyncHandler(async (req, res) => {
  try {
    const queues = await initQueues();
    if (!queues) {
      return res.status(503).json({
        success: false,
        message: "Queue service not available",
      });
    }

    const healthChecks = [];
    for (const queue of Object.values(queues)) {
      const health = await checkQueueHealth(queue);
      healthChecks.push(health);
    }

    const overallHealth = healthChecks.every((h) => h.status === "healthy")
      ? "healthy"
      : healthChecks.some((h) => h.status === "critical")
        ? "critical"
        : "warning";

    res.json({
      success: true,
      overallHealth,
      healthChecks,
    });
  } catch (error) {
    logError("Failed to get queue health", error);
    res.status(500).json({
      success: false,
      message: "Failed to get queue health",
    });
  }
});

// =============================
// 📊 GET AGGREGATED METRICS
// =============================

export const getAggregatedMetricsHandler = asyncHandler(async (req, res) => {
  try {
    const queues = await initQueues();
    if (!queues) {
      return res.status(503).json({
        success: false,
        message: "Queue service not available",
      });
    }

    const metrics = await getAggregatedMetrics(Object.values(queues));

    res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    logError("Failed to get aggregated metrics", error);
    res.status(500).json({
      success: false,
      message: "Failed to get aggregated metrics",
    });
  }
});

// =============================
// 🔌 GET CIRCUIT BREAKER STATES
// =============================

export const getCircuitBreakerStatesHandler = asyncHandler(async (req, res) => {
  try {
    const states = getAllCircuitBreakerStates();

    res.json({
      success: true,
      circuitBreakers: states,
    });
  } catch (error) {
    logError("Failed to get circuit breaker states", error);
    res.status(500).json({
      success: false,
      message: "Failed to get circuit breaker states",
    });
  }
});

// =============================
// 💀 GET DLQ STATISTICS
// =============================

export const getDLQStatisticsHandler = asyncHandler(async (req, res) => {
  try {
    const statistics = await getDLQStatistics();

    res.json({
      success: true,
      statistics,
    });
  } catch (error) {
    logError("Failed to get DLQ statistics", error);
    res.status(500).json({
      success: false,
      message: "Failed to get DLQ statistics",
    });
  }
});

// =============================
// 💀 GET DLQ JOBS
// =============================

export const getDLQJobsHandler = asyncHandler(async (req, res) => {
  try {
    const { limit = 50, skip = 0, state = "waiting" } = req.query;

    const { jobs, total } = await getDLQJobs({
      limit: parseInt(limit),
      skip: parseInt(skip),
      state,
    });

    res.json({
      success: true,
      jobs,
      total,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + parseInt(limit) < total,
      },
    });
  } catch (error) {
    logError("Failed to get DLQ jobs", error);
    res.status(500).json({
      success: false,
      message: "Failed to get DLQ jobs",
    });
  }
});

// =============================
// 💀 RETRY DLQ JOB
// =============================

export const retryDLQJobHandler = asyncHandler(async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resolvedBy } = req.body;

    const result = await retryFailedJob(jobId);

    // Update job failure record
    if (result.jobFailureId) {
      const jobFailure = await JobFailure.findById(result.jobFailureId);
      if (jobFailure) {
        await jobFailure.markAsResolved(resolvedBy || req.user._id, "retried", "Job retried from DLQ");
      }
    }

    logInfo("DLQ job retried", { jobId, resolvedBy });

    res.json({
      success: true,
      message: "Job retried successfully",
      result,
    });
  } catch (error) {
    logError("Failed to retry DLQ job", error);
    res.status(500).json({
      success: false,
      message: "Failed to retry DLQ job",
    });
  }
});

// =============================
// 💀 DELETE DLQ JOB
// =============================

export const deleteDLQJobHandler = asyncHandler(async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resolvedBy, notes } = req.body;

    await deleteFailedJob(jobId, resolvedBy || req.user._id, notes);

    logInfo("DLQ job deleted", { jobId, resolvedBy });

    res.json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    logError("Failed to delete DLQ job", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete DLQ job",
    });
  }
});

// =============================
// 📊 GET JOB FAILURES
// =============================

export const getJobFailuresHandler = asyncHandler(async (req, res) => {
  try {
    const { queueName, limit = 100, skip = 0, resolved = false } = req.query;

    let result;
    if (queueName) {
      result = await JobFailure.getFailuresByQueue(queueName, {
        limit: parseInt(limit),
        skip: parseInt(skip),
        resolved: resolved === "true" ? true : resolved === "false" ? false : undefined,
      });
    } else {
      const failures = await JobFailure.find()
        .sort({ failedAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean();
      const total = await JobFailure.countDocuments();
      result = { failures, total };
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logError("Failed to get job failures", error);
    res.status(500).json({
      success: false,
      message: "Failed to get job failures",
    });
  }
});

// =============================
// 📊 GET JOB FAILURE DETAILS
// =============================

export const getJobFailureDetailsHandler = asyncHandler(async (req, res) => {
  try {
    const { failureId } = req.params;

    const failure = await JobFailure.findById(failureId).lean();

    if (!failure) {
      return res.status(404).json({
        success: false,
        message: "Job failure not found",
      });
    }

    res.json({
      success: true,
      failure,
    });
  } catch (error) {
    logError("Failed to get job failure details", error);
    res.status(500).json({
      success: false,
      message: "Failed to get job failure details",
    });
  }
});

// =============================
// 📊 RESOLVE JOB FAILURE
// =============================

export const resolveJobFailureHandler = asyncHandler(async (req, res) => {
  try {
    const { failureId } = req.params;
    const { resolution, notes } = req.body;

    const failure = await JobFailure.findById(failureId);

    if (!failure) {
      return res.status(404).json({
        success: false,
        message: "Job failure not found",
      });
    }

    await failure.markAsResolved(req.user._id, resolution, notes);

    logInfo("Job failure resolved", { failureId, resolution, resolvedBy: req.user._id });

    res.json({
      success: true,
      message: "Job failure resolved successfully",
      failure,
    });
  } catch (error) {
    logError("Failed to resolve job failure", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve job failure",
    });
  }
});

export default {
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
};
