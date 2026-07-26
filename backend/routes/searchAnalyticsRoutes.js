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
import { validateQuery, analyticsQuerySchema } from "../middleware/validate.js";

const router = express.Router();

// =============================
// 📊 PUBLIC ROUTES
// =============================

// Get trending searches
router.get("/trending", validateQuery(analyticsQuerySchema), asyncHandler(getTrendingSearchesHandler));

// =============================
// 🔐 ADMIN ROUTES
// =============================

// Get no-result searches
router.get("/no-results", protect, adminOnly, asyncHandler(getNoResultSearchesHandler));

// Get popular filters
router.get("/filters", protect, adminOnly, asyncHandler(getPopularFiltersHandler));

// Get county search stats
router.get("/counties", protect, adminOnly, asyncHandler(getCountySearchStatsHandler));

// Get price range stats
router.get("/price-ranges", protect, adminOnly, asyncHandler(getPriceRangeStatsHandler));

// Get brand/model stats
router.get("/brands", protect, adminOnly, asyncHandler(getBrandModelStatsHandler));

// Get missing inventory report
router.get("/missing-inventory", protect, adminOnly, asyncHandler(getMissingInventoryReportHandler));

// Get search demand report
router.get("/demand-report", protect, adminOnly, asyncHandler(getSearchDemandReportHandler));

// Get comprehensive insights
router.get("/insights", protect, adminOnly, asyncHandler(getSearchInsightsHandler));

// Get search summary
router.get("/summary", protect, adminOnly, asyncHandler(getSearchSummaryHandler));

// =============================
// 🏪 DEALER ROUTES
// =============================

// Get dealer demand insights
router.get("/dealer/demand", protect, dealerOnly, asyncHandler(getDealerDemandInsightsHandler));

export default router;
