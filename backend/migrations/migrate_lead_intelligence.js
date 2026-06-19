// backend/migrations/migrate_lead_intelligence.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Database migration for Lead Intelligence system
// Creates Lead and LeadActivity collections and backfills existing data
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import LeadActivity from "../models/LeadActivity.js";
import Chat from "../models/Chat.js";
import Auction from "../models/Auction.js";
import Escrow from "../models/Escrow.js";
import Car from "../models/Car.js";
import { createLead } from "../services/leadService.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🚀 RUN MIGRATION
// =============================

export const up = async () => {
  try {
    logInfo("Starting Lead Intelligence migration");

    // Check if collections already exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    const leadCollectionExists = collections.some((c) => c.name === "leads");
    const leadActivityCollectionExists = collections.some((c) => c.name === "leadactivities");

    if (leadCollectionExists && leadActivityCollectionExists) {
      logWarn("Lead collections already exist, skipping creation");
      return { success: true, message: "Collections already exist" };
    }

    // Create indexes
    await Lead.init();
    await LeadActivity.init();
    logInfo("Lead indexes created");

    // Backfill existing chats as leads
    let chatLeadCount = 0;
    try {
      const chats = await Chat.find({ car: { $ne: null } }).populate("car");

      for (const chat of chats) {
        try {
          const buyerId = chat.participants.find((p) => p.toString() !== chat.car.dealer?.toString());
          const dealerId = chat.car.dealer;
          const vehicleId = chat.car._id;

          if (buyerId && dealerId) {
            await createLead(buyerId, dealerId, vehicleId, "chat", chat._id);
            chatLeadCount++;
          }
        } catch (err) {
          logError("Failed to create lead from chat", err, { chatId: chat._id });
        }
      }

      logInfo("Backfilled chat leads", { count: chatLeadCount });
    } catch (err) {
      logError("Failed to backfill chat leads", err);
    }

    // Backfill existing auctions as leads
    let auctionLeadCount = 0;
    try {
      const auctions = await Auction.find({ status: "completed" }).populate("carId");

      for (const auction of auctions) {
        try {
          if (auction.winner && auction.carId) {
            const vehicle = await Car.findById(auction.carId);
            if (vehicle && vehicle.dealer) {
              await createLead(auction.winner.userId, vehicle.dealer, vehicle._id, "auction", auction._id);
              auctionLeadCount++;
            }
          }
        } catch (err) {
          logError("Failed to create lead from auction", err, { auctionId: auction._id });
        }
      }

      logInfo("Backfilled auction leads", { count: auctionLeadCount });
    } catch (err) {
      logError("Failed to backfill auction leads", err);
    }

    // Backfill existing escrows as leads
    let escrowLeadCount = 0;
    try {
      const escrows = await Escrow.find({ status: { $in: ["held", "released"] } }).populate("car");

      for (const escrow of escrows) {
        try {
          await createLead(escrow.buyer, escrow.seller, escrow.car?._id, "chat", null);
          escrowLeadCount++;
        } catch (err) {
          logError("Failed to create lead from escrow", err, { escrowId: escrow._id });
        }
      }

      logInfo("Backfilled escrow leads", { count: escrowLeadCount });
    } catch (err) {
      logError("Failed to backfill escrow leads", err);
    }

    logInfo("Lead Intelligence migration completed", {
      chatLeads: chatLeadCount,
      auctionLeads: auctionLeadCount,
      escrowLeads: escrowLeadCount,
      total: chatLeadCount + auctionLeadCount + escrowLeadCount,
    });

    return {
      success: true,
      message: "Migration completed successfully",
      stats: {
        chatLeads: chatLeadCount,
        auctionLeads: auctionLeadCount,
        escrowLeads: escrowLeadCount,
        total: chatLeadCount + auctionLeadCount + escrowLeadCount,
      },
    };
  } catch (err) {
    logError("Lead Intelligence migration failed", err);
    throw err;
  }
};

// =============================
// 🔄 ROLLBACK MIGRATION
// =============================

export const down = async () => {
  try {
    logInfo("Starting Lead Intelligence rollback");

    // Drop the collections
    await mongoose.connection.db.dropCollection("leads");
    await mongoose.connection.db.dropCollection("leadactivities");

    logInfo("Lead Intelligence collections dropped");

    return { success: true, message: "Rollback completed successfully" };
  } catch (err) {
    logError("Lead Intelligence rollback failed", err);
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
