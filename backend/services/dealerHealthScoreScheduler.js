// backend/services/dealerHealthScoreScheduler.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Health Score scheduler
// Schedules and manages health score calculations
// ─────────────────────────────────────────────────────────────

import cron from "node-cron";
import { calculateHealthScore, recalculateAllScores } from "./dealerHealthScoreService.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { findAll, update } from "../db/index.js";

let schedulerTask = null;
let incrementalTask = null;

// =============================
// 🚀 START SCHEDULER
// =============================

export const startScheduler = () => {
  if (schedulerTask) {
    logWarn("Health score scheduler already running");
    return;
  }

  // Daily full recalculation at 2 AM
  schedulerTask = cron.schedule("0 2 * * *", async () => {
    try {
      logInfo("Starting daily health score recalculation");
      await recalculateAllScores();
      logInfo("Daily health score recalculation completed");
    } catch (err) {
      logError("Daily health score recalculation failed", err);
    }
  });

  // Hourly incremental updates for changed dealers
  incrementalTask = cron.schedule("0 * * * *", async () => {
    try {
      logInfo("Starting incremental health score update");
      await calculateChangedScores();
      logInfo("Incremental health score update completed");
    } catch (err) {
      logError("Incremental health score update failed", err);
    }
  });

  logInfo("Health score scheduler started");
};

// =============================
// 🛑 STOP SCHEDULER
// =============================

export const stopScheduler = () => {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
  }

  if (incrementalTask) {
    incrementalTask.stop();
    incrementalTask = null;
  }

  logInfo("Health score scheduler stopped");
};

// =============================
// 🔄 CALCULATE CHANGED SCORES
// =============================

export const calculateChangedScores = async () => {
  try {
    // Get dealers with recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const dealers = await findAll("dealers", { filters: {
      $or: [{ updatedAt: { $gte: oneDayAgo } }, { createdAt: { $gte: oneDayAgo } }],
    }, select: "user" });

    logInfo("Calculating scores for changed dealers", { count: dealers.length });

    let successCount = 0;
    let failureCount = 0;

    for (const dealer of dealers) {
      try {
        await calculateHealthScore(dealer.user);
        successCount++;
      } catch (err) {
        logError("Failed to calculate health score for dealer", err, { dealerId: dealer.user });
        failureCount++;
      }
    }

    logInfo("Changed scores calculation completed", { successCount, failureCount });

    return { successCount, failureCount, total: dealers.length };
  } catch (err) {
    logError("Failed to calculate changed scores", err);
    throw err;
  }
};

// =============================
// 📊 UPDATE SCORE TRENDS
// =============================

export const updateScoreTrends = async () => {
  try {
    const healthScores = await findAll("dealer_health_scores", { filters: {} });

    for (const healthScore of healthScores) {
      const previousScore = healthScore.previousScore || 0;
      const currentScore = healthScore.healthScore;
      const scoreChange = currentScore - previousScore;

      const trend = scoreChange > 0 ? "up" : scoreChange < 0 ? "down" : "stable";

      await update("dealer_health_scores", healthScore.id, {
        previousScore: currentScore,
        scoreChange,
        trend,
      });
    }

    logInfo("Score trends updated", { count: healthScores.length });
  } catch (err) {
    logError("Failed to update score trends", err);
    throw err;
  }
};

// =============================
// 🚀 MANUAL TRIGGER
// =============================

export const triggerRecalculation = async (dealerId = null) => {
  try {
    if (dealerId) {
      await calculateHealthScore(dealerId);
      logInfo("Health score recalculated for dealer", { dealerId });
      return { success: true, dealerId };
    } else {
      const result = await recalculateAllScores();
      logInfo("All health scores recalculated", result);
      return { success: true, ...result };
    }
  } catch (err) {
    logError("Failed to trigger recalculation", err, { dealerId });
    throw err;
  }
};

export default {
  startScheduler,
  stopScheduler,
  calculateChangedScores,
  updateScoreTrends,
  triggerRecalculation,
};
