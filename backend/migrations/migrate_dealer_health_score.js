// backend/migrations/migrate_dealer_health_score.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Database migration for Dealer Health Score system
// Creates DealerHealthScore collection and backfills initial data
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import Dealer from "../models/Dealer.js";
import DealerHealthScore from "../models/DealerHealthScore.js";
import { calculateHealthScore } from "../services/dealerHealthScoreService.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🚀 RUN MIGRATION
// =============================

export const up = async () => {
  try {
    logInfo("Starting Dealer Health Score migration");

    // Check if collection already exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some(c => c.name === "dealerhealthscores");

    if (collectionExists) {
      logWarn("DealerHealthScore collection already exists, skipping creation");
      return { success: true, message: "Collection already exists" };
    }

    // Create indexes
    await DealerHealthScore.init();
    logInfo("DealerHealthScore indexes created");

    // Get all approved dealers
    const dealers = await Dealer.find({ approved: true }).select("user");
    logInfo("Found approved dealers for backfill", { count: dealers.length });

    // Calculate initial scores for all dealers
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

    logInfo("Dealer Health Score migration completed", { successCount, failureCount, total: dealers.length });

    return {
      success: true,
      message: "Migration completed successfully",
      stats: { successCount, failureCount, total: dealers.length },
    };
  } catch (err) {
    logError("Dealer Health Score migration failed", err);
    throw err;
  }
};

// =============================
// 🔄 ROLLBACK MIGRATION
// =============================

export const down = async () => {
  try {
    logInfo("Starting Dealer Health Score rollback");

    // Drop the collection
    await mongoose.connection.db.dropCollection("dealerhealthscores");
    
    logInfo("Dealer Health Score collection dropped");

    return { success: true, message: "Rollback completed successfully" };
  } catch (err) {
    logError("Dealer Health Score rollback failed", err);
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
