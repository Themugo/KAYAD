// backend/infrastructure/queues/deadLetterQueue.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dead Letter Queue infrastructure
// Handles failed jobs that have exceeded max retry attempts
// Provides job recovery and analysis capabilities
// ─────────────────────────────────────────────────────────────

import { Queue } from "bullmq";
import { logInfo, logError, logWarn } from "../../utils/logger.ts";
import JobFailure from "../../models/JobFailure.ts";

// =============================
// 📦 DEAD LETTER QUEUE CONFIGURATION
// =============================

let deadLetterQueue = null;

export const initDeadLetterQueue = async (connection) => {
  try {
    deadLetterQueue = new Queue("dead-letter-queue", {
      connection,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      },
    });

    logInfo("Dead letter queue initialized");

    // Set up event listeners
    deadLetterQueue.on("waiting", (job) => {
      logInfo("DLQ job waiting", { jobId: job.id, jobName: job.name });
    });

    deadLetterQueue.on("completed", (job) => {
      logInfo("DLQ job completed", { jobId: job.id, jobName: job.name });
    });

    deadLetterQueue.on("failed", (job, err) => {
      logError("DLQ job failed", err, { jobId: job?.id, jobName: job?.name });
    });

    return deadLetterQueue;
  } catch (error) {
    logError("Failed to initialize dead letter queue", error);
    throw error;
  }
};

export const getDeadLetterQueue = () => deadLetterQueue;

// =============================
// 💀 SEND TO DEAD LETTER QUEUE
// =============================

export const sendToDeadLetterQueue = async (job, error) => {
  try {
    if (!deadLetterQueue) {
      logError("Dead letter queue not initialized");
      return null;
    }

    // Create job failure record
    const jobFailure = await JobFailure.create({
      jobId: job.id,
      jobName: job.name,
      queueName: job.queueName,
      error: error.name || "UnknownError",
      errorMessage: error.message,
      errorStack: error.stack,
      errorType: classifyError(error),
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      retryCount: job.attemptsMade,
      failedAt: new Date(),
      processingTime: job.processedOn ? Date.now() - job.processedOn : 0,
      jobData: job.data,
      metadata: {
        failedReason: error.message,
        timestamp: new Date(),
      },
    });

    // Add to dead letter queue
    const dlqJob = await deadLetterQueue.add(
      `${job.queueName}:${job.name}`,
      {
        originalJobId: job.id,
        originalJobName: job.name,
        originalQueueName: job.queueName,
        jobData: job.data,
        error: error.message,
        errorStack: error.stack,
        attemptsMade: job.attemptsMade,
        failedAt: new Date(),
        jobFailureId: jobFailure._id,
      },
      {
        priority: 10, // High priority for failed jobs
        delay: 0,
      },
    );

    logInfo("Job sent to dead letter queue", {
      originalJobId: job.id,
      dlqJobId: dlqJob.id,
      jobFailureId: jobFailure._id,
    });

    return { dlqJob, jobFailure };
  } catch (err) {
    logError("Failed to send job to dead letter queue", err);
    throw err;
  }
};

// =============================
// 🔍 CLASSIFY ERROR TYPE
// =============================

const classifyError = (error) => {
  const message = error.message?.toLowerCase() || "";
  const name = error.name?.toLowerCase() || "";

  if (message.includes("timeout") || name.includes("timeout")) {
    return "timeout";
  }
  if (message.includes("network") || name.includes("network") || message.includes("econnrefused")) {
    return "network";
  }
  if (message.includes("validation") || name.includes("validation")) {
    return "validation";
  }
  if (message.includes("service") || name.includes("service")) {
    return "service";
  }
  return "unknown";
};

// =============================
// 🔄 RETRY FAILED JOB
// =============================

export const retryFailedJob = async (dlqJobId) => {
  try {
    if (!deadLetterQueue) {
      throw new Error("Dead letter queue not initialized");
    }

    const dlqJob = await deadLetterQueue.getJob(dlqJobId);
    if (!dlqJob) {
      throw new Error("DLQ job not found");
    }

    const { originalQueueName, originalJobName, jobData, jobFailureId } = dlqJob.data;

    // Update job failure record
    if (jobFailureId) {
      const jobFailure = await JobFailure.findById(jobFailureId);
      if (jobFailure) {
        await jobFailure.retryJob();
      }
    }

    // Remove from DLQ
    await dlqJob.remove();

    logInfo("Job retried from dead letter queue", {
      dlqJobId,
      originalQueueName,
      originalJobName,
    });

    return { success: true, originalQueueName, originalJobName, jobData };
  } catch (err) {
    logError("Failed to retry job from dead letter queue", err);
    throw err;
  }
};

// =============================
// 🗑️ DELETE FAILED JOB
// =============================

export const deleteFailedJob = async (dlqJobId, resolvedBy, notes) => {
  try {
    if (!deadLetterQueue) {
      throw new Error("Dead letter queue not initialized");
    }

    const dlqJob = await deadLetterQueue.getJob(dlqJobId);
    if (!dlqJob) {
      throw new Error("DLQ job not found");
    }

    const { jobFailureId } = dlqJob.data;

    // Update job failure record
    if (jobFailureId) {
      const jobFailure = await JobFailure.findById(jobFailureId);
      if (jobFailure) {
        await jobFailure.markAsResolved(resolvedBy, "deleted", notes);
      }
    }

    // Remove from DLQ
    await dlqJob.remove();

    logInfo("Job deleted from dead letter queue", {
      dlqJobId,
      resolvedBy,
    });

    return { success: true };
  } catch (err) {
    logError("Failed to delete job from dead letter queue", err);
    throw err;
  }
};

// =============================
// 📊 GET DLQ STATISTICS
// =============================

export const getDLQStatistics = async () => {
  try {
    if (!deadLetterQueue) {
      throw new Error("Dead letter queue not initialized");
    }

    const counts = await deadLetterQueue.getJobCounts();
    const jobs = await deadLetterQueue.getJobs(["waiting", "active", "completed", "failed"], 0, 100);

    // Group by original queue
    const byQueue = {};
    for (const job of jobs) {
      const queueName = job.data.originalQueueName || "unknown";
      if (!byQueue[queueName]) {
        byQueue[queueName] = 0;
      }
      byQueue[queueName]++;
    }

    return {
      total: counts.waiting + counts.active + counts.completed + counts.failed,
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      byQueue,
    };
  } catch (err) {
    logError("Failed to get DLQ statistics", err);
    throw err;
  }
};

// =============================
// 📋 GET DLQ JOBS
// =============================

export const getDLQJobs = async (options = {}) => {
  try {
    if (!deadLetterQueue) {
      throw new Error("Dead letter queue not initialized");
    }

    const { limit = 50, skip = 0, state = "waiting" } = options;

    const jobs = await deadLetterQueue.getJobs([state], skip, limit);
    const total = await deadLetterQueue.getJobCountByTypes([state]);

    return { jobs, total };
  } catch (err) {
    logError("Failed to get DLQ jobs", err);
    throw err;
  }
};

export default {
  initDeadLetterQueue,
  getDeadLetterQueue,
  sendToDeadLetterQueue,
  retryFailedJob,
  deleteFailedJob,
  getDLQStatistics,
  getDLQJobs,
};
