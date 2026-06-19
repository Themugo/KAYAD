// backend/queues/imageQueue.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Image processing queue producer
// Adds image processing jobs to the queue with appropriate options
// ─────────────────────────────────────────────────────────────

import { imageQueue } from "../infrastructure/queues/index.ts";
import { logInfo, logError } from "../utils/logger.ts";

// =============================
// 🖼️ ADD IMAGE PROCESSING JOB
// =============================

export const addImageProcessingJob = async (data, options = {}) => {
  try {
    const job = await imageQueue.add("image-process", data, {
      priority: options.priority || 6, // Increased from 5 to 6 (affects listing performance)
      delay: options.delay || 0,
      attempts: options.attempts || 5, // Increased from 3 to 5
      backoff: {
        type: "exponential",
        delay: 3000,
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

    logInfo("Image processing job added", { jobId: job.id, imageId: data.imageId });
    return job;
  } catch (err) {
    logError("Failed to add image processing job", err, { data });
    throw err;
  }
};

// =============================
// 🖼️ ADD BULK IMAGE PROCESSING JOBS
// =============================

export const addBulkImageProcessingJobs = async (jobs, options = {}) => {
  try {
    const addedJobs = await imageQueue.addBulk(
      jobs.map((data) => ({
        name: "image-process",
        data,
        opts: {
          priority: options.priority || 6,
          delay: options.delay || 0,
          attempts: options.attempts || 5,
          backoff: {
            type: "exponential",
            delay: 3000,
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

    logInfo("Bulk image processing jobs added", { count: addedJobs.length });
    return addedJobs;
  } catch (err) {
    logError("Failed to add bulk image processing jobs", err);
    throw err;
  }
};

// =============================
// 🖼️ ADD DELAYED IMAGE PROCESSING JOB
// =============================

export const addDelayedImageProcessingJob = async (data, delayMs) => {
  return addImageProcessingJob(data, { delay: delayMs });
};

export default {
  addImageProcessingJob,
  addBulkImageProcessingJobs,
  addDelayedImageProcessingJob,
};
