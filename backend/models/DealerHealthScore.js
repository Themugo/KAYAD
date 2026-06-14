// backend/models/DealerHealthScore.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Dealer Health Score model
// Comprehensive trust and reputation scoring system for dealers
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const dealerHealthScoreSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 LINKED DEALER
    // =============================
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // =============================
    // 📊 OVERALL SCORE
    // =============================
    healthScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },

    scoreCategory: {
      type: String,
      enum: ["platinum", "gold", "silver", "warning", "high_risk"],
      index: true,
    },

    // =============================
    // 📈 FACTOR SCORES
    // =============================
    verificationScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    accountAgeScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    transactionScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    escrowScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    reviewScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    fraudScore: {
      type: Number,
      default: 0,
      min: -100,
      max: 0,
    },

    responseScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    listingQualityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    auctionScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // =============================
    // 📋 FACTOR DETAILS
    // =============================
    verificationDetails: {
      governmentIdVerified: { type: Boolean, default: false },
      kraPinVerified: { type: Boolean, default: false },
      businessRegistrationVerified: { type: Boolean, default: false },
      physicalAddressVerified: { type: Boolean, default: false },
      phoneVerified: { type: Boolean, default: false },
      completeness: { type: Number, default: 0, min: 0, max: 100 },
    },

    accountAgeDetails: {
      accountCreatedAt: Date,
      accountAgeDays: { type: Number, default: 0 },
      score: { type: Number, default: 0, min: 0, max: 100 },
    },

    transactionDetails: {
      totalTransactions: { type: Number, default: 0 },
      successfulTransactions: { type: Number, default: 0 },
      failedTransactions: { type: Number, default: 0 },
      successRate: { type: Number, default: 0, min: 0, max: 100 },
      totalRevenue: { type: Number, default: 0 },
      volumeScore: { type: Number, default: 0, min: 0, max: 100 },
      consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    },

    escrowDetails: {
      totalEscrows: { type: Number, default: 0 },
      releasedEscrows: { type: Number, default: 0 },
      disputedEscrows: { type: Number, default: 0 },
      refundedEscrows: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0, min: 0, max: 100 },
      disputeRate: { type: Number, default: 0, min: 0, max: 100 },
      autoReleaseRate: { type: Number, default: 0, min: 0, max: 100 },
    },

    reviewDetails: {
      totalReviews: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      verifiedReviews: { type: Number, default: 0 },
      ratingScore: { type: Number, default: 0, min: 0, max: 100 },
      volumeScore: { type: Number, default: 0, min: 0, max: 100 },
      verifiedBonus: { type: Number, default: 0, min: 0, max: 20 },
    },

    fraudDetails: {
      totalFlags: { type: Number, default: 0 },
      criticalFlags: { type: Number, default: 0 },
      highFlags: { type: Number, default: 0 },
      mediumFlags: { type: Number, default: 0 },
      lowFlags: { type: Number, default: 0 },
      confirmedFraud: { type: Number, default: 0 },
      dismissedFraud: { type: Number, default: 0 },
      score: { type: Number, default: 0, min: -100, max: 0 },
    },

    responseDetails: {
      messageResponseTime: { type: Number, default: 0 }, // in minutes
      bidResponseTime: { type: Number, default: 0 }, // in minutes
      supportResponseTime: { type: Number, default: 0 }, // in minutes
      averageResponseTime: { type: Number, default: 0 }, // in minutes
      score: { type: Number, default: 0, min: 0, max: 100 },
    },

    listingQualityDetails: {
      totalListings: { type: Number, default: 0 },
      averageImageCount: { type: Number, default: 0 },
      averageDescriptionLength: { type: Number, default: 0 },
      specsCompleteness: { type: Number, default: 0, min: 0, max: 100 },
      flaggedListings: { type: Number, default: 0 },
      score: { type: Number, default: 0, min: 0, max: 100 },
    },

    auctionDetails: {
      totalAuctions: { type: Number, default: 0 },
      completedAuctions: { type: Number, default: 0 },
      totalWinners: { type: Number, default: 0 },
      paidWinners: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0, min: 0, max: 100 },
      paymentRate: { type: Number, default: 0, min: 0, max: 100 },
      averageBidsPerAuction: { type: Number, default: 0 },
      score: { type: Number, default: 0, min: 0, max: 100 },
    },

    // =============================
    // 📊 METADATA
    // =============================
    lastCalculatedAt: Date,
    lastRecalculatedAt: Date,
    calculationVersion: { type: Number, default: 1 },

    // =============================
    // 📈 TREND
    // =============================
    previousScore: { type: Number, default: 0 },
    scoreChange: { type: Number, default: 0 },
    trend: { type: String, enum: ["up", "down", "stable"], default: "stable" },

    // =============================
    // 🔧 ADMIN OVERRIDE
    // =============================
    isOverridden: { type: Boolean, default: false },
    overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    overriddenAt: Date,
    overrideReason: String,
    originalScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
dealerHealthScoreSchema.index({ healthScore: -1 });
dealerHealthScoreSchema.index({ scoreCategory: 1, healthScore: -1 });
dealerHealthScoreSchema.index({ lastCalculatedAt: 1 });
dealerHealthScoreSchema.index({ dealer: 1, lastCalculatedAt: -1 });

// =============================
// ⚡ STATIC: DETERMINE SCORE CATEGORY
// =============================
dealerHealthScoreSchema.statics.determineScoreCategory = function (score) {
  if (score >= 90) return "platinum";
  if (score >= 75) return "gold";
  if (score >= 60) return "silver";
  if (score >= 40) return "warning";
  return "high_risk";
};

// =============================
// ⚡ STATIC: GET SCORE DISTRIBUTION
// =============================
dealerHealthScoreSchema.statics.getScoreDistribution = async function () {
  const distribution = await this.aggregate([
    {
      $group: {
        _id: "$scoreCategory",
        count: { $sum: 1 },
        avgScore: { $avg: "$healthScore" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return distribution;
};

// =============================
// ⚡ STATIC: GET TOP DEALERS
// =============================
dealerHealthScoreSchema.statics.getTopDealers = async function (category = null, limit = 10) {
  const match = category ? { scoreCategory: category } : {};
  
  const topDealers = await this.find(match)
    .sort({ healthScore: -1 })
    .limit(limit)
    .populate("dealer", "name email businessName location logo")
    .lean();

  return topDealers;
};

// =============================
// ⚡ STATIC: GET DEALER RANK
// =============================
dealerHealthScoreSchema.statics.getDealerRank = async function (dealerId) {
  const score = await this.findOne({ dealer: dealerId }).select("healthScore");
  
  if (!score) return null;

  const rank = await this.countDocuments({ healthScore: { $gt: score.healthScore } });

  return rank + 1;
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const DealerHealthScore = mongoose.models.DealerHealthScore || mongoose.model("DealerHealthScore", dealerHealthScoreSchema);

export default DealerHealthScore;
