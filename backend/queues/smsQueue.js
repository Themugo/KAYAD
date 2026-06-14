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
      priority: options.priority || 7, // Higher priority for SMS
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      backoff: {
        type: "exponential",
        delay: 2000,
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
          priority: options.priority || 7,
          delay: options.delay || 0,
          attempts: options.attempts || 3,
          backoff: {
            type: "exponential",
            delay: 2000,
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
