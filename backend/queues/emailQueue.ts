// backend/queues/emailQueue.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Email queue producer
// Adds email jobs to the queue with appropriate options
// ─────────────────────────────────────────────────────────────

import { emailQueue } from "../infrastructure/queues/index.ts";
import { logInfo, logError } from "../utils/logger.ts";

// =============================
// 📧 ADD EMAIL JOB
// =============================

export const addEmailJob = async (data, options = {}) => {
  try {
    const job = await emailQueue.add("email", data, {
      priority: options.priority || 4, // Decreased from 5 to 4 (less time-sensitive)
      delay: options.delay || 0,
      attempts: options.attempts || 7, // Increased from 5 to 7
      backoff: {
        type: "exponential",
        delay: 5000,
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

    logInfo("Email job added", { jobId: job.id, to: data.to });
    return job;
  } catch (err) {
    logError("Failed to add email job", err, { data });
    throw err;
  }
};

// =============================
// 📧 ADD BULK EMAIL JOBS
// =============================

export const addBulkEmailJobs = async (jobs, options = {}) => {
  try {
    const addedJobs = await emailQueue.addBulk(
      jobs.map((data) => ({
        name: "email",
        data,
        opts: {
          priority: options.priority || 4,
          delay: options.delay || 0,
          attempts: options.attempts || 7,
          backoff: {
            type: "exponential",
            delay: 5000,
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

    logInfo("Bulk email jobs added", { count: addedJobs.length });
    return addedJobs;
  } catch (err) {
    logError("Failed to add bulk email jobs", err);
    throw err;
  }
};

// =============================
// 📧 ADD DELAYED EMAIL JOB
// =============================

export const addDelayedEmailJob = async (data, delayMs) => {
  return addEmailJob(data, { delay: delayMs });
};

export default {
  addEmailJob,
  addBulkEmailJobs,
  addDelayedEmailJob,
};
