// backend/migrations/migrate_marketplace_health.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Database migration for Marketplace Health Monitoring system
// Creates MarketplaceHealth collection and backfills historical data
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import MarketplaceHealth from "../models/MarketplaceHealth.js";
import { generateMarketplaceHealth } from "../services/marketplaceHealthService.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🚀 RUN MIGRATION
// =============================

export const up = async () => {
  try {
    logInfo("Starting Marketplace Health Monitoring migration");

    // Check if collection already exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some(c => c.name === "marketplacehealths");

    if (collectionExists) {
      logWarn("MarketplaceHealth collection already exists, skipping creation");
      return { success: true, message: "Collection already exists" };
    }

    // Create indexes
    await MarketplaceHealth.init();
    logInfo("MarketplaceHealth indexes created");

    // Backfill historical data - last 7 days hourly
    let hourlyBackfillCount = 0;
    try {
      for (let i = 0; i < 7 * 24; i++) {
        const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
        try {
          await generateMarketplaceHealth("hourly", timestamp);
          hourlyBackfillCount++;
        } catch (err) {
          logWarn("Failed to generate hourly health for timestamp", { timestamp: timestamp.toISOString(), error: err.message });
        }
      }
      logInfo("Backfilled hourly health data", { count: hourlyBackfillCount });
    } catch (err) {
      logError("Failed to backfill hourly health data", err);
    }

    // Backfill historical data - last 30 days daily
    let dailyBackfillCount = 0;
    try {
      for (let i = 0; i < 30; i++) {
        const timestamp = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        try {
          await generateMarketplaceHealth("daily", timestamp);
          dailyBackfillCount++;
        } catch (err) {
          logWarn("Failed to generate daily health for date", { date: timestamp.toISOString(), error: err.message });
        }
      }
      logInfo("Backfilled daily health data", { count: dailyBackfillCount });
    } catch (err) {
      logError("Failed to backfill daily health data", err);
    }

    logInfo("Marketplace Health Monitoring migration completed", {
      hourlyBackfillCount,
      dailyBackfillCount,
      total: hourlyBackfillCount + dailyBackfillCount,
    });

    return {
      success: true,
      message: "Migration completed successfully",
      stats: {
        hourlyBackfillCount,
        dailyBackfillCount,
        total: hourlyBackfillCount + dailyBackfillCount,
      },
    };
  } catch (err) {
    logError("Marketplace Health Monitoring migration failed", err);
    throw err;
  }
};

// =============================
// 🔄 ROLLBACK MIGRATION
// =============================

export const down = async () => {
  try {
    logInfo("Starting Marketplace Health Monitoring rollback");

    // Drop the collection
    await mongoose.connection.db.dropCollection("marketplacehealths");
    
    logInfo("MarketplaceHealth collection dropped");

    return { success: true, message: "Rollback completed successfully" };
  } catch (err) {
    logError("Marketplace Health Monitoring rollback failed", err);
    throw err;
  }
};

// =============================
// 🚀 RUN MIGRATION (STANDALONE)
// =============================

if (import.meta.url === `file://${process.argv[1]}`) {
  mongoose.connect(process.env.MONGODB_URI)
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
