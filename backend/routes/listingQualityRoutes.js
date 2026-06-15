// backend/routes/listingQualityRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Listing Quality routes
// Public, dealer, and admin routes for listing quality management
// ─────────────────────────────────────────────────────────────

import express from "express";
import {
  getListingQualityHandler,
  recalculateListingQualityHandler,
  getDealerQualityStatsHandler,
  getDealerQualityReportHandler,
  bulkRecalculateDealerQualityHandler,
  getPlatformQualityStatsHandler,
  getQualityTrendsHandler,
  getLowQualityListingsHandler,
  getQualityBenchmarksHandler,
} from "../controllers/listingQualityController.js";
import { protect, adminOnly, dealerOnly, optionalAuth } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();

// =============================
// 📊 PUBLIC ROUTES
// =============================

// Get listing quality score
router.get("/car/:carId", optionalAuth, asyncHandler(getListingQualityHandler));

// =============================
// 🏪 DEALER ROUTES
// =============================

// Get dealer quality stats
router.get("/dealer/:dealerId/stats", protect, dealerOnly, asyncHandler(getDealerQualityStatsHandler));

// Get dealer quality report
router.get("/dealer/:dealerId/report", protect, dealerOnly, asyncHandler(getDealerQualityReportHandler));

// Bulk recalculate dealer quality
router.post("/dealer/:dealerId/bulk-recalculate", protect, dealerOnly, asyncHandler(bulkRecalculateDealerQualityHandler));

// =============================
// 🔐 ADMIN ROUTES
// =============================

// Recalculate listing quality
router.post("/car/:carId/recalculate", adminOnly, asyncHandler(recalculateListingQualityHandler));

// Get platform quality stats
router.get("/platform/stats", adminOnly, asyncHandler(getPlatformQualityStatsHandler));

// Get quality trends
router.get("/platform/trends", adminOnly, asyncHandler(getQualityTrendsHandler));

// Get low quality listings
router.get("/platform/low-quality", adminOnly, asyncHandler(getLowQualityListingsHandler));

// Get quality benchmarks
router.get("/platform/benchmarks", adminOnly, asyncHandler(getQualityBenchmarksHandler));

export default router;
