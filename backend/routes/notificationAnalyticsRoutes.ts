// backend/routes/notificationAnalyticsRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Notification Analytics routes
// Admin routes for notification analytics and management
// ─────────────────────────────────────────────────────────────

import express from "express";
import {
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
} from "../controllers/notificationAnalyticsController.ts";
import { adminOnly } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";

const router = express.Router();

// =============================
// 🔐 ADMIN ROUTES
// =============================

// Get delivery statistics
router.get("/delivery-stats", adminOnly, asyncHandler(getDeliveryStatsHandler));

// Get channel statistics
router.get("/channel-stats", adminOnly, asyncHandler(getChannelStatsHandler));

// Get failure analysis
router.get("/failure-analysis", adminOnly, asyncHandler(getFailureAnalysisHandler));

// Get engagement metrics
router.get("/engagement-metrics", adminOnly, asyncHandler(getEngagementMetricsHandler));

// Get retry statistics
router.get("/retry-stats", adminOnly, asyncHandler(getRetryStatsHandler));

// Get user notification stats
router.get("/user/:userId/stats", adminOnly, asyncHandler(getUserStatsHandler));

// Get platform notification stats
router.get("/platform-stats", adminOnly, asyncHandler(getPlatformStatsHandler));

// Generate delivery report
router.get("/delivery-report", adminOnly, asyncHandler(generateDeliveryReportHandler));

// Get notification trends
router.get("/trends", adminOnly, asyncHandler(getNotificationTrendsHandler));

// Retry specific notification
router.post("/retry/:auditId", adminOnly, asyncHandler(retryNotificationHandler));

// Bulk retry notifications
router.post("/bulk-retry", adminOnly, asyncHandler(bulkRetryNotificationsHandler));

// Get retry queue
router.get("/retry-queue", adminOnly, asyncHandler(getRetryQueueHandler));

// Process retry queue
router.post("/process-retry-queue", adminOnly, asyncHandler(processRetryQueueHandler));

export default router;
