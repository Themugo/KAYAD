// backend/models/JobFailure.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Job Failure model for tracking failed queue jobs
// Provides audit trail for failed jobs and enables failure analysis
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const jobFailureSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 JOB IDENTIFICATION
    // =============================
    jobId: {
      type: String,
      required: true,
      index: true,
    },

    jobName: {
      type: String,
      required: true,
      index: true,
    },

    queueName: {
      type: String,
      required: true,
      index: true,
    },

    // =============================
    // 📊 FAILURE DETAILS
    // =============================
    error: {
      type: String,
      required: true,
    },

    errorMessage: {
      type: String,
      required: true,
    },

    errorStack: {
      type: String,
    },

    errorType: {
      type: String,
      enum: ["network", "timeout", "validation", "service", "unknown"],
      default: "unknown",
      index: true,
    },

    // =============================
    // 🔄 RETRY INFORMATION
    // =============================
    attemptsMade: {
      type: Number,
      required: true,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      required: true,
    },

    retryCount: {
      type: Number,
      default: 0,
    },

    // =============================
    // ⏱️ TIMING
    // =============================
    failedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    processingTime: {
      type: Number, // in milliseconds
      default: 0,
    },

    lastRetryAt: {
      type: Date,
    },

    nextRetryAt: {
      type: Date,
    },

    // =============================
    // 📦 JOB DATA
    // =============================
    jobData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // =============================
    // 🔧 RESOLUTION
    // =============================
    resolvedAt: {
      type: Date,
    },

    resolvedBy: {
      type: String, // User ID or system
    },

    resolution: {
      type: String,
      enum: ["retried", "fixed", "ignored", "deleted"],
    },

    resolutionNotes: {
      type: String,
    },

    // =============================
    // 🚨 ALERTING
    // =============================
    alertSent: {
      type: Boolean,
      default: false,
    },

    alertSentAt: {
      type: Date,
    },

    // =============================
    // 🧠 META
    // =============================
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
jobFailureSchema.index({ queueName: 1, failedAt: -1 });
jobFailureSchema.index({ jobName: 1, failedAt: -1 });
jobFailureSchema.index({ errorType: 1, failedAt: -1 });
jobFailureSchema.index({ resolvedAt: 1 });
jobFailureSchema.index({ alertSent: 1, failedAt: -1 });

// =============================
// ⚡ STATIC: GET FAILURES BY QUEUE
// =============================
jobFailureSchema.statics.getFailuresByQueue = async function (queueName, options = {}) {
  const { limit = 100, skip = 0, resolved = false } = options;

  const query = { queueName };
  if (resolved === false) {
    query.resolvedAt = { $exists: false };
  } else if (resolved === true) {
    query.resolvedAt = { $exists: true };
  }

  const failures = await this.find(query).sort({ failedAt: -1 }).limit(limit).skip(skip).lean();

  const total = await this.countDocuments(query);

  return { failures, total };
};

// =============================
// ⚡ STATIC: GET FAILURE STATISTICS
// =============================
jobFailureSchema.statics.getFailureStatistics = async function (timeRange = 24) {
  const since = new Date(Date.now() - timeRange * 60 * 60 * 1000);

  const stats = await this.aggregate([
    { $match: { failedAt: { $gte: since } } },
    {
      $group: {
        _id: "$queueName",
        totalFailures: { $sum: 1 },
        unresolvedFailures: {
          $sum: { $cond: [{ $eq: ["$resolvedAt", null] }, 1, 0] },
        },
        avgProcessingTime: { $avg: "$processingTime" },
        errorTypes: {
          $push: "$errorType",
        },
      },
    },
    {
      $project: {
        queueName: "$_id",
        totalFailures: 1,
        unresolvedFailures: 1,
        avgProcessingTime: { $round: ["$avgProcessingTime", 2] },
        errorTypes: 1,
        _id: 0,
      },
    },
  ]);

  return stats;
};

// =============================
// ⚡ STATIC: GET FAILURE RATE
// =============================
jobFailureSchema.statics.getFailureRate = async function (queueName, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const totalFailures = await this.countDocuments({
    queueName,
    failedAt: { $gte: since },
  });

  const unresolvedFailures = await this.countDocuments({
    queueName,
    failedAt: { $gte: since },
    resolvedAt: { $exists: false },
  });

  return {
    totalFailures,
    unresolvedFailures,
    resolvedFailures: totalFailures - unresolvedFailures,
    failureRate: totalFailures > 0 ? (unresolvedFailures / totalFailures) * 100 : 0,
  };
};

// =============================
// ⚡ METHOD: MARK AS RESOLVED
// =============================
jobFailureSchema.methods.markAsResolved = async function (resolvedBy, resolution, notes) {
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolution = resolution;
  this.resolutionNotes = notes;
  return this.save();
};

// =============================
// ⚡ METHOD: RETRY JOB
// =============================
jobFailureSchema.methods.retryJob = async function () {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  return this.save();
};

const JobFailure = mongoose.models.JobFailure || mongoose.model("JobFailure", jobFailureSchema);

export default JobFailure;
