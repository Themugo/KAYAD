// backend/migrations/migrate_dealer_verification.js
// ─────────────────────────────────────────────────────────────
// Migration script to migrate existing approved dealers to new verification system
// Backwards compatible migration - auto-approves existing dealers
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import Dealer from "../models/Dealer.js";
import DealerVerification from "../models/DealerVerification.js";
import User from "../models/User.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

const migrateDealers = async () => {
  try {
    logInfo("Starting dealer verification migration...");

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
      logInfo("Connected to MongoDB");
    }

    // Find all approved dealers
    const approvedDealers = await Dealer.find({ approved: true });
    logInfo(`Found ${approvedDealers.length} approved dealers to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const dealer of approvedDealers) {
      try {
        // Check if verification already exists
        const existingVerification = await DealerVerification.findOne({ user: dealer.user });
        if (existingVerification) {
          logWarn(`Verification already exists for dealer ${dealer._id}, skipping`);
          skippedCount++;
          continue;
        }

        // Create verification record with approved status
        const verification = await DealerVerification.create({
          user: dealer.user,
          dealer: dealer._id,
          verificationStatus: "approved",
          submittedAt: dealer.verifiedAt || dealer.createdAt || new Date(),
          reviewedAt: dealer.verifiedAt || new Date(),
          documents: {
            // Mark all documents as verified with legacy flag
            governmentId: {
              type: "national_id",
              documentUrl: "",
              documentNumber: "LEGACY_MIGRATION",
              issuedDate: dealer.createdAt,
              verified: true,
              verifiedAt: dealer.verifiedAt || new Date(),
              verifiedBy: null, // System migration
            },
            kraPin: {
              pinNumber: "LEGACY_MIGRATION",
              documentUrl: "",
              verified: true,
              verifiedAt: dealer.verifiedAt || new Date(),
              verifiedBy: null,
            },
            businessRegistration: {
              registrationNumber: "LEGACY_MIGRATION",
              documentUrl: "",
              businessName: dealer.businessName || "Legacy Business",
              registeredDate: dealer.createdAt,
              verified: true,
              verifiedAt: dealer.verifiedAt || new Date(),
              verifiedBy: null,
            },
            physicalAddress: {
              street: dealer.location || "Legacy Address",
              city: "Kenya",
              postalCode: "",
              country: "Kenya",
              proofUrl: "",
              proofType: "utility_bill",
              verified: true,
              verifiedAt: dealer.verifiedAt || new Date(),
              verifiedBy: null,
            },
            phoneVerification: {
              phoneNumber: "",
              verified: true,
              verifiedAt: dealer.verifiedAt || new Date(),
            },
          },
          adminNotes: "Migrated from legacy approval system - auto-approved",
          isLegacyMigration: true,
        });

        // Update user status to approved
        await User.findByIdAndUpdate(dealer.user, { status: "approved" });

        migratedCount++;
        logInfo(`Migrated dealer ${dealer._id} to verification system`);
      } catch (err) {
        errorCount++;
        logError(`Failed to migrate dealer ${dealer._id}`, err);
      }
    }

    // Add verificationStatus field to Dealer model for new dealers
    // This is a no-op if the field already exists (MongoDB schema flexibility)
    logInfo("Migration summary:", {
      total: approvedDealers.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
    });

    logInfo("Dealer verification migration completed successfully");
    process.exit(0);
  } catch (err) {
    logError("Migration failed", err);
    process.exit(1);
  }
};

// Run migration
migrateDealers();
