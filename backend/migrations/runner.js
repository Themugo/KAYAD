// backend/migrations/runner.js - Migration Runner (Phase 5 Enhancement)
// ─────────────────────────────────────────────────────────────
// Enhanced runner to execute migrations with tracking
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import Migration from "./Migration.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/kayad";

async function runMigration(migrationName, direction = "up") {
  const startTime = Date.now();
  try {
    console.log(`\n🚀 Running migration: ${migrationName} (${direction})`);

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Check if migration already exists
    const existingMigration = await Migration.findOne({ name: migrationName });
    
    if (direction === "up" && existingMigration) {
      console.log(`⚠️  Migration ${migrationName} already executed at ${existingMigration.executedAt}`);
      console.log("Skipping...");
      return;
    }

    if (direction === "down" && !existingMigration) {
      console.log(`⚠️  Migration ${migrationName} has not been executed`);
      console.log("Skipping...");
      return;
    }

    // Import and run migration
    const migration = await import(`./${migrationName}.js`);
    await migration[direction]();

    // Track migration execution
    if (direction === "up") {
      await Migration.create({
        name: migrationName,
        executedAt: new Date(),
        duration: Date.now() - startTime,
      });
      console.log(`✅ Migration ${migrationName} tracked in database`);
    } else if (direction === "down") {
      await Migration.deleteOne({ name: migrationName });
      console.log(`✅ Migration ${migrationName} removed from tracking`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Migration ${migrationName} (${direction}) completed successfully in ${duration}ms`);
  } catch (error) {
    console.error(`❌ Migration ${migrationName} (${direction}) failed:`, error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
  }
}

async function listMigrations() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    const migrations = await Migration.find().sort({ executedAt: 1 });
    console.log("\n📋 Executed Migrations:");
    migrations.forEach((m) => {
      console.log(`  - ${m.name} (executed at ${m.executedAt.toISOString()}, duration: ${m.duration}ms)`);
    });

    if (migrations.length === 0) {
      console.log("  No migrations executed yet");
    }
  } catch (error) {
    console.error("❌ Failed to list migrations:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
  }
}

// Get migration name and direction from command line args
const migrationName = process.argv[2];
const direction = process.argv[3] || "up";

if (migrationName === "list") {
  listMigrations();
} else if (!migrationName) {
  console.error("Usage: node runner.js <migration-name> [up|down]");
  console.error("       node runner.js list");
  console.error("Example: node runner.js add_critical_indexes up");
  process.exit(1);
} else {
  runMigration(migrationName, direction);
}
