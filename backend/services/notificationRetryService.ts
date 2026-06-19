// backend/services/notificationRetryService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Notification Retry service
// Handles retry logic for failed notifications
// ─────────────────────────────────────────────────────────────

import NotificationAudit from "../models/NotificationAudit.ts";
import { addNotificationJob } from "../queues/notificationQueue.ts";
import { logInfo, logError, logWarn } from "../utils/logger.ts";

// =============================
// 🔁 RETRY FAILED NOTIFICATION
// =============================

export const retryFailedNotification = async (auditId) => {
  try {
    const audit = await NotificationAudit.findById(auditId);
    if (!audit) {
      logWarn("Notification audit not found for retry", { auditId });
      return { success: false, message: "Audit not found" };
    }

    if (!audit.shouldRetry()) {
      logWarn("Notification should not be retried", {
        auditId,
        retryCount: audit.retryCount,
        maxRetries: audit.maxRetries,
      });
      return { success: false, message: "Max retries reached or not eligible for retry" };
    }

    // Increment retry count
    await audit.incrementRetry();

    // Schedule next retry
    await audit.scheduleRetry();

    // Re-add to notification queue
    await addNotificationJob({
      userId: audit.userId,
      title: audit.title,
      message: audit.message,
      type: audit.type,
      channels: [audit.channel],
      metadata: {
        originalAuditId: audit._id,
        isRetry: true,
        retryCount: audit.retryCount,
      },
    });

    logInfo("Notification retry scheduled", { auditId, retryCount: audit.retryCount });

    return {
      success: true,
      message: "Retry scheduled",
      retryCount: audit.retryCount,
      nextRetryAt: audit.nextRetryAt,
    };
  } catch (err) {
    logError("Failed to retry notification", err);
    throw err;
  }
};

// =============================
// 🔁 BULK RETRY FAILED NOTIFICATIONS
// =============================

export const bulkRetryFailedNotifications = async (channel = null, period = 24) => {
  try {
    const failedNotifications = await NotificationAudit.getFailed(channel, period);

    const results = [];
    for (const notification of failedNotifications) {
      try {
        const result = await retryFailedNotification(notification._id);
        results.push({
          auditId: notification._id,
          success: result.success,
          message: result.message,
        });
      } catch (err) {
        results.push({
          auditId: notification._id,
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
    const audit = await NotificationAudit.findById(auditId);
    if (!audit) {
      logWarn("Notification audit not found for scheduling", { auditId });
      return { success: false, message: "Audit not found" };
    }

    const scheduled = await audit.scheduleRetry();
    if (!scheduled) {
      return { success: false, message: "Max retries reached" };
    }

    logInfo("Retry scheduled", { auditId, nextRetryAt: audit.nextRetryAt });

    return {
      success: true,
      nextRetryAt: audit.nextRetryAt,
      retryCount: audit.retryCount,
    };
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
    const audit = await NotificationAudit.findById(auditId);
    if (!audit) return false;

    return audit.shouldRetry();
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
    const pendingRetry = await NotificationAudit.getPendingRetry(channel);

    return pendingRetry.map((audit) => ({
      auditId: audit._id,
      channel: audit.channel,
      retryCount: audit.retryCount,
      maxRetries: audit.maxRetries,
      nextRetryAt: audit.nextRetryAt,
      failureReason: audit.failureReason,
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
    const stats = await NotificationAudit.getRetryStats(period);
    return stats;
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
