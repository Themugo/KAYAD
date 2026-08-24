// backend/services/notificationRetryService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Notification Retry service
// Handles retry logic for failed notifications
// ─────────────────────────────────────────────────────────────

import { addNotificationJob } from "../queues/notificationQueue.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findById, findAll, update, count } from "../db/index.js";

// The retry service runs against the real notification_audit schema:
// (id, notification_id, channel, status, error, sent_at). Recovery data
// for the re-queued job comes from the linked notifications row.
const FAILED_STATUS = "failed";
const RETRY_QUEUED_STATUS = "retry_queued";

const auditIsRetryable = (audit) => !!audit && audit.status === FAILED_STATUS;

// =============================
// 🔁 RETRY FAILED NOTIFICATION
// =============================

export const retryFailedNotification = async (auditId) => {
  try {
    const audit = await findById("notification_audits", auditId);
    if (!audit) {
      logWarn("Notification audit not found for retry", { auditId });
      return { success: false, message: "Audit not found" };
    }

    if (!auditIsRetryable(audit)) {
      logWarn("Notification is not eligible for retry", { auditId, status: audit.status });
      return { success: false, message: "Notification is not in a failed state" };
    }

    // db/index maps snake_case columns to camelCase (notification_id → notificationId)
    const notification = audit.notificationId ? await findById("notifications", audit.notificationId) : null;
    if (!notification) {
      logWarn("Linked notification not found — cannot retry", { auditId });
      return { success: false, message: "Linked notification not found" };
    }

    await update("notification_audits", audit.id, { status: RETRY_QUEUED_STATUS, error: null });

    await addNotificationJob({
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      channels: [audit.channel],
      metadata: { originalAuditId: audit.id, isRetry: true },
    });

    logInfo("Notification retry queued", { auditId });

    return {
      success: true,
      message: "Retry queued",
    };
  } catch (err) {
    logError("Failed to retry notification", err);
    throw err;
  }
};

// =============================
// 🔁 BULK RETRY FAILED NOTIFICATIONS
// =============================

const getFailedAudits = async (channel = null, periodHours = 24) => {
  const since = new Date(Date.now() - periodHours * 3600 * 1000);
  const filters = { status: FAILED_STATUS, sentAt: { $gte: since } };
  if (channel) filters.channel = channel;
  return findAll("notification_audits", { filters, orderBy: "sentAt", ascending: false, limit: 200 });
};

export const bulkRetryFailedNotifications = async (channel = null, period = 24) => {
  try {
    const failedNotifications = await getFailedAudits(channel, period);

    const results = [];
    for (const notification of failedNotifications) {
      try {
        const result = await retryFailedNotification(notification.id);
        results.push({
          auditId: notification.id,
          success: result.success,
          message: result.message,
        });
      } catch (err) {
        results.push({
          auditId: notification.id,
          success: false,
          error: err.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logInfo("Bulk notification retry completed", {
      total: failedNotifications.length,
      success: successCount,
    });

    return {
      total: failedNotifications.length,
      successCount,
      failureCount: failedNotifications.length - successCount,
      results,
    };
  } catch (err) {
    logError("Failed to bulk retry notifications", err);
    throw err;
  }
};

// =============================
// 📅 SCHEDULE RETRY
// =============================

export const scheduleRetry = async (auditId) => {
  try {
    const audit = await findById("notification_audits", auditId);
    if (!audit) {
      logWarn("Notification audit not found for scheduling", { auditId });
      return { success: false, message: "Audit not found" };
    }

    if (!auditIsRetryable(audit)) {
      return { success: false, message: "Notification is not in a failed state" };
    }

    // Queue the retry immediately; the notification queue applies its own
    // backoff between delivery attempts.
    const result = await retryFailedNotification(auditId);

    logInfo("Retry scheduled", { auditId, success: result.success });

    return result;
  } catch (err) {
    logError("Failed to schedule retry", err);
    throw err;
  }
};

// =============================
// ✅ SHOULD RETRY
// =============================

export const shouldRetry = async (auditId) => {
  try {
    const audit = await findById("notification_audits", auditId);
    return auditIsRetryable(audit);
  } catch (err) {
    logError("Failed to check if should retry", err);
    return false;
  }
};

// =============================
// 📋 GET RETRY QUEUE
// =============================

export const getRetryQueue = async (channel = null) => {
  try {
    const pendingRetry = await getFailedAudits(channel, 24 * 7);

    return pendingRetry.map((audit) => ({
      auditId: audit.id,
      channel: audit.channel,
      failureReason: audit.error,
      sentAt: audit.sentAt,
    }));
  } catch (err) {
    logError("Failed to get retry queue", err);
    throw err;
  }
};

// =============================
// ⚙️ PROCESS RETRY QUEUE
// =============================

export const processRetryQueue = async (channel = null) => {
  try {
    const pendingRetry = await getRetryQueue(channel);

    const results = [];
    for (const item of pendingRetry) {
      try {
        const result = await retryFailedNotification(item.auditId);
        results.push({
          auditId: item.auditId,
          success: result.success,
          message: result.message,
        });
      } catch (err) {
        results.push({
          auditId: item.auditId,
          success: false,
          error: err.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logInfo("Retry queue processed", {
      total: pendingRetry.length,
      success: successCount,
    });

    return {
      total: pendingRetry.length,
      successCount,
      failureCount: pendingRetry.length - successCount,
      results,
    };
  } catch (err) {
    logError("Failed to process retry queue", err);
    throw err;
  }
};

// =============================
// 📊 CALCULATE BACKOFF
// =============================

export const calculateBackoff = (retryCount) => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s
  return Math.pow(2, retryCount) * 1000;
};

// =============================
// 📊 GET RETRY STATISTICS
// =============================

export const getRetryStatistics = async (period = 24) => {
  try {
    const since = new Date(Date.now() - period * 3600 * 1000);
    const window = { sentAt: { $gte: since } };
    const [failed, retryQueued, sent] = await Promise.all([
      count("notification_audits", { ...window, status: FAILED_STATUS }),
      count("notification_audits", { ...window, status: RETRY_QUEUED_STATUS }),
      count("notification_audits", { ...window, status: "sent" }),
    ]);
    return { failed, retryQueued, sent, periodHours: period };
  } catch (err) {
    logError("Failed to get retry statistics", err);
    throw err;
  }
};

export default {
  retryFailedNotification,
  bulkRetryFailedNotifications,
  scheduleRetry,
  shouldRetry,
  getRetryQueue,
  processRetryQueue,
  calculateBackoff,
  getRetryStatistics,
};
