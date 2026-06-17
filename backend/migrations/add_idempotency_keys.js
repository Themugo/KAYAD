// backend/migrations/add_idempotency_keys.js - Database Migration
// ─────────────────────────────────────────────────────────────
// Migration script to create IdempotencyKey collection
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import IdempotencyKey from "../models/IdempotencyKey.js";

/**
 * Up migration - Create IdempotencyKey collection and indexes
 */
export const up = async () => {
  try {
    console.log("Starting IdempotencyKey migration...");

    // Check if collection already exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some((col) => col.name === "idempotencykeys");

    if (collectionExists) {
      console.log("IdempotencyKey collection already exists, skipping creation");
      return;
    }

    // Create the collection
    await mongoose.connection.createCollection("idempotencykeys");
    console.log("IdempotencyKey collection created");

    // Create indexes
    await IdempotencyKey.createIndexes();
    console.log("IdempotencyKey indexes created");

    // Verify indexes
    const indexes = await IdempotencyKey.collection.getIndexes();
    console.log("IdempotencyKey indexes verified:", Object.keys(indexes));

    console.log("IdempotencyKey migration completed successfully");
  } catch (error) {
    console.error("IdempotencyKey migration failed:", error);
    throw error;
  }
};

/**
 * Down migration - Drop IdempotencyKey collection
 */
export const down = async () => {
  try {
    console.log("Rolling back IdempotencyKey migration...");

    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some((col) => col.name === "idempotencykeys");

    if (!collectionExists) {
      console.log("IdempotencyKey collection does not exist, skipping rollback");
      return;
    }

    // Drop the collection
    await mongoose.connection.dropCollection("idempotencykeys");
    console.log("IdempotencyKey collection dropped");

    console.log("IdempotencyKey rollback completed successfully");
  } catch (error) {
    console.error("IdempotencyKey rollback failed:", error);
    throw error;
  }
};

/**
 * Run migration if executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const action = process.argv[2] || "up";

  mongoose
    .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kayad")
    .then(async () => {
      console.log("Connected to MongoDB");

      if (action === "up") {
        await up();
      } else if (action === "down") {
        await down();
      } else {
        console.error("Invalid action. Use 'up' or 'down'");
        process.exit(1);
      }

      await mongoose.connection.close();
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
