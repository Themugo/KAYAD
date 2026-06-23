// backend/routes/searchAnalyticsRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Search Analytics routes
// Public, admin, and dealer routes for search analytics
// ─────────────────────────────────────────────────────────────

import express from "express";
import {
  getTrendingSearchesHandler,
  getNoResultSearchesHandler,
  getPopularFiltersHandler,
  getCountySearchStatsHandler,
  getPriceRangeStatsHandler,
  getBrandModelStatsHandler,
  getMissingInventoryReportHandler,
  getSearchDemandReportHandler,
  getSearchInsightsHandler,
  getSearchSummaryHandler,
  getDealerDemandInsightsHandler,
} from "../controllers/searchAnalyticsController.js";
import { protect, adminOnly, dealerOnly } from "../middleware/auth.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = express.Router();

// =============================
// 📊 PUBLIC ROUTES
// =============================

// Get trending searches
router.get("/trending", asyncHandler(getTrendingSearchesHandler));

// =============================
// 🔐 ADMIN ROUTES
// =============================

// Get no-result searches
router.get("/no-results", adminOnly, asyncHandler(getNoResultSearchesHandler));

// Get popular filters
router.get("/filters", adminOnly, asyncHandler(getPopularFiltersHandler));

// Get county search stats
router.get("/counties", adminOnly, asyncHandler(getCountySearchStatsHandler));

// Get price range stats
router.get("/price-ranges", adminOnly, asyncHandler(getPriceRangeStatsHandler));

// Get brand/model stats
router.get("/brands", adminOnly, asyncHandler(getBrandModelStatsHandler));

// Get missing inventory report
router.get("/missing-inventory", adminOnly, asyncHandler(getMissingInventoryReportHandler));

// Get search demand report
router.get("/demand-report", adminOnly, asyncHandler(getSearchDemandReportHandler));

// Get comprehensive insights
router.get("/insights", adminOnly, asyncHandler(getSearchInsightsHandler));

// Get search summary
router.get("/summary", adminOnly, asyncHandler(getSearchSummaryHandler));

// =============================
// 🏪 DEALER ROUTES
// =============================

// Get dealer demand insights
router.get("/dealer/demand", protect, dealerOnly, asyncHandler(getDealerDemandInsightsHandler));

export default router;
