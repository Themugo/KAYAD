// backend/workers/emailWorker.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Email worker
// Processes email jobs from the queue
// ─────────────────────────────────────────────────────────────

import { getWorker } from "../config/queue.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📧 EMAIL PROCESSOR
// =============================

const processEmail = async (job) => {
  const { to, subject, html, text, from } = job.data;

  try {
    // Import email service dynamically
    const emailService = await import("../services/email.service.js");
    
    // Send email
    await emailService.sendRawEmail({ to, subject, html, text, from });
    
    logInfo("Email processed successfully", { to, subject });
    return { success: true, to, subject };
  } catch (err) {
    logError("Failed to process email", err, { to, subject });
    throw err;
  }
};

// =============================
// 👷 CREATE WORKER
// =============================

export const createEmailWorker = () => {
  const worker = getWorker("email", processEmail, 5);

  worker.on("completed", (job) => {
    logInfo("Email worker completed", { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logError("Email worker failed", err, { jobId: job?.id });
  });

  return worker;
};

export default createEmailWorker;
