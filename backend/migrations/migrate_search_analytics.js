// backend/migrations/migrate_search_analytics.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Database migration for Search Intelligence system
// Creates SearchAnalytics collection and backfills historical data
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import SearchAnalytics from "../models/SearchAnalytics.js";
import SavedSearch from "../models/SavedSearch.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🚀 RUN MIGRATION
// =============================

export const up = async () => {
  try {
    logInfo("Starting Search Intelligence migration");

    // Check if collection already exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some((c) => c.name === "searchanalytics");

    if (collectionExists) {
      logWarn("SearchAnalytics collection already exists, skipping creation");
      return { success: true, message: "Collection already exists" };
    }

    // Create indexes
    await SearchAnalytics.init();
    logInfo("SearchAnalytics indexes created");

    // Backfill historical data from SavedSearch
    let backfillCount = 0;
    try {
      const savedSearches = await SavedSearch.find({}).lean();

      for (const savedSearch of savedSearches) {
        try {
          const filters = savedSearch.filters || {};

          await SearchAnalytics.create({
            searchTerm: savedSearch.name,
            normalizedTerm: savedSearch.name.toLowerCase().trim(),
            filters: {
              brand: filters.brand,
              model: filters.model,
              year: filters.year,
              price: filters.price,
              location: filters.location,
              county: filters.county,
              bodyType: filters.bodyType,
              fuelType: filters.fuelType,
              transmission: filters.transmission,
              mileage: filters.mileage,
            },
            userId: savedSearch.user,
            searchType: "saved_search",
            category: "all",
            resultCount: 0, // Unknown for historical data
            hasResults: false, // Unknown for historical data
            searchCount: 1, // Assume 1 search
            lastSearchedAt: savedSearch.createdAt,
            createdAt: savedSearch.createdAt,
          });

          backfillCount++;
        } catch (err) {
          logWarn("Failed to backfill saved search", { savedSearchId: savedSearch._id, error: err.message });
        }
      }

      logInfo("Backfilled historical search data", { count: backfillCount });
    } catch (err) {
      logError("Failed to backfill historical search data", err);
    }

    logInfo("Search Intelligence migration completed", { backfillCount });

    return {
      success: true,
      message: "Migration completed successfully",
      stats: { backfillCount },
    };
  } catch (err) {
    logError("Search Intelligence migration failed", err);
    throw err;
  }
};

// =============================
// 🔄 ROLLBACK MIGRATION
// =============================

export const down = async () => {
  try {
    logInfo("Starting Search Intelligence rollback");

    // Drop the collection
    await mongoose.connection.db.dropCollection("searchanalytics");

    logInfo("SearchAnalytics collection dropped");

    return { success: true, message: "Rollback completed successfully" };
  } catch (err) {
    logError("Search Intelligence rollback failed", err);
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
