// backend/queues/smsQueue.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// SMS queue producer
// Adds SMS jobs to the queue with appropriate options
// ─────────────────────────────────────────────────────────────

import { smsQueue } from "../infrastructure/queues/index.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📱 ADD SMS JOB
// =============================

export const addSMSJob = async (data, options = {}) => {
  try {
    const job = await smsQueue.add("sms", data, {
      priority: options.priority || 9, // Increased from 7 to 9 (time-sensitive bidding)
      delay: options.delay || 0,
      attempts: options.attempts || 5, // Increased from 3 to 5
      backoff: {
        type: "exponential",
        delay: 2000,
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

    logInfo("SMS job added", { jobId: job.id, phone: data.phone });
    return job;
  } catch (err) {
    logError("Failed to add SMS job", err, { data });
    throw err;
  }
};

// =============================
// 📱 ADD BULK SMS JOBS
// =============================

export const addBulkSMSJobs = async (jobs, options = {}) => {
  try {
    const addedJobs = await smsQueue.addBulk(
      jobs.map((data) => ({
        name: "sms",
        data,
        opts: {
          priority: options.priority || 9,
          delay: options.delay || 0,
          attempts: options.attempts || 5,
          backoff: {
            type: "exponential",
            delay: 2000,
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

    logInfo("Bulk SMS jobs added", { count: addedJobs.length });
    return addedJobs;
  } catch (err) {
    logError("Failed to add bulk SMS jobs", err);
    throw err;
  }
};

// =============================
// 📱 ADD DELAYED SMS JOB
// =============================

export const addDelayedSMSJob = async (data, delayMs) => {
  return addSMSJob(data, { delay: delayMs });
};

export default {
  addSMSJob,
  addBulkSMSJobs,
  addDelayedSMSJob,
};
