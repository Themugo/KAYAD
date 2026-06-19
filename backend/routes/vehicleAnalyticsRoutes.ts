// backend/routes/vehicleAnalyticsRoutes.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Vehicle Analytics routes
// Public and admin routes for market analytics
// ─────────────────────────────────────────────────────────────

import express from "express";
import {
  getMarketSummary,
  getPriceTrends,
  getVolumeTrends,
  getCountyTrendsHandler,
  getBrandTrendsHandler,
  getModelTrendsHandler,
  getSpecTrendsHandler,
  getMostViewedHandler,
  getMostSearchedHandler,
  getFastestSellingHandler,
  getDealerAnalytics,
  regenerateAnalytics,
  getAllAnalytics,
} from "../controllers/vehicleAnalyticsController.ts";
import { protect, adminOnly } from "../middleware/auth.ts";
import asyncHandler from "../middleware/asyncHandler.ts";

const router = express.Router();

// =============================
// 📊 PUBLIC ROUTES
// =============================

// Get market summary
router.get("/market/summary", asyncHandler(getMarketSummary));

// Get price trends
router.get("/market/price-trends", asyncHandler(getPriceTrends));

// Get volume trends
router.get("/market/volume-trends", asyncHandler(getVolumeTrends));

// Get county trends
router.get("/market/county-trends", asyncHandler(getCountyTrendsHandler));

// Get brand trends
router.get("/market/brand-trends", asyncHandler(getBrandTrendsHandler));

// Get model trends
router.get("/market/model-trends", asyncHandler(getModelTrendsHandler));

// Get spec trends
router.get("/market/spec-trends", asyncHandler(getSpecTrendsHandler));

// Get most viewed vehicles
router.get("/market/most-viewed", asyncHandler(getMostViewedHandler));

// Get most searched vehicles
router.get("/market/most-searched", asyncHandler(getMostSearchedHandler));

// Get fastest selling vehicles
router.get("/market/fastest-selling", asyncHandler(getFastestSellingHandler));

// =============================
// 🏪 DEALER ROUTES
// =============================

// Get dealer-specific analytics
router.get("/market/dealer/:dealerId", protect, asyncHandler(getDealerAnalytics));

// =============================
// 🔐 ADMIN ROUTES
// =============================

// Regenerate analytics
router.post("/market/regenerate", adminOnly, asyncHandler(regenerateAnalytics));

// Get all analytics records
router.get("/market/admin/all", adminOnly, asyncHandler(getAllAnalytics));

export default router;
