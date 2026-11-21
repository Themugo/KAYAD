// backend/routes/dealerHealthScoreRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Health Score routes
// Public and admin routes for health score management
// ─────────────────────────────────────────────────────────────

import express from "express";
import {
  getDealerHealthScore,
  getDealerHealthScoreDetails,
  getDealerRanking,
  getTopDealersByCategory,
  getDealerScoreTrends,
  recalculateDealerScore,
  recalculateAllScoresAdmin,
  overrideDealerScore,
  getScoreDistribution,
  getScoreAlerts,
} from "../controllers/dealerHealthScoreController.js";
import { protect, adminOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { validateObjectId } from "../middleware/validate.js";

const router = express.Router();

// =============================
// 📊 PUBLIC ROUTES
// =============================

// Get dealer health score
router.get("/:dealerId", asyncHandler(getDealerHealthScore));

// Get dealer health score details
// Phase 15: the per-component breakdown (escrow, transaction and verification details) is a platform-internal record that was
// served to anonymous callers; no SPA screen consumes it. Staff only. The headline score, ranking and top lists stay public.
router.get("/:dealerId/details", protect, adminOnly, asyncHandler(getDealerHealthScoreDetails));

// Get dealer ranking
router.get("/ranking/list", asyncHandler(getDealerRanking));

// Get top dealers by category
router.get("/top/:category", asyncHandler(getTopDealersByCategory));

// Get dealer score trends
router.get("/:dealerId/trends", protect, adminOnly, asyncHandler(getDealerScoreTrends));

// =============================
// 🔐 ADMIN ROUTES
// =============================

// Recalculate specific dealer score
router.post("/admin/recalculate/:dealerId", protect, adminOnly, validateObjectId, asyncHandler(recalculateDealerScore));

// Recalculate all scores
router.post("/admin/recalculate-all", protect, adminOnly, asyncHandler(recalculateAllScoresAdmin));

// Override dealer score
router.put("/admin/override/:dealerId", protect, adminOnly, validateObjectId, asyncHandler(overrideDealerScore));

// Get score distribution
router.get("/admin/distribution", protect, adminOnly, asyncHandler(getScoreDistribution));

// Get score alerts
router.get("/admin/alerts", protect, adminOnly, asyncHandler(getScoreAlerts));

export default router;
