// backend/queues/notificationQueue.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Notification queue producer
// Adds notification jobs to the queue with appropriate options
// ─────────────────────────────────────────────────────────────

import { notificationQueue } from "../infrastructure/queues/index.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📢 ADD NOTIFICATION JOB
// =============================

export const addNotificationJob = async (data, options = {}) => {
  try {
    const job = await notificationQueue.add("notification", data, {
      priority: options.priority || 5, // 1-10, 10 is highest
      delay: options.delay || 0,
      attempts: options.attempts || 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      ...options,
    });

    logInfo("Notification job added", { jobId: job.id, userId: data.userId });
    return job;
  } catch (err) {
    logError("Failed to add notification job", err, { data });
    throw err;
  }
};

// =============================
// 📢 ADD BULK NOTIFICATION JOBS
// =============================

export const addBulkNotificationJobs = async (jobs, options = {}) => {
  try {
    const addedJobs = await notificationQueue.addBulk(
      jobs.map((data) => ({
        name: "notification",
        data,
        opts: {
          priority: options.priority || 5,
          delay: options.delay || 0,
          attempts: options.attempts || 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          ...options,
        },
      })),
    );

    logInfo("Bulk notification jobs added", { count: addedJobs.length });
    return addedJobs;
  } catch (err) {
    logError("Failed to add bulk notification jobs", err);
    throw err;
  }
};

// =============================
// 📢 ADD DELAYED NOTIFICATION JOB
// =============================

export const addDelayedNotificationJob = async (data, delayMs) => {
  return addNotificationJob(data, { delay: delayMs });
};

export default {
  addNotificationJob,
  addBulkNotificationJobs,
  addDelayedNotificationJob,
};
