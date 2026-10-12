// backend/routes/marketplaceHealthRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Marketplace Health routes
// Public and admin routes for marketplace health monitoring
// ─────────────────────────────────────────────────────────────

import express from "express";
import {
  getHealthSummary,
  getHealthTrendsHandler,
  getAlertsHandler,
  resolveAlert,
  getDetailedMetrics,
  regenerateHealth,
  getAllHealthRecords,
} from "../controllers/marketplaceHealthController.js";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

const router = express.Router();

// =============================
// 📊 HEALTH ROUTES (AA-S1: admin-only — expose fraud/dispute/financial metrics)
// =============================

// Get health summary
router.get("/summary", protect, adminOnly, asyncHandler(getHealthSummary));

// Get health trends
router.get("/trends", protect, adminOnly, asyncHandler(getHealthTrendsHandler));

// Get active alerts
router.get("/alerts", protect, adminOnly, asyncHandler(getAlertsHandler));

// =============================
// 🔐 ADMIN ROUTES
// =============================

// Resolve alert
router.post("/alerts/:alertId/resolve", protect, adminOnly, validateObjectId, asyncHandler(resolveAlert));

// Get detailed metrics
router.get("/metrics", protect, adminOnly, asyncHandler(getDetailedMetrics));

// Regenerate health snapshot
router.post("/regenerate", protect, adminOnly, asyncHandler(regenerateHealth));

// Get all health records
router.get("/admin/all", protect, adminOnly, asyncHandler(getAllHealthRecords));

export default router;
