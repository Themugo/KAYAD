// backend/workers/fraudWorker.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Fraud check worker
// Processes fraud check jobs from the queue
// ─────────────────────────────────────────────────────────────

import { getWorker } from "../config/queue.js";
import { runFraudDetection } from "../services/fraudDetectionService.js";
import { logInfo, logError } from "../utils/logger.js";
import { sendToDeadLetterQueue } from "../infrastructure/queues/deadLetterQueue.js";

// =============================
// 🔍 FRAUD CHECK PROCESSOR
// =============================

const processFraudCheck = async (job) => {
  const startTime = Date.now();
  const { type, userId, carId, paymentId, amount, metadata = {} } = job.data;

  try {
    let result;

    switch (type) {
      case "user_registration":
        result = await runFraudDetection("user", userId, metadata);
        break;
      case "car_listing":
        result = await runFraudDetection("car", carId, metadata);
        break;
      case "payment":
        result = await runFraudDetection("payment", paymentId, { amount, ...metadata });
        break;
      case "bid":
        result = await runFraudDetection("bid", carId, { userId, amount, ...metadata });
        break;
      default:
        throw new Error(`Unknown fraud check type: ${type}`);
    }

    const processingTime = Date.now() - startTime;
    logInfo("Fraud check processed successfully", { type, result, processingTime });
    return { result, processingTime };
  } catch (err) {
    const processingTime = Date.now() - startTime;
    logError("Failed to process fraud check", err, { type, processingTime });

    // Send to dead letter queue if max retries exceeded
    if (job.attemptsMade >= job.opts.attempts) {
      await sendToDeadLetterQueue(job, err);
    }

    throw err;
  }
};

// =============================
// 👷 CREATE WORKER
// =============================

export const createFraudWorker = () => {
  const worker = getWorker("fraud", processFraudCheck, 20);

  worker.on("completed", (job) => {
    logInfo("Fraud worker completed", { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logError("Fraud worker failed", err, { jobId: job?.id });
  });

  return worker;
};

export default createFraudWorker;
