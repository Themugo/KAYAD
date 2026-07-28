// backend/infrastructure/queues/index.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Queue registry and initialization
// Exports all queue producers and initializes queues on startup
// ─────────────────────────────────────────────────────────────

import { getQueue } from "../../config/queue.ts";
import { logInfo, logError } from "../../utils/logger.ts";

// =============================
// 📋 QUEUE REGISTRY
// =============================

export const notificationQueue = getQueue("notification");
export const emailQueue = getQueue("email");
export const smsQueue = getQueue("sms");
export const fraudQueue = getQueue("fraud");
export const imageQueue = getQueue("image");
export const seoQueue = getQueue("seo");

// =============================
// 🚀 INITIALIZE QUEUES
// =============================

export const initializeQueues = async () => {
  try {
    await Promise.all([
      notificationQueue.waitUntilReady(),
      emailQueue.waitUntilReady(),
      smsQueue.waitUntilReady(),
      fraudQueue.waitUntilReady(),
      imageQueue.waitUntilReady(),
      seoQueue.waitUntilReady(),
    ]);

    logInfo("All queues initialized successfully");
  } catch (err) {
    logError("Failed to initialize queues", err);
    throw err;
  }
};

// =============================
// 📊 QUEUE STATUS
// =============================

export const getQueueStatus = async () => {
  const queues = [
    { name: "notification", queue: notificationQueue },
    { name: "email", queue: emailQueue },
    { name: "sms", queue: smsQueue },
    { name: "fraud", queue: fraudQueue },
    { name: "image", queue: imageQueue },
    { name: "seo", queue: seoQueue },
  ];

  const status = {};

  for (const { name, queue } of queues) {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      status[name] = {
        waiting,
        active,
        completed,
        failed,
        delayed,
      };
    } catch (err) {
      logError(`Failed to get status for queue: ${name}`, err);
      status[name] = { error: err.message };
    }
  }

  return status;
};

export default {
  notificationQueue,
  emailQueue,
  smsQueue,
  fraudQueue,
  imageQueue,
  seoQueue,
  initializeQueues,
  getQueueStatus,
};
