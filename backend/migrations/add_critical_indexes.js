// backend/migrations/add_critical_indexes.js - Database Migration
// ─────────────────────────────────────────────────────────────
// Migration script to add critical performance indexes
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

export const up = async () => {
  try {
    console.log("Starting critical indexes migration...");

    // =============================
    // 🔥 PROXYBID INDEXES (CRITICAL)
    // =============================
    console.log("Adding ProxyBid indexes...");
    await mongoose.connection.db.collection('proxybids').createIndex({ auctionId: 1, maxBid: -1 });
    console.log("✓ ProxyBid index: { auctionId: 1, maxBid: -1 }");
    
    await mongoose.connection.db.collection('proxybids').createIndex({ userId: 1, auctionId: 1 });
    console.log("✓ ProxyBid index: { userId: 1, auctionId: 1 }");
    
    await mongoose.connection.db.collection('proxybids').createIndex({ auctionId: 1, userId: 1, maxBid: -1 });
    console.log("✓ ProxyBid index: { auctionId: 1, userId: 1, maxBid: -1 }");

    // =============================
    // 🔥 NOTIFICATION INDEXES (HIGH PRIORITY)
    // =============================
    console.log("Adding Notification indexes...");
    await mongoose.connection.db.collection('notifications').createIndex({ user: 1, read: 1, createdAt: -1 });
    console.log("✓ Notification index: { user: 1, read: 1, createdAt: -1 }");

    // =============================
    // 🔥 ESCROW INDEXES (HIGH PRIORITY)
    // =============================
    console.log("Adding Escrow indexes...");
    await mongoose.connection.db.collection('escrows').createIndex({ status: 1, buyer: 1, createdAt: -1 });
    console.log("✓ Escrow index: { status: 1, buyer: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('escrows').createIndex({ status: 1, seller: 1, createdAt: -1 });
    console.log("✓ Escrow index: { status: 1, seller: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('escrows').createIndex({ status: 1, autoReleaseEligibleAt: 1 });
    console.log("✓ Escrow index: { status: 1, autoReleaseEligibleAt: 1 }");
    
    await mongoose.connection.db.collection('escrows').createIndex({ payment: 1, status: 1 });
    console.log("✓ Escrow index: { payment: 1, status: 1 }");

    console.log("✅ Critical indexes migration completed successfully");
  } catch (error) {
    console.error("❌ Critical indexes migration failed:", error);
    throw error;
  }
};

export const down = async () => {
  try {
    console.log("Rolling back critical indexes...");

    // Rollback ProxyBid indexes
    await mongoose.connection.db.collection('proxybids').dropIndex({ auctionId: 1, maxBid: -1 }).catch(() => {});
    console.log("✓ Dropped ProxyBid index: { auctionId: 1, maxBid: -1 }");
    
    await mongoose.connection.db.collection('proxybids').dropIndex({ userId: 1, auctionId: 1 }).catch(() => {});
    console.log("✓ Dropped ProxyBid index: { userId: 1, auctionId: 1 }");
    
    await mongoose.connection.db.collection('proxybids').dropIndex({ auctionId: 1, userId: 1, maxBid: -1 }).catch(() => {});
    console.log("✓ Dropped ProxyBid index: { auctionId: 1, userId: 1, maxBid: -1 }");

    // Rollback Notification index
    await mongoose.connection.db.collection('notifications').dropIndex({ user: 1, read: 1, createdAt: -1 }).catch(() => {});
    console.log("✓ Dropped Notification index: { user: 1, read: 1, createdAt: -1 }");

    // Rollback Escrow indexes
    await mongoose.connection.db.collection('escrows').dropIndex({ status: 1, buyer: 1, createdAt: -1 }).catch(() => {});
    console.log("✓ Dropped Escrow index: { status: 1, buyer: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('escrows').dropIndex({ status: 1, seller: 1, createdAt: -1 }).catch(() => {});
    console.log("✓ Dropped Escrow index: { status: 1, seller: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('escrows').dropIndex({ status: 1, autoReleaseEligibleAt: 1 }).catch(() => {});
    console.log("✓ Dropped Escrow index: { status: 1, autoReleaseEligibleAt: 1 }");
    
    await mongoose.connection.db.collection('escrows').dropIndex({ payment: 1, status: 1 }).catch(() => {});
    console.log("✓ Dropped Escrow index: { payment: 1, status: 1 }");

    console.log("✅ Critical indexes rollback completed successfully");
  } catch (error) {
    console.error("❌ Critical indexes rollback failed:", error);
    throw error;
  }
};
