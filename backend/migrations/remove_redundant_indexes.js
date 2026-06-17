// backend/migrations/remove_redundant_indexes.js - Database Migration
// ─────────────────────────────────────────────────────────────
// Migration script to remove redundant indexes
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

export const up = async () => {
  try {
    console.log("Starting redundant indexes removal migration...");

    // =============================
    // 🔥 CAR MODEL - REMOVE REDUNDANT SINGLE-FIELD INDEXES
    // =============================
    console.log("Checking Car model for redundant indexes...");
    
    // Check if redundant single-field indexes exist
    const carIndexes = await mongoose.connection.db.collection('cars').indexes();
    const carIndexNames = carIndexes.map(idx => idx.name);
    
    // Remove redundant single-field brand index (covered by compound index)
    if (carIndexNames.includes('brand_1')) {
      await mongoose.connection.db.collection('cars').dropIndex({ brand: 1 });
      console.log("✓ Removed redundant Car index: { brand: 1 }");
    } else {
      console.log("ℹ Car index { brand: 1 } not found, skipping");
    }
    
    // Remove redundant single-field year index (covered by compound index)
    if (carIndexNames.includes('year_1')) {
      await mongoose.connection.db.collection('cars').dropIndex({ year: 1 });
      console.log("✓ Removed redundant Car index: { year: 1 }");
    } else {
      console.log("ℹ Car index { year: 1 } not found, skipping");
    }

    // =============================
    // 🔥 BID MODEL - REMOVE REDUNDANT INDEX
    // =============================
    console.log("Checking Bid model for redundant indexes...");
    
    const bidIndexes = await mongoose.connection.db.collection('bids').indexes();
    const bidIndexNames = bidIndexes.map(idx => idx.name);
    
    // Remove redundant index (functionality covered by compound index)
    if (bidIndexNames.includes('carId_1_user_1_maxBid_1')) {
      await mongoose.connection.db.collection('bids').dropIndex({ carId: 1, user: 1, maxBid: 1 });
      console.log("✓ Removed redundant Bid index: { carId: 1, user: 1, maxBid: 1 }");
    } else {
      console.log("ℹ Bid index { carId: 1, user: 1, maxBid: 1 } not found, skipping");
    }

    // =============================
    // 🔥 PAYMENT MODEL - REMOVE REDUNDANT SINGLE-FIELD INDEXES
    // =============================
    console.log("Checking Payment model for redundant indexes...");
    
    const paymentIndexes = await mongoose.connection.db.collection('payments').indexes();
    const paymentIndexNames = paymentIndexes.map(idx => idx.name);
    
    // Remove redundant single-field referenceId index (covered by compound index)
    if (paymentIndexNames.includes('referenceId_1')) {
      await mongoose.connection.db.collection('payments').dropIndex({ referenceId: 1 });
      console.log("✓ Removed redundant Payment index: { referenceId: 1 }");
    } else {
      console.log("ℹ Payment index { referenceId: 1 } not found, skipping");
    }
    
    // Remove redundant single-field referenceModel index (covered by compound index)
    if (paymentIndexNames.includes('referenceModel_1')) {
      await mongoose.connection.db.collection('payments').dropIndex({ referenceModel: 1 });
      console.log("✓ Removed redundant Payment index: { referenceModel: 1 }");
    } else {
      console.log("ℹ Payment index { referenceModel_1 } not found, skipping");
    }

    console.log("✅ Redundant indexes removal migration completed successfully");
  } catch (error) {
    console.error("❌ Redundant indexes removal migration failed:", error);
    throw error;
  }
};

export const down = async () => {
  try {
    console.log("Rolling back redundant indexes removal (restoring indexes)...");

    // =============================
    // 🔥 RESTORE CAR MODEL INDEXES
    // =============================
    console.log("Restoring Car model indexes...");
    
    await mongoose.connection.db.collection('cars').createIndex({ brand: 1 });
    console.log("✓ Restored Car index: { brand: 1 }");
    
    await mongoose.connection.db.collection('cars').createIndex({ year: 1 });
    console.log("✓ Restored Car index: { year: 1 }");

    // =============================
    // 🔥 RESTORE BID MODEL INDEX
    // =============================
    console.log("Restoring Bid model index...");
    
    await mongoose.connection.db.collection('bids').createIndex({ carId: 1, user: 1, maxBid: 1 });
    console.log("✓ Restored Bid index: { carId: 1, user: 1, maxBid: 1 }");

    // =============================
    // 🔥 RESTORE PAYMENT MODEL INDEXES
    // =============================
    console.log("Restoring Payment model indexes...");
    
    await mongoose.connection.db.collection('payments').createIndex({ referenceId: 1 });
    console.log("✓ Restored Payment index: { referenceId: 1 }");
    
    await mongoose.connection.db.collection('payments').createIndex({ referenceModel: 1 });
    console.log("✓ Restored Payment index: { referenceModel: 1 }");

    console.log("✅ Redundant indexes rollback completed successfully");
  } catch (error) {
    console.error("❌ Redundant indexes rollback failed:", error);
    throw error;
  }
};
