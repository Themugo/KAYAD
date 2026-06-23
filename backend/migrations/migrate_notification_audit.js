// backend/migrations/migrate_notification_audit.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Database migration for Notification Reliability Tracking system
// Creates NotificationAudit collection and sets up indexes
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import NotificationAudit from "../models/NotificationAudit.js";
import Notification from "../models/Notification.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🚀 RUN MIGRATION
// =============================

export const up = async () => {
  try {
    logInfo("Starting Notification Reliability Tracking migration");

    // Check if collection already exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionExists = collections.some((c) => c.name === "notificationaudits");

    if (collectionExists) {
      logWarn("NotificationAudit collection already exists, skipping creation");
      return { success: true, message: "Collection already exists" };
    }

    // Create indexes
    await NotificationAudit.init();
    logInfo("NotificationAudit indexes created");

    // Backfill audit records for recent notifications
    let backfillCount = 0;
    try {
      const notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(500);

      for (const notification of notifications) {
        try {
          // Create audit record for each notification
          // Since we don't have historical delivery data, we'll mark them as queued
          await NotificationAudit.create({
            notificationId: notification._id,
            userId: notification.user,
            channel: "in_app", // Default to in-app for historical data
            type: notification.type,
            title: notification.title,
            message: notification.message,
            status: "queued",
            queuedAt: notification.createdAt,
            metadata: {
              backfilled: true,
              originalNotification: true,
            },
          });

          backfillCount++;

          // Log progress every 50 notifications
          if (backfillCount % 50 === 0) {
            logInfo("Backfill progress", { count: backfillCount });
          }
        } catch (err) {
          logWarn("Failed to backfill audit for notification", {
            notificationId: notification._id,
            error: err.message,
          });
        }
      }

      logInfo("Backfilled audit records for existing notifications", {
        total: notifications.length,
        success: backfillCount,
      });
    } catch (err) {
      logError("Failed to backfill audit records", err);
    }

    logInfo("Notification Reliability Tracking migration completed", { backfillCount });

    return {
      success: true,
      message: "Migration completed successfully",
      stats: { backfillCount },
    };
  } catch (err) {
    logError("Notification Reliability Tracking migration failed", err);
    throw err;
  }
};

// =============================
// 🔄 ROLLBACK MIGRATION
// =============================

export const down = async () => {
  try {
    logInfo("Starting Notification Reliability Tracking rollback");

    // Drop the collection
    await mongoose.connection.db.dropCollection("notificationaudits");

    logInfo("NotificationAudit collection dropped");

    return { success: true, message: "Rollback completed successfully" };
  } catch (err) {
    logError("Notification Reliability Tracking rollback failed", err);
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
