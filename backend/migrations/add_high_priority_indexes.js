// backend/migrations/add_high_priority_indexes.js - Database Migration
// ─────────────────────────────────────────────────────────────
// Migration script to add high priority performance indexes
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

export const up = async () => {
  try {
    console.log("Starting high priority indexes migration...");

    // =============================
    // 🔥 DISPUTE INDEXES (HIGH PRIORITY)
    // =============================
    console.log("Adding Dispute indexes...");
    await mongoose.connection.db.collection('disputes').createIndex({ status: 1, openedBy: 1, createdAt: -1 });
    console.log("✓ Dispute index: { status: 1, openedBy: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('disputes').createIndex({ status: 1, category: 1, createdAt: -1 });
    console.log("✓ Dispute index: { status: 1, category: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('disputes').createIndex({ escrow: 1, status: 1 });
    console.log("✓ Dispute index: { escrow: 1, status: 1 }");

    // =============================
    // 🔥 MPESA TRANSACTION INDEXES (HIGH PRIORITY)
    // =============================
    console.log("Adding MpesaTransaction indexes...");
    await mongoose.connection.db.collection('mpesatransactions').createIndex({ user: 1, status: 1, createdAt: -1 });
    console.log("✓ MpesaTransaction index: { user: 1, status: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('mpesatransactions').createIndex({ phone: 1, status: 1, createdAt: -1 });
    console.log("✓ MpesaTransaction index: { phone: 1, status: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('mpesatransactions').createIndex({ carId: 1, status: 1 });
    console.log("✓ MpesaTransaction index: { carId: 1, status: 1 }");
    
    await mongoose.connection.db.collection('mpesatransactions').createIndex({ bidId: 1, status: 1 });
    console.log("✓ MpesaTransaction index: { bidId: 1, status: 1 }");

    // =============================
    // 🔥 AUCTION INDEXES (MEDIUM PRIORITY)
    // =============================
    console.log("Adding Auction indexes...");
    await mongoose.connection.db.collection('auctions').createIndex({ status: 1, endTime: 1, startTime: -1 });
    console.log("✓ Auction index: { status: 1, endTime: 1, startTime: -1 }");
    
    await mongoose.connection.db.collection('auctions').createIndex({ status: 1, paymentDeadline: 1 });
    console.log("✓ Auction index: { status: 1, paymentDeadline: 1 }");
    
    await mongoose.connection.db.collection('auctions').createIndex({ carId: 1, status: 1 });
    console.log("✓ Auction index: { carId: 1, status: 1 }");

    // =============================
    // 🔥 CHAT INDEXES (MEDIUM PRIORITY)
    // =============================
    console.log("Adding Chat indexes...");
    await mongoose.connection.db.collection('chats').createIndex({ participants: 1, updatedAt: -1 });
    console.log("✓ Chat index: { participants: 1, updatedAt: -1 }");
    
    await mongoose.connection.db.collection('chats').createIndex({ car: 1, participants: 1 });
    console.log("✓ Chat index: { car: 1, participants: 1 }");

    // =============================
    // 🔥 USER INDEXES (LOW PRIORITY)
    // =============================
    console.log("Adding User indexes...");
    await mongoose.connection.db.collection('users').createIndex({ role: 1, status: 1, createdAt: -1 });
    console.log("✓ User index: { role: 1, status: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('users').createIndex({ role: 1, isBanned: 1, createdAt: -1 });
    console.log("✓ User index: { role: 1, isBanned: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('users').createIndex({ referredBy: 1, createdAt: -1 });
    console.log("✓ User index: { referredBy: 1, createdAt: -1 }");

    // =============================
    // 🔥 LEAD INDEXES (MEDIUM PRIORITY)
    // =============================
    console.log("Adding Lead indexes...");
    await mongoose.connection.db.collection('leads').createIndex({ dealer: 1, isArchived: 1, stage: 1 });
    console.log("✓ Lead index: { dealer: 1, isArchived: 1, stage: 1 }");

    console.log("✅ High priority indexes migration completed successfully");
  } catch (error) {
    console.error("❌ High priority indexes migration failed:", error);
    throw error;
  }
};

export const down = async () => {
  try {
    console.log("Rolling back high priority indexes...");

    // Rollback Dispute indexes
    await mongoose.connection.db.collection('disputes').dropIndex({ status: 1, openedBy: 1, createdAt: -1 }).catch(() => {});
    console.log("✓ Dropped Dispute index: { status: 1, openedBy: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('disputes').dropIndex({ status: 1, category: 1, createdAt: -1 }).catch(() => {});
    console.log("✓ Dropped Dispute index: { status: 1, category: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('disputes').dropIndex({ escrow: 1, status: 1 }).catch(() => {});
    console.log("✓ Dropped Dispute index: { escrow: 1, status: 1 }");

    // Rollback MpesaTransaction indexes
    await mongoose.connection.db.collection('mpesatransactions').dropIndex({ user: 1, status: 1, createdAt: -1 }).catch(() => {});
    console.log("✓ Dropped MpesaTransaction index: { user: 1, status: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('mpesatransactions').dropIndex({ phone: 1, status: 1, createdAt: -1 }).catch(() => {});
    console.log("✓ Dropped MpesaTransaction index: { phone: 1, status: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('mpesatransactions').dropIndex({ carId: 1, status: 1 }).catch(() => {});
    console.log("✓ Dropped MpesaTransaction index: { carId: 1, status: 1 }");
    
    await mongoose.connection.db.collection('mpesatransactions').dropIndex({ bidId: 1, status: 1 }).catch(() => {});
    console.log("✓ Dropped MpesaTransaction index: { bidId: 1, status: 1 }");

    // Rollback Auction indexes
    await mongoose.connection.db.collection('auctions').dropIndex({ status: 1, endTime: 1, startTime: -1 }).catch(() => {});
    console.log("✓ Dropped Auction index: { status: 1, endTime: 1, startTime: -1 }");
    
    await mongoose.connection.db.collection('auctions').dropIndex({ status: 1, paymentDeadline: 1 }).catch(() => {});
    console.log("✓ Dropped Auction index: { status: 1, paymentDeadline: 1 }");
    
    await mongoose.connection.db.collection('auctions').dropIndex({ carId: 1, status: 1 }).catch(() => {});
    console.log("✓ Dropped Auction index: { carId: 1, status: 1 }");

    // Rollback Chat indexes
    await mongoose.connection.db.collection('chats').dropIndex({ participants: 1, updatedAt: -1 }).catch(() => {});
    console.log("✓ Dropped Chat index: { participants: 1, updatedAt: -1 }");
    
    await mongoose.connection.db.collection('chats').dropIndex({ car: 1, participants: 1 }).catch(() => {});
    console.log("✓ Dropped Chat index: { car: 1, participants: 1 }");

    // Rollback User indexes
    await mongoose.connection.db.collection('users').dropIndex({ role: 1, status: 1, createdAt: -1 }).catch(() => {});
    console.log("✓ Dropped User index: { role: 1, status: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('users').dropIndex({ role: 1, isBanned: 1, createdAt: -1 }).catch(() => {});
    console.log("✓ Dropped User index: { role: 1, isBanned: 1, createdAt: -1 }");
    
    await mongoose.connection.db.collection('users').dropIndex({ referredBy: 1, createdAt: -1 }).catch(() => {});
    console.log("✓ Dropped User index: { referredBy: 1, createdAt: -1 }");

    // Rollback Lead indexes
    await mongoose.connection.db.collection('leads').dropIndex({ dealer: 1, isArchived: 1, stage: 1 }).catch(() => {});
    console.log("✓ Dropped Lead index: { dealer: 1, isArchived: 1, stage: 1 }");

    console.log("✅ High priority indexes rollback completed successfully");
  } catch (error) {
    console.error("❌ High priority indexes rollback failed:", error);
    throw error;
  }
};
