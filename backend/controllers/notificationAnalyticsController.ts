// backend/controllers/notificationAnalyticsController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Notification Analytics controller
// Handles notification analytics API endpoints
// ─────────────────────────────────────────────────────────────

import {
  getDeliveryStats,
  getChannelStats,
  getFailureAnalysis,
  getEngagementMetrics,
  getRetryStats,
  getUserNotificationStats,
  getPlatformNotificationStats,
  generateDeliveryReport,
  getNotificationTrends,
} from "../services/notificationAnalyticsService.ts";
import {
  retryFailedNotification,
  bulkRetryFailedNotifications,
  getRetryQueue,
  processRetryQueue,
} from "../services/notificationRetryService.ts";
import { adminOnly } from "../middleware/auth.ts";
import { logInfo, logError } from "../utils/logger.ts";

// =============================
// 📊 GET DELIVERY STATS
// =============================

export const getDeliveryStatsHandler = async (req, res) => {
  try {
    const { period = 24 } = req.query;
    const stats = await getDeliveryStats(parseInt(period));

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get delivery stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get delivery stats",
    });
  }
};

// =============================
// 📊 GET CHANNEL STATS
// =============================

export const getChannelStatsHandler = async (req, res) => {
  try {
    const { period = 24 } = req.query;
    const stats = await getChannelStats(parseInt(period));

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get channel stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get channel stats",
    });
  }
};

// =============================
// 📊 GET FAILURE ANALYSIS
// =============================

export const getFailureAnalysisHandler = async (req, res) => {
  try {
    const { period = 24 } = req.query;
    const analysis = await getFailureAnalysis(parseInt(period));

    res.json({
      success: true,
      data: analysis,
    });
  } catch (err) {
    logError("Failed to get failure analysis", err);
    res.status(500).json({
      success: false,
      message: "Failed to get failure analysis",
    });
  }
};

// =============================
// 📊 GET ENGAGEMENT METRICS
// =============================

export const getEngagementMetricsHandler = async (req, res) => {
  try {
    const { period = 24 } = req.query;
    const metrics = await getEngagementMetrics(parseInt(period));

    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    logError("Failed to get engagement metrics", err);
    res.status(500).json({
      success: false,
      message: "Failed to get engagement metrics",
    });
  }
};

// =============================
// 📊 GET RETRY STATS
// =============================

export const getRetryStatsHandler = async (req, res) => {
  try {
    const { period = 24 } = req.query;
    const stats = await getRetryStats(parseInt(period));

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get retry stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get retry stats",
    });
  }
};

// =============================
// 📊 GET USER STATS
// =============================

export const getUserStatsHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 24 } = req.query;
    const stats = await getUserNotificationStats(userId, parseInt(period));

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get user stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get user stats",
    });
  }
};

// =============================
// 📊 GET PLATFORM STATS
// =============================

export const getPlatformStatsHandler = async (req, res) => {
  try {
    const { period = 24 } = req.query;
    const stats = await getPlatformNotificationStats(parseInt(period));

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get platform stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get platform stats",
    });
  }
};

// =============================
// 📋 GENERATE DELIVERY REPORT
// =============================

export const generateDeliveryReportHandler = async (req, res) => {
  try {
    const { period = 24 } = req.query;
    const report = await generateDeliveryReport(parseInt(period));

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    logError("Failed to generate delivery report", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate delivery report",
    });
  }
};

// =============================
// 📈 GET NOTIFICATION TRENDS
// =============================

export const getNotificationTrendsHandler = async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const trends = await getNotificationTrends(parseInt(period));

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    logError("Failed to get notification trends", err);
    res.status(500).json({
      success: false,
      message: "Failed to get notification trends",
    });
  }
};

// =============================
// 🔁 RETRY NOTIFICATION
// =============================

export const retryNotificationHandler = async (req, res) => {
  try {
    const { auditId } = req.params;
    const result = await retryFailedNotification(auditId);

    res.json({
      success: true,
      message: "Retry initiated",
      data: result,
    });
  } catch (err) {
    logError("Failed to retry notification", err);
    res.status(500).json({
      success: false,
      message: "Failed to retry notification",
    });
  }
};

// =============================
// 🔁 BULK RETRY NOTIFICATIONS
// =============================

export const bulkRetryNotificationsHandler = async (req, res) => {
  try {
    const { channel, period = 24 } = req.body;
    const result = await bulkRetryFailedNotifications(channel, parseInt(period));

    res.json({
      success: true,
      message: "Bulk retry initiated",
      data: result,
    });
  } catch (err) {
    logError("Failed to bulk retry notifications", err);
    res.status(500).json({
      success: false,
      message: "Failed to bulk retry notifications",
    });
  }
};

// =============================
// 📋 GET RETRY QUEUE
// =============================

export const getRetryQueueHandler = async (req, res) => {
  try {
    const { channel } = req.query;
    const queue = await getRetryQueue(channel);

    res.json({
      success: true,
      data: queue,
    });
  } catch (err) {
    logError("Failed to get retry queue", err);
    res.status(500).json({
      success: false,
      message: "Failed to get retry queue",
    });
  }
};

// =============================
// ⚙️ PROCESS RETRY QUEUE
// =============================

export const processRetryQueueHandler = async (req, res) => {
  try {
    const { channel } = req.query;
    const result = await processRetryQueue(channel);

    res.json({
      success: true,
      message: "Retry queue processed",
      data: result,
    });
  } catch (err) {
    logError("Failed to process retry queue", err);
    res.status(500).json({
      success: false,
      message: "Failed to process retry queue",
    });
  }
};

export default {
  getDeliveryStatsHandler,
  getChannelStatsHandler,
  getFailureAnalysisHandler,
  getEngagementMetricsHandler,
  getRetryStatsHandler,
  getUserStatsHandler,
  getPlatformStatsHandler,
  generateDeliveryReportHandler,
  getNotificationTrendsHandler,
  retryNotificationHandler,
  bulkRetryNotificationsHandler,
  getRetryQueueHandler,
  processRetryQueueHandler,
};
