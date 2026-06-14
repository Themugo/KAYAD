// backend/controllers/vehicleAnalyticsController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Vehicle Analytics controller
// Handles market analytics API endpoints
// ─────────────────────────────────────────────────────────────

import {
  calculateAverageSellingPrice,
  calculateAverageListingPrice,
  calculateDaysOnMarket,
  getMostViewedVehicles,
  getMostSearchedVehicles,
  getFastestSellingVehicles,
  getCountyTrends,
  getBrandTrends,
  getModelTrends,
  getSpecTrends,
  getPriceTrend,
  getVolumeTrend,
} from "../services/vehicleAnalyticsService.js";
import { triggerAnalyticsGeneration } from "../services/marketTrendScheduler.js";
import VehicleMarketAnalytics from "../models/VehicleMarketAnalytics.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📊 GET MARKET SUMMARY
// =============================

export const getMarketSummary = async (req, res) => {
  try {
    const { period = "monthly" } = req.query;
    const analytics = await VehicleMarketAnalytics.findOne({
      period,
    }).sort({ endDate: -1 });

    if (!analytics) {
      return res.json({
        success: true,
        message: "No analytics data available",
        data: null,
      });
    }

    res.json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    logError("Failed to get market summary", err);
    res.status(500).json({
      success: false,
      message: "Failed to get market summary",
    });
  }
};

// =============================
// 📈 GET PRICE TRENDS
// =============================

export const getPriceTrends = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const trends = await getPriceTrend(new Date(startDate), new Date(endDate));

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    logError("Failed to get price trends", err);
    res.status(500).json({
      success: false,
      message: "Failed to get price trends",
    });
  }
};

// =============================
// 📈 GET VOLUME TRENDS
// =============================

export const getVolumeTrends = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const trends = await getVolumeTrend(new Date(startDate), new Date(endDate));

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    logError("Failed to get volume trends", err);
    res.status(500).json({
      success: false,
      message: "Failed to get volume trends",
    });
  }
};

// =============================
// 📍 GET COUNTY TRENDS
// =============================

export const getCountyTrendsHandler = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = new Date();

    const trends = await getCountyTrends(
      startDate ? new Date(startDate) : defaultStartDate,
      endDate ? new Date(endDate) : defaultEndDate
    );

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    logError("Failed to get county trends", err);
    res.status(500).json({
      success: false,
      message: "Failed to get county trends",
    });
  }
};

// =============================
// 🚗 GET BRAND TRENDS
// =============================

export const getBrandTrendsHandler = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = new Date();

    const trends = await getBrandTrends(
      startDate ? new Date(startDate) : defaultStartDate,
      endDate ? new Date(endDate) : defaultEndDate
    );

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    logError("Failed to get brand trends", err);
    res.status(500).json({
      success: false,
      message: "Failed to get brand trends",
    });
  }
};

// =============================
// 📋 GET MODEL TRENDS
// =============================

export const getModelTrendsHandler = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = new Date();

    const trends = await getModelTrends(
      startDate ? new Date(startDate) : defaultStartDate,
      endDate ? new Date(endDate) : defaultEndDate
    );

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    logError("Failed to get model trends", err);
    res.status(500).json({
      success: false,
      message: "Failed to get model trends",
    });
  }
};

// =============================
// 📊 GET SPEC TRENDS
// =============================

export const getSpecTrendsHandler = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = new Date();

    const trends = await getSpecTrends(
      startDate ? new Date(startDate) : defaultStartDate,
      endDate ? new Date(endDate) : defaultEndDate
    );

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    logError("Failed to get spec trends", err);
    res.status(500).json({
      success: false,
      message: "Failed to get spec trends",
    });
  }
};

// =============================
// 👁️ GET MOST VIEWED VEHICLES
// =============================

export const getMostViewedHandler = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = new Date();

    const vehicles = await getMostViewedVehicles(
      parseInt(limit),
      startDate ? new Date(startDate) : defaultStartDate,
      endDate ? new Date(endDate) : defaultEndDate
    );

    res.json({
      success: true,
      data: vehicles,
    });
  } catch (err) {
    logError("Failed to get most viewed vehicles", err);
    res.status(500).json({
      success: false,
      message: "Failed to get most viewed vehicles",
    });
  }
};

// =============================
// 🔍 GET MOST SEARCHED VEHICLES
// =============================

export const getMostSearchedHandler = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = new Date();

    const searches = await getMostSearchedVehicles(
      parseInt(limit),
      startDate ? new Date(startDate) : defaultStartDate,
      endDate ? new Date(endDate) : defaultEndDate
    );

    res.json({
      success: true,
      data: searches,
    });
  } catch (err) {
    logError("Failed to get most searched vehicles", err);
    res.status(500).json({
      success: false,
      message: "Failed to get most searched vehicles",
    });
  }
};

// =============================
// ⚡ GET FASTEST SELLING VEHICLES
// =============================

export const getFastestSellingHandler = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = new Date();

    const vehicles = await getFastestSellingVehicles(
      parseInt(limit),
      startDate ? new Date(startDate) : defaultStartDate,
      endDate ? new Date(endDate) : defaultEndDate
    );

    res.json({
      success: true,
      data: vehicles,
    });
  } catch (err) {
    logError("Failed to get fastest selling vehicles", err);
    res.status(500).json({
      success: false,
      message: "Failed to get fastest selling vehicles",
    });
  }
};

// =============================
// 🏪 GET DEALER ANALYTICS
// =============================

export const getDealerAnalytics = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const { startDate, endDate } = req.query;

    const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultEndDate = new Date();

    // Get dealer's vehicles
    const Car = (await import("../models/Car.js")).default;
    const dealerCars = await Car.find({
      dealer: dealerId,
      createdAt: { $gte: startDate ? new Date(startDate) : defaultStartDate },
      deletedAt: null,
    }).select("price status createdAt updatedAt views");

    // Calculate dealer-specific metrics
    const dealerListings = dealerCars.length;
    const dealerSales = dealerCars.filter(c => c.status === "sold").length;
    const dealerAvgPrice = dealerCars.length > 0 
      ? dealerCars.reduce((sum, c) => sum + (c.price || 0), 0) / dealerCars.length 
      : 0;
    const dealerTotalViews = dealerCars.reduce((sum, c) => sum + (c.views || 0), 0);
    const dealerConversionRate = dealerListings > 0 ? (dealerSales / dealerListings) * 100 : 0;

    // Calculate average days on market for dealer
    const soldCars = dealerCars.filter(c => c.status === "sold");
    let dealerAvgDaysOnMarket = 0;
    if (soldCars.length > 0) {
      const daysOnMarket = soldCars.map(car => {
        const created = new Date(car.createdAt);
        const sold = new Date(car.updatedAt);
        return Math.floor((sold - created) / (1000 * 60 * 60 * 24));
      });
      dealerAvgDaysOnMarket = daysOnMarket.reduce((sum, d) => sum + d, 0) / daysOnMarket.length;
    }

    res.json({
      success: true,
      data: {
        dealerId,
        listings: dealerListings,
        sales: dealerSales,
        averagePrice: dealerAvgPrice,
        totalViews: dealerTotalViews,
        conversionRate: dealerConversionRate,
        averageDaysOnMarket: dealerAvgDaysOnMarket,
      },
    });
  } catch (err) {
    logError("Failed to get dealer analytics", err);
    res.status(500).json({
      success: false,
      message: "Failed to get dealer analytics",
    });
  }
};

// =============================
// 🔄 REGENERATE ANALYTICS (ADMIN)
// =============================

export const regenerateAnalytics = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.body;

    if (!period || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "period, startDate, and endDate are required",
      });
    }

    const analytics = await triggerAnalyticsGeneration(period, startDate, endDate);

    res.json({
      success: true,
      message: "Analytics regenerated successfully",
      data: analytics,
    });
  } catch (err) {
    logError("Failed to regenerate analytics", err);
    res.status(500).json({
      success: false,
      message: "Failed to regenerate analytics",
    });
  }
};

// =============================
// 📋 GET ALL ANALYTICS (ADMIN)
// =============================

export const getAllAnalytics = async (req, res) => {
  try {
    const { period } = req.query;

    const query = {};
    if (period) {
      query.period = period;
    }

    const analytics = await VehicleMarketAnalytics.find(query)
      .sort({ endDate: -1 })
      .limit(100);

    res.json({
      success: true,
      data: analytics,
      count: analytics.length,
    });
  } catch (err) {
    logError("Failed to get all analytics", err);
    res.status(500).json({
      success: false,
      message: "Failed to get all analytics",
    });
  }
};

export default {
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
};
