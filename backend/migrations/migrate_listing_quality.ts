// backend/migrations/migrate_listing_quality.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Database migration for Listing Quality Score system
// Creates ListingQuality collection and backfills quality scores
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import ListingQuality from "../models/ListingQuality.ts";
import Car from "../models/Car.ts";
import { logInfo, logError, logWarn } from "../utils/logger.ts";

// =============================
// 🚀 RUN MIGRATION
// =============================

export const up = async () => {
  try {
    logInfo("Starting Listing Quality Score migration");

    // Check if collection already exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some((c) => c.name === "listingqualities");

    if (collectionExists) {
      logWarn("ListingQuality collection already exists, skipping creation");
      return { success: true, message: "Collection already exists" };
    }

    // Create indexes
    await ListingQuality.init();
    logInfo("ListingQuality indexes created");

    // Backfill quality scores for existing listings
    let backfillCount = 0;
    let errorCount = 0;

    try {
      const cars = await Car.find({ status: "active" }).limit(1000); // Limit to 1000 for initial backfill

      for (const car of cars) {
        try {
          const quality = await ListingQuality.create({
            car: car._id,
            dealer: car.dealer,
            overallScore: 0, // Will be calculated
            rating: "Poor",
            scoreBreakdown: {},
            recommendations: [],
          });

          // Calculate quality score
          await quality.calculateScore();

          backfillCount++;

          // Log progress every 50 listings
          if (backfillCount % 50 === 0) {
            logInfo("Backfill progress", { count: backfillCount });
          }
        } catch (err) {
          errorCount++;
          logWarn("Failed to backfill quality for car", { carId: car._id, error: err.message });
        }
      }

      logInfo("Backfilled quality scores for existing listings", {
        total: cars.length,
        success: backfillCount,
        errors: errorCount,
      });
    } catch (err) {
      logError("Failed to backfill quality scores", err);
    }

    logInfo("Listing Quality Score migration completed", { backfillCount, errorCount });

    return {
      success: true,
      message: "Migration completed successfully",
      stats: { backfillCount, errorCount },
    };
  } catch (err) {
    logError("Listing Quality Score migration failed", err);
    throw err;
  }
};

// =============================
// 🔄 ROLLBACK MIGRATION
// =============================

export const down = async () => {
  try {
    logInfo("Starting Listing Quality Score rollback");

    // Drop the collection
    await mongoose.connection.db.dropCollection("listingqualities");

    logInfo("ListingQuality collection dropped");

    return { success: true, message: "Rollback completed successfully" };
  } catch (err) {
    logError("Listing Quality Score rollback failed", err);
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
