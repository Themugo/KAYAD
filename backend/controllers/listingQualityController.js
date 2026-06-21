// backend/controllers/listingQualityController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Listing Quality controller
// Handles listing quality API endpoints
// ─────────────────────────────────────────────────────────────

import {
  calculateListingQuality,
  recalculateListingQuality,
  getListingQuality,
  getDealerQualityStats,
  getPlatformQualityStats,
  getQualityTrends,
  getLowQualityListings,
  generateQualityReport,
  bulkRecalculateDealerQuality,
  getQualityBenchmarks,
} from "../services/listingQualityService.js";
import { protect, adminOnly, dealerOnly } from "../middleware/auth.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📊 GET LISTING QUALITY
// =============================

export const getListingQualityHandler = async (req, res) => {
  try {
    const { carId } = req.params;
    const quality = await getListingQuality(carId);

    res.json({
      success: true,
      data: quality,
    });
  } catch (err) {
    logError("Failed to get listing quality", err);
    res.status(500).json({
      success: false,
      message: "Failed to get listing quality",
    });
  }
};

// =============================
// 🔄 RECALCULATE LISTING QUALITY
// =============================

export const recalculateListingQualityHandler = async (req, res) => {
  try {
    const { carId } = req.params;
    const quality = await recalculateListingQuality(carId);

    res.json({
      success: true,
      message: "Quality score recalculated",
      data: quality,
    });
  } catch (err) {
    logError("Failed to recalculate listing quality", err);
    res.status(500).json({
      success: false,
      message: "Failed to recalculate listing quality",
    });
  }
};

// =============================
// 📊 GET DEALER QUALITY STATS
// =============================

export const getDealerQualityStatsHandler = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const stats = await getDealerQualityStats(dealerId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get dealer quality stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get dealer quality stats",
    });
  }
};

// =============================
// 📋 GET DEALER QUALITY REPORT
// =============================

export const getDealerQualityReportHandler = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const report = await generateQualityReport(dealerId);

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    logError("Failed to get dealer quality report", err);
    res.status(500).json({
      success: false,
      message: "Failed to get dealer quality report",
    });
  }
};

// =============================
// 🔄 BULK RECALCULATE DEALER QUALITY
// =============================

export const bulkRecalculateDealerQualityHandler = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const result = await bulkRecalculateDealerQuality(dealerId);

    res.json({
      success: true,
      message: "Bulk recalculation completed",
      data: result,
    });
  } catch (err) {
    logError("Failed to bulk recalculate dealer quality", err);
    res.status(500).json({
      success: false,
      message: "Failed to bulk recalculate dealer quality",
    });
  }
};

// =============================
// 📊 GET PLATFORM QUALITY STATS
// =============================

export const getPlatformQualityStatsHandler = async (req, res) => {
  try {
    const stats = await getPlatformQualityStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get platform quality stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get platform quality stats",
    });
  }
};

// =============================
// 📈 GET QUALITY TRENDS
// =============================

export const getQualityTrendsHandler = async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const trends = await getQualityTrends(parseInt(period));

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    logError("Failed to get quality trends", err);
    res.status(500).json({
      success: false,
      message: "Failed to get quality trends",
    });
  }
};

// =============================
// 🚨 GET LOW QUALITY LISTINGS
// =============================

export const getLowQualityListingsHandler = async (req, res) => {
  try {
    const { threshold = 50, limit = 20 } = req.query;
    const listings = await getLowQualityListings(parseInt(threshold), parseInt(limit));

    res.json({
      success: true,
      data: listings,
    });
  } catch (err) {
    logError("Failed to get low quality listings", err);
    res.status(500).json({
      success: false,
      message: "Failed to get low quality listings",
    });
  }
};

// =============================
// 📊 GET QUALITY BENCHMARKS
// =============================

export const getQualityBenchmarksHandler = async (req, res) => {
  try {
    const benchmarks = await getQualityBenchmarks();

    res.json({
      success: true,
      data: benchmarks,
    });
  } catch (err) {
    logError("Failed to get quality benchmarks", err);
    res.status(500).json({
      success: false,
      message: "Failed to get quality benchmarks",
    });
  }
};

export default {
  getListingQualityHandler,
  recalculateListingQualityHandler,
  getDealerQualityStatsHandler,
  getDealerQualityReportHandler,
  bulkRecalculateDealerQualityHandler,
  getPlatformQualityStatsHandler,
  getQualityTrendsHandler,
  getLowQualityListingsHandler,
  getQualityBenchmarksHandler,
};
