// backend/workers/smsWorker.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// SMS worker
// Processes SMS jobs from the queue
// ─────────────────────────────────────────────────────────────

import { getWorker } from "../config/queue.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📱 SMS PROCESSOR
// =============================

const processSMS = async (job) => {
  const { phone, message, context = {} } = job.data;

  try {
    // Import SMS utility dynamically
    const smsUtils = await import("../utils/sms.js");
    
    // Send SMS
    const success = await smsUtils.sendSMS(phone, message);
    
    if (success) {
      logInfo("SMS processed successfully", { phone, context });
      return { success: true, phone };
    } else {
      throw new Error("SMS sending failed");
    }
  } catch (err) {
    logError("Failed to process SMS", err, { phone });
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
