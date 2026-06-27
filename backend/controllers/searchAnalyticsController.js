// backend/controllers/searchAnalyticsController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Search Analytics controller
// Handles search analytics API endpoints
// ─────────────────────────────────────────────────────────────

import {
  getTrendingSearches,
  getNoResultSearches,
  getPopularFilters,
  getCountySearchStats,
  getPriceRangeSearchStats,
  getBrandModelSearchStats,
  getMissingInventoryReport,
  getSearchDemandReport,
  getSearchInsights,
  getSearchSummary,
  getDealerDemandInsights,
} from "../services/searchInsightsService.js";
import { protect, adminOnly, dealerOnly } from "../middleware/auth.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📈 GET TRENDING SEARCHES
// =============================

export const getTrendingSearchesHandler = async (req, res) => {
  try {
    const { limit = 10, period = 7 } = req.query;
    const trending = await getTrendingSearches(parseInt(limit), parseInt(period));

    res.json({
      success: true,
      data: trending,
    });
  } catch (err) {
    logError("Failed to get trending searches", err);
    res.status(500).json({
      success: false,
      message: "Failed to get trending searches",
    });
  }
};

// =============================
// 🚨 GET NO-RESULT SEARCHES
// =============================

export const getNoResultSearchesHandler = async (req, res) => {
  try {
    const { limit = 10, period = 7 } = req.query;
    const noResults = await getNoResultSearches(parseInt(limit), parseInt(period));

    res.json({
      success: true,
      data: noResults,
    });
  } catch (err) {
    logError("Failed to get no-result searches", err);
    res.status(500).json({
      success: false,
      message: "Failed to get no-result searches",
    });
  }
};

// =============================
// 📊 GET POPULAR FILTERS
// =============================

export const getPopularFiltersHandler = async (req, res) => {
  try {
    const { period = 7 } = req.query;
    const filters = await getPopularFilters(parseInt(period));

    res.json({
      success: true,
      data: filters,
    });
  } catch (err) {
    logError("Failed to get popular filters", err);
    res.status(500).json({
      success: false,
      message: "Failed to get popular filters",
    });
  }
};

// =============================
// 📍 GET COUNTY SEARCH STATS
// =============================

export const getCountySearchStatsHandler = async (req, res) => {
  try {
    const { period = 7 } = req.query;
    const stats = await getCountySearchStats(parseInt(period));

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get county search stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get county search stats",
    });
  }
};

// =============================
// 💰 GET PRICE RANGE STATS
// =============================

export const getPriceRangeStatsHandler = async (req, res) => {
  try {
    const { period = 7 } = req.query;
    const stats = await getPriceRangeSearchStats(parseInt(period));

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get price range stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get price range stats",
    });
  }
};

// =============================
// 🚗 GET BRAND/MODEL STATS
// =============================

export const getBrandModelStatsHandler = async (req, res) => {
  try {
    const { period = 7 } = req.query;
    const stats = await getBrandModelSearchStats(parseInt(period));

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logError("Failed to get brand/model stats", err);
    res.status(500).json({
      success: false,
      message: "Failed to get brand/model stats",
    });
  }
};

// =============================
// 📋 GET MISSING INVENTORY REPORT
// =============================

export const getMissingInventoryReportHandler = async (req, res) => {
  try {
    const report = await getMissingInventoryReport();

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    logError("Failed to get missing inventory report", err);
    res.status(500).json({
      success: false,
      message: "Failed to get missing inventory report",
    });
  }
};

// =============================
// 📊 GET SEARCH DEMAND REPORT
// =============================

export const getSearchDemandReportHandler = async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const report = await getSearchDemandReport(parseInt(period));

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    logError("Failed to get search demand report", err);
    res.status(500).json({
      success: false,
      message: "Failed to get search demand report",
    });
  }
};

// =============================
// 📊 GET COMPREHENSIVE INSIGHTS
// =============================

export const getSearchInsightsHandler = async (req, res) => {
  try {
    const { period = 7 } = req.query;
    const insights = await getSearchInsights(parseInt(period));

    res.json({
      success: true,
      data: insights,
    });
  } catch (err) {
    logError("Failed to get search insights", err);
    res.status(500).json({
      success: false,
      message: "Failed to get search insights",
    });
  }
};

// =============================
// 📊 GET SEARCH SUMMARY
// =============================

export const getSearchSummaryHandler = async (req, res) => {
  try {
    const { period = 7 } = req.query;
    const summary = await getSearchSummary(parseInt(period));

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    logError("Failed to get search summary", err);
    res.status(500).json({
      success: false,
      message: "Failed to get search summary",
    });
  }
};

// =============================
// 📊 GET DEALER DEMAND INSIGHTS
// =============================

export const getDealerDemandInsightsHandler = async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const insights = await getDealerDemandInsights(parseInt(period));

    res.json({
      success: true,
      data: insights,
    });
  } catch (err) {
    logError("Failed to get dealer demand insights", err);
    res.status(500).json({
      success: false,
      message: "Failed to get dealer demand insights",
    });
  }
};

export default {
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
};
