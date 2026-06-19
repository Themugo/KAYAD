// backend/controllers/dealerHealthScoreController.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Health Score controller
// Handles health score API endpoints
// ─────────────────────────────────────────────────────────────

import DealerHealthScore from "../models/DealerHealthScore.js";
import {
  calculateHealthScore,
  recalculateAllScores,
  getTopDealers,
  getDealerRank,
} from "../services/dealerHealthScoreService.js";
import { protect, adminOnly } from "../middleware/auth.js";
import { triggerAlert, ALERT_LEVELS } from "../config/alerting.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📊 GET DEALER HEALTH SCORE
// =============================

export const getDealerHealthScore = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const healthScore = await DealerHealthScore.findOne({ dealer: dealerId }).populate(
      "dealer",
      "name email businessName location logo",
    );

    if (!healthScore) {
      return res.status(404).json({
        success: false,
        message: "Health score not found for this dealer",
      });
    }

    res.json({
      success: true,
      healthScore,
    });
  } catch (err) {
    logError("Failed to get dealer health score", err);
    res.status(500).json({
      success: false,
      message: "Failed to get health score",
    });
  }
};

// =============================
// 📋 GET DEALER HEALTH SCORE DETAILS
// =============================

export const getDealerHealthScoreDetails = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const healthScore = await DealerHealthScore.findOne({ dealer: dealerId });

    if (!healthScore) {
      return res.status(404).json({
        success: false,
        message: "Health score not found for this dealer",
      });
    }

    res.json({
      success: true,
      healthScore,
      breakdown: {
        verification: {
          score: healthScore.verificationScore,
          details: healthScore.verificationDetails,
          weight: "15%",
        },
        accountAge: {
          score: healthScore.accountAgeScore,
          details: healthScore.accountAgeDetails,
          weight: "10%",
        },
        transaction: {
          score: healthScore.transactionScore,
          details: healthScore.transactionDetails,
          weight: "20%",
        },
        escrow: {
          score: healthScore.escrowScore,
          details: healthScore.escrowDetails,
          weight: "15%",
        },
        review: {
          score: healthScore.reviewScore,
          details: healthScore.reviewDetails,
          weight: "15%",
        },
        fraud: {
          score: healthScore.fraudScore,
          details: healthScore.fraudDetails,
          weight: "-15%",
        },
        response: {
          score: healthScore.responseScore,
          details: healthScore.responseDetails,
          weight: "10%",
        },
        listingQuality: {
          score: healthScore.listingQualityScore,
          details: healthScore.listingQualityDetails,
          weight: "10%",
        },
        auction: {
          score: healthScore.auctionScore,
          details: healthScore.auctionDetails,
          weight: "10%",
        },
      },
    });
  } catch (err) {
    logError("Failed to get dealer health score details", err);
    res.status(500).json({
      success: false,
      message: "Failed to get health score details",
    });
  }
};

// =============================
// 🏆 GET DEALER RANKING
// =============================

export const getDealerRanking = async (req, res) => {
  try {
    const { limit = 50, category } = req.query;

    const topDealers = await DealerHealthScore.getTopDealers(category, parseInt(limit));

    res.json({
      success: true,
      ranking: topDealers,
      count: topDealers.length,
    });
  } catch (err) {
    logError("Failed to get dealer ranking", err);
    res.status(500).json({
      success: false,
      message: "Failed to get ranking",
    });
  }
};

// =============================
// 🥇 GET TOP DEALERS BY CATEGORY
// =============================

export const getTopDealersByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const topDealers = await DealerHealthScore.getTopDealers(category, parseInt(limit));

    res.json({
      success: true,
      topDealers,
      category,
      count: topDealers.length,
    });
  } catch (err) {
    logError("Failed to get top dealers by category", err);
    res.status(500).json({
      success: false,
      message: "Failed to get top dealers",
    });
  }
};

// =============================
// 📈 GET DEALER SCORE TRENDS
// =============================

export const getDealerScoreTrends = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const healthScores = await DealerHealthScore.find({ dealer: dealerId }).sort({ createdAt: -1 }).limit(30);

    res.json({
      success: true,
      trends: healthScores.map((hs) => ({
        score: hs.healthScore,
        category: hs.scoreCategory,
        calculatedAt: hs.lastCalculatedAt,
        change: hs.scoreChange,
        trend: hs.trend,
      })),
    });
  } catch (err) {
    logError("Failed to get dealer score trends", err);
    res.status(500).json({
      success: false,
      message: "Failed to get score trends",
    });
  }
};

// =============================
// 🔄 RECALCULATE DEALER SCORE (ADMIN)
// =============================

export const recalculateDealerScore = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const result = await calculateHealthScore(dealerId);

    logInfo("Dealer score recalculated by admin", { dealerId, result });

    res.json({
      success: true,
      message: "Health score recalculated successfully",
      result,
    });
  } catch (err) {
    logError("Failed to recalculate dealer score", err);
    res.status(500).json({
      success: false,
      message: "Failed to recalculate health score",
    });
  }
};

// =============================
// 🔄 RECALCULATE ALL SCORES (ADMIN)
// =============================

export const recalculateAllScoresAdmin = async (req, res) => {
  try {
    const result = await recalculateAllScores();

    logInfo("All dealer scores recalculated by admin", { result });

    // Trigger alert for large recalculations
    if (result.total > 100) {
      await triggerAlert(
        "Mass Health Score Recalculation",
        `Admin recalculated ${result.total} dealer health scores`,
        ALERT_LEVELS.MEDIUM,
        { result },
      );
    }

    res.json({
      success: true,
      message: "All health scores recalculated successfully",
      result,
    });
  } catch (err) {
    logError("Failed to recalculate all scores", err);
    res.status(500).json({
      success: false,
      message: "Failed to recalculate all health scores",
    });
  }
};

// =============================
// ✏️ OVERRIDE DEALER SCORE (ADMIN)
// =============================

export const overrideDealerScore = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const { score, reason } = req.body;

    if (typeof score !== "number" || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid score. Must be between 0 and 100",
      });
    }

    const healthScore = await DealerHealthScore.findOne({ dealer: dealerId });

    if (!healthScore) {
      return res.status(404).json({
        success: false,
        message: "Health score not found for this dealer",
      });
    }

    const originalScore = healthScore.healthScore;
    const scoreCategory = DealerHealthScore.determineScoreCategory(score);

    await DealerHealthScore.findByIdAndUpdate(healthScore._id, {
      healthScore: score,
      scoreCategory,
      isOverridden: true,
      overriddenBy: req.user.id,
      overriddenAt: new Date(),
      overrideReason: reason,
      originalScore,
      lastCalculatedAt: new Date(),
    });

    logInfo("Dealer score overridden by admin", { dealerId, originalScore, newScore: score, reason });

    // Trigger alert for score overrides
    await triggerAlert(
      "Dealer Health Score Override",
      `Admin overrode health score for dealer ${dealerId} from ${originalScore} to ${score}`,
      ALERT_LEVELS.HIGH,
      { dealerId, originalScore, newScore: score, reason, adminId: req.user.id },
    );

    res.json({
      success: true,
      message: "Health score overridden successfully",
      originalScore,
      newScore: score,
    });
  } catch (err) {
    logError("Failed to override dealer score", err);
    res.status(500).json({
      success: false,
      message: "Failed to override health score",
    });
  }
};

// =============================
// 📊 GET SCORE DISTRIBUTION (ADMIN)
// =============================

export const getScoreDistribution = async (req, res) => {
  try {
    const distribution = await DealerHealthScore.getScoreDistribution();

    res.json({
      success: true,
      distribution,
    });
  } catch (err) {
    logError("Failed to get score distribution", err);
    res.status(500).json({
      success: false,
      message: "Failed to get score distribution",
    });
  }
};

// =============================
// 🚨 GET SCORE ALERTS (ADMIN)
// =============================

export const getScoreAlerts = async (req, res) => {
  try {
    // Get dealers with significant score drops
    const alerts = await DealerHealthScore.find({
      scoreChange: { $lt: -20 },
      lastCalculatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .populate("dealer", "name email businessName")
      .sort({ scoreChange: 1 })
      .limit(20);

    res.json({
      success: true,
      alerts,
      count: alerts.length,
    });
  } catch (err) {
    logError("Failed to get score alerts", err);
    res.status(500).json({
      success: false,
      message: "Failed to get score alerts",
    });
  }
};

export default {
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
};
