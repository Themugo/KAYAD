// backend/queues/notificationQueue.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Notification queue producer
// Adds notification jobs to the queue with appropriate options
// ─────────────────────────────────────────────────────────────

import { notificationQueue } from "../infrastructure/queues/index.ts";
import { logInfo, logError } from "../utils/logger.ts";

// =============================
// 📢 ADD NOTIFICATION JOB
// =============================

export const addNotificationJob = async (data, options = {}) => {
  try {
    const job = await notificationQueue.add("notification", data, {
      priority: options.priority || 7, // Increased from 5 to 7 (higher priority)
      delay: options.delay || 0,
      attempts: options.attempts || 5, // Increased from 3 to 5
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
        count: 500, // Keep last 500 failed jobs
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
          priority: options.priority || 7,
          delay: options.delay || 0,
          attempts: options.attempts || 5,
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
