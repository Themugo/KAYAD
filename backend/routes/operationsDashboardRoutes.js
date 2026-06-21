// backend/routes/operationsDashboardRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Operations Dashboard routes
// Handles operations dashboard API endpoints
// ─────────────────────────────────────────────────────────────

import express from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  getSystemHealth,
  getPaymentFailures,
  getEscrowDisputes,
  getDealerOnboarding,
  getListingModeration,
  getQueueHealth,
  getNotifications,
  getFraudAlerts,
  getDashboardOverview,
} from "../controllers/operationsDashboardController.js";

const router = express.Router();

// =============================
// 📊 OPERATIONS DASHBOARD ROUTES
// =============================

// All routes require admin access
router.use(protect);
router.use(adminOnly);

// =============================
// 📊 DASHBOARD OVERVIEW
// =============================
router.get("/overview", asyncHandler(getDashboardOverview));

// =============================
// 💻 SYSTEM HEALTH
// =============================
router.get("/system-health", asyncHandler(getSystemHealth));

// =============================
// 💳 PAYMENT FAILURES
// =============================
router.get("/payment-failures", asyncHandler(getPaymentFailures));

// =============================
// 🛡️ ESCROW DISPUTES
// =============================
router.get("/escrow-disputes", asyncHandler(getEscrowDisputes));

// =============================
// 👥 DEALER ONBOARDING
// =============================
router.get("/dealer-onboarding", asyncHandler(getDealerOnboarding));

// =============================
// 📄 LISTING MODERATION
// =============================
router.get("/listing-moderation", asyncHandler(getListingModeration));

// =============================
// 📊 QUEUE HEALTH
// =============================
router.get("/queue-health", asyncHandler(getQueueHealth));

// =============================
// 🔔 NOTIFICATIONS
// =============================
router.get("/notifications", asyncHandler(getNotifications));

// =============================
// 🚨 FRAUD ALERTS
// =============================
router.get("/fraud-alerts", asyncHandler(getFraudAlerts));

export default router;
