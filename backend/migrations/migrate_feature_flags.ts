// backend/migrations/migrate_feature_flags.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Database migration for Enterprise Feature Flags system
// Creates FeatureFlag collection and seeds default flags
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import FeatureFlag from "../models/FeatureFlag.ts";
import { logInfo, logError, logWarn } from "../utils/logger.ts";

// =============================
// 🚀 RUN MIGRATION
// =============================

export const up = async () => {
  try {
    logInfo("Starting Enterprise Feature Flags migration");

    // Check if collection already exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some((c) => c.name === "featureflags");

    if (collectionExists) {
      logWarn("FeatureFlag collection already exists, skipping creation");
      return { success: true, message: "Collection already exists" };
    }

    // Create indexes
    await FeatureFlag.init();
    logInfo("FeatureFlag indexes created");

    // Seed default flags (all enabled to maintain backwards compatibility)
    const defaultFlags = [
      {
        key: "auctions_enabled",
        name: "Auctions Enabled",
        description: "Enable/disable auction functionality",
        type: "boolean",
        enabled: true,
        defaultValue: true,
        environments: ["development", "staging", "production"],
        category: "auctions",
        priority: "high",
        tags: ["core", "stable"],
      },
      {
        key: "escrow_enabled",
        name: "Escrow Enabled",
        description: "Enable/disable escrow functionality",
        type: "boolean",
        enabled: true,
        defaultValue: true,
        environments: ["development", "staging", "production"],
        category: "escrow",
        priority: "high",
        tags: ["core", "stable"],
      },
      {
        key: "ntsa_verification_enabled",
        name: "NTSA Verification Enabled",
        description: "Enable/disable NTSA verification integration",
        type: "boolean",
        enabled: true,
        defaultValue: true,
        environments: ["development", "staging", "production"],
        category: "ntsa",
        priority: "medium",
        tags: ["integration", "stable"],
      },
      {
        key: "ai_valuation_enabled",
        name: "AI Valuation Enabled",
        description: "Enable/disable AI valuation feature",
        type: "boolean",
        enabled: false,
        defaultValue: false,
        environments: ["development", "staging", "production"],
        category: "ai_valuation",
        priority: "medium",
        tags: ["experimental", "beta"],
      },
      {
        key: "dealer_crm_enabled",
        name: "Dealer CRM Enabled",
        description: "Enable/disable Dealer CRM feature",
        type: "boolean",
        enabled: false,
        defaultValue: false,
        environments: ["development", "staging", "production"],
        category: "crm",
        priority: "medium",
        tags: ["experimental", "beta"],
      },
      {
        key: "new_ui_experiment",
        name: "New UI Experiment",
        description: "A/B test for new UI design",
        type: "percentage",
        enabled: true,
        defaultValue: true,
        percentage: 10,
        rolloutStrategy: "user_id_hash",
        environments: ["development", "staging", "production"],
        category: "experiments",
        priority: "low",
        tags: ["experiment", "ab_test"],
      },
    ];

    let seededCount = 0;
    for (const flagData of defaultFlags) {
      try {
        await FeatureFlag.create(flagData);
        seededCount++;
        logInfo("Feature flag seeded", { key: flagData.key });
      } catch (err) {
        logWarn("Failed to seed feature flag", { key: flagData.key, error: err.message });
      }
    }

    logInfo("Enterprise Feature Flags migration completed", { seededCount });

    return {
      success: true,
      message: "Migration completed successfully",
      stats: { seededCount },
    };
  } catch (err) {
    logError("Enterprise Feature Flags migration failed", err);
    throw err;
  }
};

// =============================
// 🔄 ROLLBACK MIGRATION
// =============================

export const down = async () => {
  try {
    logInfo("Starting Enterprise Feature Flags rollback");

    // Drop the collection
    await mongoose.connection.db.dropCollection("featureflags");

    logInfo("FeatureFlag collection dropped");

    return { success: true, message: "Rollback completed successfully" };
  } catch (err) {
    logError("Enterprise Feature Flags rollback failed", err);
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
