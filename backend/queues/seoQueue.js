// backend/queues/seoQueue.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// SEO generation queue producer
// Adds SEO generation jobs to the queue with appropriate options
// ─────────────────────────────────────────────────────────────

import { seoQueue } from "../infrastructure/queues/index.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🔍 ADD SEO GENERATION JOB
// =============================

export const addSEOGenerationJob = async (data, options = {}) => {
  try {
    const job = await seoQueue.add("seo-generate", data, {
      priority: options.priority || 3, // Lower priority for SEO
      delay: options.delay || 0,
      attempts: options.attempts || 3,
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

    logInfo("SEO generation job added", { jobId: job.id, type: data.type });
    return job;
  } catch (err) {
    logError("Failed to add SEO generation job", err, { data });
    throw err;
  }
};

// =============================
// 🔍 ADD BULK SEO GENERATION JOBS
// =============================

export const addBulkSEOGenerationJobs = async (jobs, options = {}) => {
  try {
    const addedJobs = await seoQueue.addBulk(
      jobs.map((data) => ({
        name: "seo-generate",
        data,
        opts: {
          priority: options.priority || 3,
          delay: options.delay || 0,
          attempts: options.attempts || 3,
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

    logInfo("Bulk SEO generation jobs added", { count: addedJobs.length });
    return addedJobs;
  } catch (err) {
    logError("Failed to add bulk SEO generation jobs", err);
    throw err;
  }
};

// =============================
// 🔍 ADD DELAYED SEO GENERATION JOB
// =============================

export const addDelayedSEOGenerationJob = async (data, delayMs) => {
  return addSEOGenerationJob(data, { delay: delayMs });
};

export default {
  addSEOGenerationJob,
  addBulkSEOGenerationJobs,
  addDelayedSEOGenerationJob,
};
