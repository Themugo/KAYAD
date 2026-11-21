// backend/infrastructure/queues/workerManager.js - Production Hardened v8.0
// ─────────────────────────────────────────────────────────────
// Worker manager
// Manages all queue workers lifecycle with isolated startup and diagnostics.
// ─────────────────────────────────────────────────────────────

import createNotificationWorker from "../../workers/notificationWorker.js";
import createEmailWorker from "../../workers/emailWorker.js";
import createSMSWorker from "../../workers/smsWorker.js";
import createFraudWorker from "../../workers/fraudWorker.js";
import createImageWorker from "../../workers/imageWorker.js";
import createSEOWorker from "../../workers/seoWorker.js";
import { logInfo, logError, logWarn } from "../../utils/logger.js";

const workers = {};
const workerFailures = {};

const workerFactories = {
  notification: createNotificationWorker,
  email: createEmailWorker,
  sms: createSMSWorker,
  fraud: createFraudWorker,
  image: createImageWorker,
  seo: createSEOWorker,
};

const startWorker = (name, factory) => {
  if (workers[name]) {
    return { name, status: "running", reused: true };
  }

  try {
    workers[name] = factory();
    delete workerFailures[name];
    logInfo(`Worker started: ${name}`);
    return { name, status: "running" };
  } catch (err) {
    delete workers[name];
    workerFailures[name] = {
      message: err?.message || String(err),
      name: err?.name || "Error",
    };
    logError(`Failed to start worker: ${name}`, err);
    logWarn(`Worker unavailable: ${name}`, {
      reason: err?.message || String(err),
      continueStartup: true,
    });
    return { name, status: "failed", error: err };
  }
};

// Start workers independently. One optional worker must never prevent the
// remaining queue workers from starting or hide which worker actually failed.
export const startAllWorkers = () => {
  const results = Object.entries(workerFactories).map(([name, factory]) => startWorker(name, factory));
  const started = results.filter((result) => result.status === "running").map((result) => result.name);
  const failed = results.filter((result) => result.status === "failed").map((result) => result.name);

  if (failed.length === 0) {
    logInfo("All workers started successfully", { workers: started });
  } else {
    logWarn("Worker startup completed with failures", {
      started,
      failed,
      continueStartup: true,
    });
  }

  return { started, failed, status: failed.length ? "degraded" : "healthy" };
};

export const stopAllWorkers = async () => {
  try {
    await Promise.all(Object.values(workers).map((worker) => worker.close()));
    for (const name of Object.keys(workers)) delete workers[name];
    logInfo("All workers stopped successfully");
  } catch (err) {
    logError("Failed to stop workers", err);
    throw err;
  }
};

export const restartWorker = async (workerName) => {
  if (!workerFactories[workerName]) {
    throw new Error(`Unknown worker: ${workerName}`);
  }

  try {
    if (workers[workerName]) {
      await workers[workerName].close();
      delete workers[workerName];
    }

    const result = startWorker(workerName, workerFactories[workerName]);
    if (result.status === "failed") throw result.error;

    logInfo(`Worker restarted: ${workerName}`);
    return result;
  } catch (err) {
    logError(`Failed to restart worker: ${workerName}`, err);
    throw err;
  }
};

export const getWorkerStatus = () => ({
  workers: Object.keys(workerFactories),
  status: Object.keys(workerFactories).reduce((acc, name) => {
    acc[name] = workers[name] ? "running" : workerFailures[name] ? "failed" : "stopped";
    return acc;
  }, {}),
  failures: { ...workerFailures },
});

export default {
  startAllWorkers,
  stopAllWorkers,
  restartWorker,
  getWorkerStatus,
};
