// backend/queues/fraudQueue.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Fraud check queue producer
// Adds fraud check jobs to the queue with appropriate options
// ─────────────────────────────────────────────────────────────

import { fraudQueue } from "../infrastructure/queues/index.ts";
import { logInfo, logError } from "../utils/logger.ts";

// =============================
// 🔍 ADD FRAUD CHECK JOB
// =============================

export const addFraudCheckJob = async (data, options = {}) => {
  try {
    const job = await fraudQueue.add("fraud-check", data, {
      priority: options.priority || 10, // Highest priority for fraud checks
      delay: options.delay || 0,
      attempts: options.attempts || 3, // Increased from 2 to 3
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
        count: 500,
      },
      ...options,
    });

    logInfo("Fraud check job added", { jobId: job.id, type: data.type });
    return job;
  } catch (err) {
    logError("Failed to add fraud check job", err, { data });
    throw err;
  }
};

// =============================
// 🔍 ADD BULK FRAUD CHECK JOBS
// =============================

export const addBulkFraudCheckJobs = async (jobs, options = {}) => {
  try {
    const addedJobs = await fraudQueue.addBulk(
      jobs.map((data) => ({
        name: "fraud-check",
        data,
        opts: {
          priority: options.priority || 10,
          delay: options.delay || 0,
          attempts: options.attempts || 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: {
            age: 3600,
            count: 1000,
          },
          removeOnFail: {
            age: 86400,
            count: 500,
          },
          ...options,
        },
      })),
    );

    logInfo("Bulk fraud check jobs added", { count: addedJobs.length });
    return addedJobs;
  } catch (err) {
    logError("Failed to add bulk fraud check jobs", err);
    throw err;
  }
};

// =============================
// 🔍 ADD DELAYED FRAUD CHECK JOB
// =============================

export const addDelayedFraudCheckJob = async (data, delayMs) => {
  return addFraudCheckJob(data, { delay: delayMs });
};

export default {
  addFraudCheckJob,
  addBulkFraudCheckJobs,
  addDelayedFraudCheckJob,
};
