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
} from "../controllers/notificationAnalyticsController.js";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

const router = express.Router();

// =============================
// 🔐 ADMIN ROUTES
// =============================

// Get delivery statistics
router.get("/delivery-stats", protect, adminOnly, asyncHandler(getDeliveryStatsHandler));

// Get channel statistics
router.get("/channel-stats", protect, adminOnly, asyncHandler(getChannelStatsHandler));

// Get failure analysis
router.get("/failure-analysis", protect, adminOnly, asyncHandler(getFailureAnalysisHandler));

// Get engagement metrics
router.get("/engagement-metrics", protect, adminOnly, asyncHandler(getEngagementMetricsHandler));

// Get retry statistics
router.get("/retry-stats", protect, adminOnly, asyncHandler(getRetryStatsHandler));

// Get user notification stats
router.get("/user/:userId/stats", protect, adminOnly, asyncHandler(getUserStatsHandler));

// Get platform notification stats
router.get("/platform-stats", protect, adminOnly, asyncHandler(getPlatformStatsHandler));

// Generate delivery report
router.get("/delivery-report", protect, adminOnly, asyncHandler(generateDeliveryReportHandler));

// Get notification trends
router.get("/trends", protect, adminOnly, asyncHandler(getNotificationTrendsHandler));

// Retry specific notification
router.post("/retry/:auditId", protect, adminOnly, asyncHandler(retryNotificationHandler));

// Bulk retry notifications
router.post("/bulk-retry", protect, adminOnly, asyncHandler(bulkRetryNotificationsHandler));

// Get retry queue
router.get("/retry-queue", protect, adminOnly, asyncHandler(getRetryQueueHandler));

// Process retry queue
router.post("/process-retry-queue", protect, adminOnly, asyncHandler(processRetryQueueHandler));

export default router;
