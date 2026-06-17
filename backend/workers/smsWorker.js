// backend/workers/smsWorker.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// SMS worker
// Processes SMS jobs from the queue
// ─────────────────────────────────────────────────────────────

import { getWorker } from "../config/queue.js";
import { logInfo, logError } from "../utils/logger.js";
import { sendToDeadLetterQueue } from "../infrastructure/queues/deadLetterQueue.js";

// =============================
// 📱 SMS PROCESSOR
// =============================

const processSMS = async (job) => {
  const startTime = Date.now();
  const { phone, message, context = {} } = job.data;

  try {
    // Import SMS utility dynamically
    const smsUtils = await import("../utils/sms.js");
    
    // Send SMS
    const success = await smsUtils.sendSMS(phone, message);
    
    if (success) {
      const processingTime = Date.now() - startTime;
      logInfo("SMS processed successfully", { phone, context, processingTime });
      return { success: true, phone, processingTime };
    } else {
      throw new Error("SMS sending failed");
    }
  } catch (err) {
    const processingTime = Date.now() - startTime;
    logError("Failed to process SMS", err, { phone, processingTime });
    
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

export const createSMSWorker = () => {
  const worker = getWorker("sms", processSMS, 3);

  worker.on("completed", (job) => {
    logInfo("SMS worker completed", { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logError("SMS worker failed", err, { jobId: job?.id });
  });

  return worker;
};

export default createSMSWorker;
