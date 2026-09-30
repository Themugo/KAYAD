// backend/workers/emailWorker.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Email worker
// Processes email jobs from the queue
// ─────────────────────────────────────────────────────────────

import { getWorker } from "../config/queue.js";
import { logInfo, logError } from "../utils/logger.js";
import { sendToDeadLetterQueue } from "../infrastructure/queues/deadLetterQueue.js";

// =============================
// 📧 EMAIL PROCESSOR
// =============================

const redactEmail = (value) => {
  const address = String(value || "");
  const at = address.indexOf("@");
  if (at <= 2) return address ? "***" : "";
  return `${address.slice(0, 2)}***${address.slice(at)}`;
};

const processEmail = async (job) => {
  const startTime = Date.now();
  const { to, subject, html, text, from } = job.data;

  try {
    // Import email service dynamically
    const emailService = await import("../services/email.service.js");

    // Send email through the canonical Brevo adapter. A provider failure must
    // reject the queue job so BullMQ can retry and eventually dead-letter it.
    const result = await emailService.sendRawEmail({ to, subject, html, text, from });
    if (!result?.success) {
      throw new Error(result?.error || "Email provider rejected delivery");
    }

    const processingTime = Date.now() - startTime;
    logInfo("Email processed successfully", { to: redactEmail(to), subject, processingTime });
    return { success: true, to, subject, processingTime };
  } catch (err) {
    const processingTime = Date.now() - startTime;
    logError("Failed to process email", err, { to: redactEmail(to), subject, processingTime });

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
