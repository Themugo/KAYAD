// backend/services/marketplaceHealthScheduler.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Marketplace Health Scheduler
// Cron jobs for automated marketplace health monitoring
// ─────────────────────────────────────────────────────────────

import cron from "node-cron";
import { generateMarketplaceHealth } from "./marketplaceHealthService.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

let hourlyJob = null;
let dailyJob = null;
let weeklyJob = null;

// =============================
// 🚀 START SCHEDULER
// =============================

export const startScheduler = () => {
  try {
    logInfo("Starting Marketplace Health Scheduler");

    // Hourly health - runs every hour
    hourlyJob = cron.schedule("0 * * * *", async () => {
      try {
        logInfo("Running hourly marketplace health generation");
        const now = new Date();
        await generateMarketplaceHealth("hourly", now);
        logInfo("Hourly marketplace health generated successfully");
      } catch (err) {
        logError("Failed to generate hourly marketplace health", err);
      }
    }, {
      timezone: "Africa/Nairobi",
    });

    // Daily health - runs at midnight every day
    dailyJob = cron.schedule("0 0 * * *", async () => {
      try {
        logInfo("Running daily marketplace health generation");
        const today = new Date();
        await generateMarketplaceHealth("daily", today);
        logInfo("Daily marketplace health generated successfully");
      } catch (err) {
        logError("Failed to generate daily marketplace health", err);
      }
    }, {
      timezone: "Africa/Nairobi",
    });

    // Weekly health - runs at midnight on Sunday
    weeklyJob = cron.schedule("0 0 * * 0", async () => {
      try {
        logInfo("Running weekly marketplace health generation");
        const today = new Date();
        await generateMarketplaceHealth("weekly", today);
        logInfo("Weekly marketplace health generated successfully");
      } catch (err) {
        logError("Failed to generate weekly marketplace health", err);
      }
    }, {
      timezone: "Africa/Nairobi",
    });

    logInfo("Marketplace Health Scheduler started successfully");
  } catch (err) {
    logError("Failed to start Marketplace Health Scheduler", err);
    throw err;
  }
};

// =============================
// 🛑 STOP SCHEDULER
// =============================

export const stopScheduler = () => {
  try {
    logInfo("Stopping Marketplace Health Scheduler");

    if (hourlyJob) {
      hourlyJob.stop();
      hourlyJob = null;
    }

    if (dailyJob) {
      dailyJob.stop();
      dailyJob = null;
    }

    if (weeklyJob) {
      weeklyJob.stop();
      weeklyJob = null;
    }

    logInfo("Marketplace Health Scheduler stopped successfully");
  } catch (err) {
    logError("Failed to stop Marketplace Health Scheduler", err);
    throw err;
  }
};

// =============================
// 🔄 GENERATE HOURLY HEALTH
// =============================

export const generateHourlyHealth = async (timestamp = new Date()) => {
  try {
    logInfo("Generating hourly health", { timestamp });
    const health = await generateMarketplaceHealth("hourly", timestamp);
    logInfo("Hourly health generated", { healthScore: health.healthScore });
    return health;
  } catch (err) {
    logError("Failed to generate hourly health", err);
    throw err;
  }
};

// =============================
// 🔄 GENERATE DAILY HEALTH
// =============================

export const generateDailyHealth = async (timestamp = new Date()) => {
  try {
    logInfo("Generating daily health", { timestamp });
    const health = await generateMarketplaceHealth("daily", timestamp);
    logInfo("Daily health generated", { healthScore: health.healthScore });
    return health;
  } catch (err) {
    logError("Failed to generate daily health", err);
    throw err;
  }
};

// =============================
// 🔄 GENERATE WEEKLY HEALTH
// =============================

export const generateWeeklyHealth = async (timestamp = new Date()) => {
  try {
    logInfo("Generating weekly health", { timestamp });
    const health = await generateMarketplaceHealth("weekly", timestamp);
    logInfo("Weekly health generated", { healthScore: health.healthScore });
    return health;
  } catch (err) {
    logError("Failed to generate weekly health", err);
    throw err;
  }
};

// =============================
// 🎯 TRIGGER HEALTH GENERATION
// =============================

export const triggerHealthGeneration = async (period, timestamp) => {
  try {
    logInfo("Triggering health generation", { period, timestamp });
    const health = await generateMarketplaceHealth(period, new Date(timestamp));
    logInfo("Health generated", { healthScore: health.healthScore });
    return health;
  } catch (err) {
    logError("Failed to trigger health generation", err);
    throw err;
  }
};

export default {
  startScheduler,
  stopScheduler,
  generateHourlyHealth,
  generateDailyHealth,
  generateWeeklyHealth,
  triggerHealthGeneration,
};
