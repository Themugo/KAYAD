import mongoose from "mongoose";

const dealerTrustScoreSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 DEALER
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
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 75,
      index: true,
    },

    // =============================
    // 🎯 COMPONENT SCORES
    // =============================
    components: {
      completedSales: {
        score: { type: Number, default: 0 },
        weight: { type: Number, default: 0.25 },
        data: {
          totalSales: { type: Number, default: 0 },
          successfulSales: { type: Number, default: 0 },
          successRate: { type: Number, default: 0 },
        },
      },
      escrowSuccess: {
        score: { type: Number, default: 0 },
        weight: { type: Number, default: 0.25 },
        data: {
          totalEscrows: { type: Number, default: 0 },
          successfulEscrows: { type: Number, default: 0 },
          disputedEscrows: { type: Number, default: 0 },
          escrowSuccessRate: { type: Number, default: 0 },
        },
      },
      responseTime: {
        score: { type: Number, default: 0 },
        weight: { type: Number, default: 0.2 },
        data: {
          averageResponseTime: { type: Number, default: 0 }, // in minutes
          totalMessages: { type: Number, default: 0 },
          responseCount: { type: Number, default: 0 },
        },
      },
      disputes: {
        score: { type: Number, default: 0 },
        weight: { type: Number, default: 0.15 },
        data: {
          totalDisputes: { type: Number, default: 0 },
          resolvedDisputes: { type: Number, default: 0 },
          disputeRate: { type: Number, default: 0 },
        },
      },
      vehicleAccuracy: {
        score: { type: Number, default: 0 },
        weight: { type: Number, default: 0.15 },
        data: {
          totalListings: { type: Number, default: 0 },
          accurateListings: { type: Number, default: 0 },
          accuracyRate: { type: Number, default: 0 },
        },
      },
    },

    // =============================
    // 🏆 TIER
    // =============================
    tier: {
      type: String,
      enum: ["bronze", "silver", "gold", "platinum", "elite"],
      default: "bronze",
    },

    // =============================
    // 📈 HISTORY
    // =============================
    scoreHistory: [
      {
        score: Number,
        tier: String,
        calculatedAt: Date,
        reason: String,
      },
    ],

    // =============================
    // 📋 METADATA
    // =============================
    lastCalculatedAt: Date,
    nextCalculationAt: Date,
  },
  { timestamps: true },
);

// Indexes for efficient queries
dealerTrustScoreSchema.index({ overallScore: -1 });
dealerTrustScoreSchema.index({ tier: 1 });
dealerTrustScoreSchema.index({ lastCalculatedAt: -1 });

export default mongoose.models.DealerTrustScore || mongoose.model("DealerTrustScore", dealerTrustScoreSchema);
