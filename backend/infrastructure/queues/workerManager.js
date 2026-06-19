// backend/infrastructure/queues/workerManager.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Worker manager
// Manages all queue workers lifecycle
// ─────────────────────────────────────────────────────────────

import createNotificationWorker from "../../workers/notificationWorker.js";
import createEmailWorker from "../../workers/emailWorker.js";
import createSMSWorker from "../../workers/smsWorker.js";
import createFraudWorker from "../../workers/fraudWorker.js";
import createImageWorker from "../../workers/imageWorker.js";
import createSEOWorker from "../../workers/seoWorker.js";
import { logInfo, logError, logWarn } from "../../utils/logger.js";

// =============================
// 👷 WORKER REGISTRY
// =============================

const workers = {};

// =============================
// 🚀 START ALL WORKERS
// =============================

export const startAllWorkers = () => {
  try {
    workers.notification = createNotificationWorker();
    workers.email = createEmailWorker();
    workers.sms = createSMSWorker();
    workers.fraud = createFraudWorker();
    workers.image = createImageWorker();
    workers.seo = createSEOWorker();

    logInfo("All workers started successfully", {
      workers: Object.keys(workers),
    });
  } catch (err) {
    logError("Failed to start workers", err);
    throw err;
  }
};

// =============================
// ⏹ STOP ALL WORKERS
// =============================

export const stopAllWorkers = async () => {
  try {
    await Promise.all(Object.values(workers).map((worker) => worker.close()));

    logInfo("All workers stopped successfully");
  } catch (err) {
    logError("Failed to stop workers", err);
    throw err;
  }
};

// =============================
// 🔄 RESTART WORKER
// =============================

export const restartWorker = async (workerName) => {
  try {
    if (workers[workerName]) {
      await workers[workerName].close();
      delete workers[workerName];
    }

    switch (workerName) {
      case "notification":
        workers.notification = createNotificationWorker();
        break;
      case "email":
        workers.email = createEmailWorker();
        break;
      case "sms":
        workers.sms = createSMSWorker();
        break;
      case "fraud":
        workers.fraud = createFraudWorker();
        break;
      case "image":
        workers.image = createImageWorker();
        break;
      case "seo":
        workers.seo = createSEOWorker();
        break;
      default:
        throw new Error(`Unknown worker: ${workerName}`);
    }

    logInfo(`Worker restarted: ${workerName}`);
  } catch (err) {
    logError(`Failed to restart worker: ${workerName}`, err);
    throw err;
  }
};

// =============================
// 📊 GET WORKER STATUS
// =============================

export const getWorkerStatus = () => {
  return {
    workers: Object.keys(workers),
    status: Object.keys(workers).reduce((acc, name) => {
      acc[name] = workers[name] ? "running" : "stopped";
      return acc;
    }, {}),
  };
};

export default {
  startAllWorkers,
  stopAllWorkers,
  restartWorker,
  getWorkerStatus,
};
