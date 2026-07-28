// backend/scripts/migrateImages.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Image migration script
// Batch processes existing images to generate variants and optimize storage
// ─────────────────────────────────────────────────────────────

import { runMigration, getMigrationStatus } from "../services/imageMigrationService.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 🚀 RUN MIGRATION
// =============================

const run = async () => {
  try {
    logInfo("Starting image migration script");

    // Run migration with options
    const result = await runMigration({
      batchSize: 10,
      limit: null, // Process all images
      dryRun: false, // Actually perform migration
    });

    logInfo("Migration completed", result);

    console.log("\n=== Migration Summary ===");
    console.log(`Total images: ${result.total}`);
    console.log(`Processed: ${result.processed}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Duration: ${result.endTime - result.startTime}ms`);

    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`);
      result.errors.forEach((err, i) => {
        console.log(`${i + 1}. Car: ${err.carId}, Error: ${err.error}`);
      });
    }

    process.exit(0);
  } catch (err) {
    logError("Migration script failed", err);
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
};

// =============================
// 🚀 START
// =============================

run();
