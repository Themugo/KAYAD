// backend/services/marketTrendScheduler.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Market Trend Scheduler
// Cron jobs for automated market analytics generation
// ─────────────────────────────────────────────────────────────

import cron from "node-cron";
import { generateMarketAnalytics } from "./vehicleAnalyticsService.ts";
import { logInfo, logError, logWarn } from "../utils/logger.ts";

let dailyJob = null;
let weeklyJob = null;
let monthlyJob = null;

// =============================
// 🚀 START SCHEDULER
// =============================

export const startScheduler = () => {
  try {
    logInfo("Starting Market Trend Scheduler");

    // Daily analytics - runs at midnight every day
    dailyJob = cron.schedule(
      "0 0 * * *",
      async () => {
        try {
          logInfo("Running daily market analytics generation");
          const today = new Date();
          await generateMarketAnalytics("daily", today, today);
          logInfo("Daily market analytics generated successfully");
        } catch (err) {
          logError("Failed to generate daily market analytics", err);
        }
      },
      {
        timezone: "Africa/Nairobi",
      },
    );

    // Weekly analytics - runs at midnight on Sunday
    weeklyJob = cron.schedule(
      "0 0 * * 0",
      async () => {
        try {
          logInfo("Running weekly market analytics generation");
          const today = new Date();
          const startDate = new Date(today);
          startDate.setDate(startDate.getDate() - startDate.getDay());
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
          await generateMarketAnalytics("weekly", startDate, endDate);
          logInfo("Weekly market analytics generated successfully");
        } catch (err) {
          logError("Failed to generate weekly market analytics", err);
        }
      },
      {
        timezone: "Africa/Nairobi",
      },
    );

    // Monthly analytics - runs at midnight on the 1st of each month
    monthlyJob = cron.schedule(
      "0 0 1 * *",
      async () => {
        try {
          logInfo("Running monthly market analytics generation");
          const today = new Date();
          const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          await generateMarketAnalytics("monthly", startDate, endDate);
          logInfo("Monthly market analytics generated successfully");
        } catch (err) {
          logError("Failed to generate monthly market analytics", err);
        }
      },
      {
        timezone: "Africa/Nairobi",
      },
    );

    logInfo("Market Trend Scheduler started successfully");
  } catch (err) {
    logError("Failed to start Market Trend Scheduler", err);
    throw err;
  }
};

// =============================
// 🛑 STOP SCHEDULER
// =============================

export const stopScheduler = () => {
  try {
    logInfo("Stopping Market Trend Scheduler");

    if (dailyJob) {
      dailyJob.stop();
      dailyJob = null;
    }

    if (weeklyJob) {
      weeklyJob.stop();
      weeklyJob = null;
    }

    if (monthlyJob) {
      monthlyJob.stop();
      monthlyJob = null;
    }

    logInfo("Market Trend Scheduler stopped successfully");
  } catch (err) {
    logError("Failed to stop Market Trend Scheduler", err);
    throw err;
  }
};

// =============================
// 🔄 GENERATE DAILY ANALYTICS
// =============================

export const generateDailyAnalytics = async (date = new Date()) => {
  try {
    logInfo("Generating daily analytics", { date });
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    const analytics = await generateMarketAnalytics("daily", startDate, endDate);
    logInfo("Daily analytics generated", { analyticsId: analytics._id });
    return analytics;
  } catch (err) {
    logError("Failed to generate daily analytics", err);
    throw err;
  }
};

// =============================
// 🔄 GENERATE WEEKLY ANALYTICS
// =============================

export const generateWeeklyAnalytics = async (date = new Date()) => {
  try {
    logInfo("Generating weekly analytics", { date });
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    const analytics = await generateMarketAnalytics("weekly", startDate, endDate);
    logInfo("Weekly analytics generated", { analyticsId: analytics._id });
    return analytics;
  } catch (err) {
    logError("Failed to generate weekly analytics", err);
    throw err;
  }
};

// =============================
// 🔄 GENERATE MONTHLY ANALYTICS
// =============================

export const generateMonthlyAnalytics = async (date = new Date()) => {
  try {
    logInfo("Generating monthly analytics", { date });
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    const analytics = await generateMarketAnalytics("monthly", startDate, endDate);
    logInfo("Monthly analytics generated", { analyticsId: analytics._id });
    return analytics;
  } catch (err) {
    logError("Failed to generate monthly analytics", err);
    throw err;
  }
};

// =============================
// 🎯 TRIGGER ANALYTICS GENERATION
// =============================

export const triggerAnalyticsGeneration = async (period, startDate, endDate) => {
  try {
    logInfo("Triggering analytics generation", { period, startDate, endDate });
    const analytics = await generateMarketAnalytics(period, new Date(startDate), new Date(endDate));
    logInfo("Analytics generated", { analyticsId: analytics._id });
    return analytics;
  } catch (err) {
    logError("Failed to trigger analytics generation", err);
    throw err;
  }
};

export default {
  startScheduler,
  stopScheduler,
  generateDailyAnalytics,
  generateWeeklyAnalytics,
  generateMonthlyAnalytics,
  triggerAnalyticsGeneration,
};
