// backend/migrations/migrate_vehicle_market_analytics.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Database migration for Vehicle Market Intelligence system
// Creates VehicleMarketAnalytics collection and backfills historical data
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import VehicleMarketAnalytics from "../models/VehicleMarketAnalytics.js";
import { generateMarketAnalytics } from "../services/vehicleAnalyticsService.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🚀 RUN MIGRATION
// =============================

export const up = async () => {
  try {
    logInfo("Starting Vehicle Market Intelligence migration");

    // Check if collection already exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some((c) => c.name === "vehiclemarketanalytics");

    if (collectionExists) {
      logWarn("VehicleMarketAnalytics collection already exists, skipping creation");
      return { success: true, message: "Collection already exists" };
    }

    // Create indexes
    await VehicleMarketAnalytics.init();
    logInfo("VehicleMarketAnalytics indexes created");

    // Backfill historical data - last 30 days daily
    let dailyBackfillCount = 0;
    try {
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        try {
          await generateMarketAnalytics("daily", startDate, endDate);
          dailyBackfillCount++;
        } catch (err) {
          logWarn("Failed to generate daily analytics for date", { date: startDate.toISOString(), error: err.message });
        }
      }
      logInfo("Backfilled daily analytics", { count: dailyBackfillCount });
    } catch (err) {
      logError("Failed to backfill daily analytics", err);
    }

    // Backfill historical data - last 12 months monthly
    let monthlyBackfillCount = 0;
    try {
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);

        try {
          await generateMarketAnalytics("monthly", startDate, endDate);
          monthlyBackfillCount++;
        } catch (err) {
          logWarn("Failed to generate monthly analytics for month", {
            month: startDate.toISOString(),
            error: err.message,
          });
        }
      }
      logInfo("Backfilled monthly analytics", { count: monthlyBackfillCount });
    } catch (err) {
      logError("Failed to backfill monthly analytics", err);
    }

    logInfo("Vehicle Market Intelligence migration completed", {
      dailyBackfillCount,
      monthlyBackfillCount,
      total: dailyBackfillCount + monthlyBackfillCount,
    });

    return {
      success: true,
      message: "Migration completed successfully",
      stats: {
        dailyBackfillCount,
        monthlyBackfillCount,
        total: dailyBackfillCount + monthlyBackfillCount,
      },
    };
  } catch (err) {
    logError("Vehicle Market Intelligence migration failed", err);
    throw err;
  }
};

// =============================
// 🔄 ROLLBACK MIGRATION
// =============================

export const down = async () => {
  try {
    logInfo("Starting Vehicle Market Intelligence rollback");

    // Drop the collection
    await mongoose.connection.db.dropCollection("vehiclemarketanalytics");

    logInfo("VehicleMarketAnalytics collection dropped");

    return { success: true, message: "Rollback completed successfully" };
  } catch (err) {
    logError("Vehicle Market Intelligence rollback failed", err);
    throw err;
  }
};

// =============================
// 🚀 RUN MIGRATION (STANDALONE)
// =============================

if (import.meta.url === `file://${process.argv[1]}`) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log("Connected to MongoDB");

      const operation = process.argv[2];

      if (operation === "down") {
        await down();
        console.log("Migration rolled back");
      } else {
        await up();
        console.log("Migration completed");
      }

      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

export default { up, down };
