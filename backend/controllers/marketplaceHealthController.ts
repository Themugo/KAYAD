// backend/controllers/marketplaceHealthController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Marketplace Health controller
// Handles marketplace health monitoring API endpoints
// ─────────────────────────────────────────────────────────────

import MarketplaceHealth from "../models/MarketplaceHealth.ts";
import { triggerHealthGeneration } from "../services/marketplaceHealthScheduler.ts";
import { getHealthTrend, getActiveAlerts } from "../services/marketplaceHealthService.ts";
import { protect, adminOnly } from "../middleware/auth.ts";
import { logInfo, logError } from "../utils/logger.ts";

// =============================
// 📊 GET HEALTH SUMMARY
// =============================

export const getHealthSummary = async (req, res) => {
  try {
    const { period = "daily" } = req.query;
    const health = await MarketplaceHealth.findOne({
      period,
    }).sort({ timestamp: -1 });

    if (!health) {
      return res.json({
        success: true,
        message: "No health data available",
        data: null,
      });
    }

    res.json({
      success: true,
      data: health,
    });
  } catch (err) {
    logError("Failed to get health summary", err);
    res.status(500).json({
      success: false,
      message: "Failed to get health summary",
    });
  }
};

// =============================
// 📈 GET HEALTH TRENDS
// =============================

export const getHealthTrendsHandler = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const trends = await getHealthTrend(new Date(startDate), new Date(endDate));

    res.json({
      success: true,
      data: trends,
    });
  } catch (err) {
    logError("Failed to get health trends", err);
    res.status(500).json({
      success: false,
      message: "Failed to get health trends",
    });
  }
};

// =============================
// 🚨 GET ACTIVE ALERTS
// =============================

export const getAlertsHandler = async (req, res) => {
  try {
    const alerts = await getActiveAlerts();

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (err) {
    logError("Failed to get alerts", err);
    res.status(500).json({
      success: false,
      message: "Failed to get alerts",
    });
  }
};

// =============================
// ✅ RESOLVE ALERT
// =============================

export const resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const health = await MarketplaceHealth.findOne().sort({ timestamp: -1 });
    if (!health) {
      return res.status(404).json({
        success: false,
        message: "No health data found",
      });
    }

    const alertIndex = health.alerts.findIndex((a) => a._id.toString() === alertId);
    if (alertIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    await health.resolveAlert(alertIndex);

    res.json({
      success: true,
      message: "Alert resolved successfully",
    });
  } catch (err) {
    logError("Failed to resolve alert", err);
    res.status(500).json({
      success: false,
      message: "Failed to resolve alert",
    });
  }
};

// =============================
// 📊 GET DETAILED METRICS
// =============================

export const getDetailedMetrics = async (req, res) => {
  try {
    const { period = "daily" } = req.query;
    const health = await MarketplaceHealth.findOne({
      period,
    }).sort({ timestamp: -1 });

    if (!health) {
      return res.json({
        success: true,
        message: "No health data available",
        data: null,
      });
    }

    const metrics = {
      userMetrics: {
        activeDealers: health.activeDealers,
        activeBuyers: health.activeBuyers,
        newDealers: health.newDealers,
        newBuyers: health.newBuyers,
      },
      vehicleMetrics: {
        vehiclesListed: health.vehiclesListed,
        vehiclesSold: health.vehiclesSold,
        newListings: health.newListings,
      },
      conversionMetrics: {
        escrowConversionRate: health.escrowConversionRate,
        auctionConversionRate: health.auctionConversionRate,
        leadConversionRate: health.leadConversionRate,
        overallConversionRate: health.overallConversionRate,
      },
      trustSafetyMetrics: {
        fraudIncidents: health.fraudIncidents,
        fraudRate: health.fraudRate,
        disputes: health.disputes,
        disputeRate: health.disputeRate,
      },
      financialMetrics: {
        revenue: health.revenue,
        paymentSuccessRate: health.paymentSuccessRate,
        paymentFailures: health.paymentFailures,
      },
      healthScore: health.healthScore,
      healthScoreBreakdown: health.healthScoreBreakdown,
    };

    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    logError("Failed to get detailed metrics", err);
    res.status(500).json({
      success: false,
      message: "Failed to get detailed metrics",
    });
  }
};

// =============================
// 🔄 REGENERATE HEALTH SNAPSHOT (ADMIN)
// =============================

export const regenerateHealth = async (req, res) => {
  try {
    const { period, timestamp } = req.body;

    if (!period || !timestamp) {
      return res.status(400).json({
        success: false,
        message: "period and timestamp are required",
      });
    }

    const health = await triggerHealthGeneration(period, timestamp);

    res.json({
      success: true,
      message: "Health snapshot regenerated successfully",
      data: health,
    });
  } catch (err) {
    logError("Failed to regenerate health snapshot", err);
    res.status(500).json({
      success: false,
      message: "Failed to regenerate health snapshot",
    });
  }
};

// =============================
// 📋 GET ALL HEALTH RECORDS (ADMIN)
// =============================

export const getAllHealthRecords = async (req, res) => {
  try {
    const { period } = req.query;

    const query = {};
    if (period) {
      query.period = period;
    }

    const healthRecords = await MarketplaceHealth.find(query).sort({ timestamp: -1 }).limit(100);

    res.json({
      success: true,
      data: healthRecords,
      count: healthRecords.length,
    });
  } catch (err) {
    logError("Failed to get all health records", err);
    res.status(500).json({
      success: false,
      message: "Failed to get all health records",
    });
  }
};

export default {
  getHealthSummary,
  getHealthTrendsHandler,
  getAlertsHandler,
  resolveAlert,
  getDetailedMetrics,
  regenerateHealth,
  getAllHealthRecords,
};
