// backend/models/DuplicateVehicleLog.js - Production Hardened v3.0
// ─────────────────────────────────────────────────────────────
// Duplicate vehicle detection log model
// Tracks duplicate detection events and admin review workflow
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const duplicateVehicleLogSchema = new mongoose.Schema(
  {
    // =============================
    // 🚗 LINKED VEHICLES
    // =============================
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true,
    },

    originalCar: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      index: true,
    },

    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =============================
    // 🔍 DETECTION CRITERIA
    // =============================
    detectionCriteria: {
      vin: {
        type: String,
        trim: true,
      },
      chassisNumber: {
        type: String,
        trim: true,
      },
      registrationNumber: {
        type: String,
        trim: true,
      },
      sellerPhone: {
        type: String,
        trim: true,
      },
      dealerAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // =============================
    // 📊 MATCH RESULTS
    // =============================
    matchType: {
      type: String,
      enum: ["exact_match", "partial_match", "potential_duplicate"],
      required: true,
      index: true,
    },

    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      index: true,
    },

    matchedCars: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Car",
      },
    ],

    matchDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // =============================
    // 📋 STATUS
    // =============================
    status: {
      type: String,
      enum: ["flagged", "under_review", "confirmed_duplicate", "false_positive", "resolved"],
      default: "flagged",
      index: true,
    },

    // =============================
    // 👮 ADMIN REVIEW
    // =============================
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: Date,

    reviewNotes: String,

    actionTaken: {
      type: String,
      enum: ["none", "removed", "merged", "allowed", "flagged_only"],
      default: "none",
    },

    // =============================
    // 💰 FRAUD IMPACT
    // =============================
    fraudScoreImpact: {
      type: Number,
      default: 0,
    },

    trustScoreImpact: {
      type: Number,
      default: 0,
    },

    originalFraudScore: {
      type: Number,
      default: 0,
    },

    originalTrustScore: {
      type: Number,
      default: 100,
    },

    // =============================
    // 📝 ADDITIONAL INFO
    // =============================
    detectionMethod: {
      type: String,
      enum: ["vin", "chassis", "registration", "phone", "dealer_similarity", "combined"],
      required: true,
    },

    similarityThreshold: {
      type: Number,
      default: 0.8,
    },

    isAutoResolved: {
      type: Boolean,
      default: false,
    },

    autoResolvedAt: Date,

    autoResolvedReason: String,
  },
  {
    timestamps: true,
  },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
duplicateVehicleLogSchema.index({ status: 1, createdAt: -1 });
duplicateVehicleLogSchema.index({ dealer: 1, status: 1 });
duplicateVehicleLogSchema.index({ matchType: 1, matchScore: -1 });
duplicateVehicleLogSchema.index({ detectionMethod: 1 });
duplicateVehicleLogSchema.index({ reviewedAt: -1 });
duplicateVehicleLogSchema.index({ "detectionCriteria.vin": 1 });
duplicateVehicleLogSchema.index({ "detectionCriteria.chassisNumber": 1 });
duplicateVehicleLogSchema.index({ "detectionCriteria.registrationNumber": 1 });

// =============================
// ⚡ METHOD: MARK AS REVIEWED
// =============================
duplicateVehicleLogSchema.methods.markAsReviewed = function (reviewerId, action, notes) {
  this.status = action === "allowed" ? "false_positive" : "confirmed_duplicate";
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.actionTaken = action;
  this.reviewNotes = notes;
  return this.save();
};

// =============================
// ⚡ METHOD: AUTO RESOLVE
// =============================
duplicateVehicleLogSchema.methods.autoResolve = function (reason) {
  this.status = "resolved";
  this.isAutoResolved = true;
  this.autoResolvedAt = new Date();
  this.autoResolvedReason = reason;
  return this.save();
};

// =============================
// ⚡ METHOD: GET MATCH SUMMARY
// =============================
duplicateVehicleLogSchema.methods.getMatchSummary = function () {
  return {
    matchType: this.matchType,
    matchScore: this.matchScore,
    matchedCarsCount: this.matchedCars.length,
    detectionMethod: this.detectionMethod,
    status: this.status,
    actionTaken: this.actionTaken,
  };
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const DuplicateVehicleLog = mongoose.models.DuplicateVehicleLog || mongoose.model("DuplicateVehicleLog", duplicateVehicleLogSchema);

export default DuplicateVehicleLog;
