// backend/migrations/create_archive_collections.js - Database Migration
// ─────────────────────────────────────────────────────────────
// Migration script to create archive collections for data retention
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

export const up = async () => {
  try {
    console.log("Starting archive collections migration...");

    // =============================
    // 🔥 CREATE ARCHIVE COLLECTIONS
    // =============================
    const collections = [
      "cars_archived",
      "bids_archived",
      "payments_archived",
      "escrows_archived",
      "chats_archived",
      "leads_archived",
      "notifications_archived",
    ];

    for (const collection of collections) {
      const exists = await mongoose.connection.db
        .listCollections()
        .toArray()
        .then((cols) => cols.some((col) => col.name === collection));

      if (!exists) {
        await mongoose.connection.createCollection(collection);
        console.log(`✓ Created archive collection: ${collection}`);
      } else {
        console.log(`ℹ Archive collection already exists: ${collection}`);
      }
    }

    // =============================
    // 🔥 ADD TTL INDEXES FOR AUTOMATIC CLEANUP
    // =============================
    console.log("Adding TTL indexes for automatic cleanup...");

    // Notifications archived - 1 year retention
    await mongoose.connection.db
      .collection("notifications_archived")
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60, name: "notifications_archived_ttl" });
    console.log("✓ Added TTL index to notifications_archived (1 year retention)");

    // =============================
    // 🔥 COPY INDEXES FROM PRIMARY COLLECTIONS
    // =============================
    console.log("Copying indexes from primary collections to archive collections...");

    // Copy Car indexes to cars_archived
    const carIndexes = await mongoose.connection.db.collection("cars").indexes();
    for (const index of carIndexes) {
      if (index.name !== "_id_") {
        try {
          await mongoose.connection.db.collection("cars_archived").createIndex(index.key, { name: index.name });
          console.log(`✓ Copied Car index to cars_archived: ${index.name}`);
        } catch (err) {
          console.log(`ℹ Index ${index.name} may already exist in cars_archived`);
        }
      }
    }

    // Copy Bid indexes to bids_archived
    const bidIndexes = await mongoose.connection.db.collection("bids").indexes();
    for (const index of bidIndexes) {
      if (index.name !== "_id_") {
        try {
          await mongoose.connection.db.collection("bids_archived").createIndex(index.key, { name: index.name });
          console.log(`✓ Copied Bid index to bids_archived: ${index.name}`);
        } catch (err) {
          console.log(`ℹ Index ${index.name} may already exist in bids_archived`);
        }
      }
    }

    // Copy Payment indexes to payments_archived
    const paymentIndexes = await mongoose.connection.db.collection("payments").indexes();
    for (const index of paymentIndexes) {
      if (index.name !== "_id_") {
        try {
          await mongoose.connection.db.collection("payments_archived").createIndex(index.key, { name: index.name });
          console.log(`✓ Copied Payment index to payments_archived: ${index.name}`);
        } catch (err) {
          console.log(`ℹ Index ${index.name} may already exist in payments_archived`);
        }
      }
    }

    // Copy Escrow indexes to escrows_archived
    const escrowIndexes = await mongoose.connection.db.collection("escrows").indexes();
    for (const index of escrowIndexes) {
      if (index.name !== "_id_") {
        try {
          await mongoose.connection.db.collection("escrows_archived").createIndex(index.key, { name: index.name });
          console.log(`✓ Copied Escrow index to escrows_archived: ${index.name}`);
        } catch (err) {
          console.log(`ℹ Index ${index.name} may already exist in escrows_archived`);
        }
      }
    }

    // Copy Chat indexes to chats_archived
    const chatIndexes = await mongoose.connection.db.collection("chats").indexes();
    for (const index of chatIndexes) {
      if (index.name !== "_id_") {
        try {
          await mongoose.connection.db.collection("chats_archived").createIndex(index.key, { name: index.name });
          console.log(`✓ Copied Chat index to chats_archived: ${index.name}`);
        } catch (err) {
          console.log(`ℹ Index ${index.name} may already exist in chats_archived`);
        }
      }
    }

    // Copy Lead indexes to leads_archived
    const leadIndexes = await mongoose.connection.db.collection("leads").indexes();
    for (const index of leadIndexes) {
      if (index.name !== "_id_") {
        try {
          await mongoose.connection.db.collection("leads_archived").createIndex(index.key, { name: index.name });
          console.log(`✓ Copied Lead index to leads_archived: ${index.name}`);
        } catch (err) {
          console.log(`ℹ Index ${index.name} may already exist in leads_archived`);
        }
      }
    }

    console.log("✅ Archive collections migration completed successfully");
  } catch (error) {
    console.error("❌ Archive collections migration failed:", error);
    throw error;
  }
};

export const down = async () => {
  try {
    console.log("Rolling back archive collections migration...");

    // =============================
    // 🔥 DROP ARCHIVE COLLECTIONS
    // =============================
    const collections = [
      "cars_archived",
      "bids_archived",
      "payments_archived",
      "escrows_archived",
      "chats_archived",
      "leads_archived",
      "notifications_archived",
    ];

    for (const collection of collections) {
      try {
        await mongoose.connection.dropCollection(collection);
        console.log(`✓ Dropped archive collection: ${collection}`);
      } catch (err) {
        if (err.message.includes("ns not found")) {
          console.log(`ℹ Archive collection not found: ${collection}`);
        } else {
          throw err;
        }
      }
    }

    console.log("✅ Archive collections rollback completed successfully");
  } catch (error) {
    console.error("❌ Archive collections rollback failed:", error);
    throw error;
  }
};
