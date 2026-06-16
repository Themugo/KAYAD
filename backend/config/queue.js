// backend/config/queue.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// BullMQ queue configuration
// Defines queue options, connection settings, and default job options
// ─────────────────────────────────────────────────────────────

import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🔴 REDIS CONNECTION
// =============================
// Temporarily disable Redis for debugging
const DISABLE_REDIS = true;

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      logError("Redis connection failed after 3 retries");
      return null;
    }
    return Math.min(times * 100, 3000);
  },
};

// Create Redis connection
const connection = DISABLE_REDIS ? null : new IORedis(redisConfig);

if (connection) {
  connection.on("connect", () => {
    logInfo("Redis connected", { host: redisConfig.host, port: redisConfig.port });
  });

  connection.on("error", (err) => {
    logError("Redis connection error", err);
  });

  connection.on("close", () => {
    logWarn("Redis connection closed");
  });
} else {
  console.log("⚠️ Queue Redis disabled for debugging");
}

// =============================
// 📋 QUEUE OPTIONS
// =============================

// Default job options for all queues
const defaultJobOptions = {
  removeOnComplete: {
    count: 1000, // Keep last 1000 completed jobs
    age: 24 * 3600, // Keep for 24 hours
  },
  removeOnFail: {
    count: 5000, // Keep last 5000 failed jobs
    age: 7 * 24 * 3600, // Keep for 7 days
  },
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
};

// Queue-specific options
const queueOptions = {
  notification: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  },
  email: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
    },
  },
  sms: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    },
  },
  fraud: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 2,
      backoff: { type: "exponential", delay: 1000 },
    },
  },
  image: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
    },
  },
  seo: {
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  },
};

// =============================
// 🏭 QUEUE FACTORY
// =============================

const queues = {};

export const getQueue = (queueName) => {
  if (queues[queueName]) {
    return queues[queueName];
  }

  // Return null if Redis is disabled
  if (!connection) {
    console.log(`⚠️ Queue ${queueName} disabled (Redis disabled)`);
    return null;
  }

  const options = queueOptions[queueName] || queueOptions.notification;
  const queue = new Queue(queueName, {
    connection,
    defaultJobOptions: options.defaultJobOptions,
  });

  queue.on("error", (err) => {
    logError(`Queue error: ${queueName}`, err);
  });

  queue.on("waiting", (jobId) => {
    logInfo(`Job waiting: ${queueName}`, { jobId });
  });

  queue.on("active", (job) => {
    logInfo(`Job active: ${queueName}`, { jobId: job.id, name: job.name });
  });

  queue.on("completed", (job) => {
    logInfo(`Job completed: ${queueName}`, { jobId: job.id, name: job.name });
  });

  queue.on("failed", (job, err) => {
    logError(`Job failed: ${queueName}`, err, { jobId: job?.id, name: job?.name });
  });

  queues[queueName] = queue;
  return queue;
};

// =============================
// 👷 WORKER FACTORY
// =============================

const workers = {};

export const getWorker = (queueName, processor, concurrency = 5) => {
  if (workers[queueName]) {
    return workers[queueName];
  }

  const options = queueOptions[queueName] || queueOptions.notification;
  const worker = new Worker(queueName, processor, {
    connection,
    concurrency,
    defaultJobOptions: options.defaultJobOptions,
  });

  worker.on("error", (err) => {
    logError(`Worker error: ${queueName}`, err);
  });

  worker.on("completed", (job) => {
    logInfo(`Worker completed: ${queueName}`, { jobId: job.id, name: job.name });
  });

  worker.on("failed", (job, err) => {
    logError(`Worker failed: ${queueName}`, err, { jobId: job?.id, name: job?.name });
  });

  workers[queueName] = worker;
  return worker;
};

// =============================
// 🧹 CLEANUP
// =============================

export const closeQueues = async () => {
  await Promise.all(
    Object.values(queues).map((queue) => queue.close()),
  );
  logInfo("All queues closed");
};

export const closeWorkers = async () => {
  await Promise.all(
    Object.values(workers).map((worker) => worker.close()),
  );
  logInfo("All workers closed");
};

export const closeConnection = async () => {
  await connection.quit();
  logInfo("Redis connection closed");
};

// =============================
// 📊 QUEUE METRICS
// =============================

export const getQueueMetrics = async (queueName) => {
  const queue = getQueue(queueName);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
};

export default {
  getQueue,
  getWorker,
  closeQueues,
  closeWorkers,
  closeConnection,
  getQueueMetrics,
  connection,
};
