// backend/migrations/runner.js - Migration Runner
// ─────────────────────────────────────────────────────────────
// Simple runner to execute migrations
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/kayad";

async function runMigration(migrationName, direction = 'up') {
  try {
    console.log(`\n🚀 Running migration: ${migrationName} (${direction})`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Import and run migration
    const migration = await import(`./${migrationName}.js`);
    await migration[direction]();
    
    console.log(`✅ Migration ${migrationName} (${direction}) completed successfully`);
  } catch (error) {
    console.error(`❌ Migration ${migrationName} (${direction}) failed:`, error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
  }
}

// Get migration name and direction from command line args
const migrationName = process.argv[2];
const direction = process.argv[3] || 'up';

if (!migrationName) {
  console.error("Usage: node runner.js <migration-name> [up|down]");
  console.error("Example: node runner.js add_critical_indexes up");
  process.exit(1);
}

runMigration(migrationName, direction);
