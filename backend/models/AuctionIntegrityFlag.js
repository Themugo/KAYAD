import mongoose from "mongoose";

const integrityFlagSchema = new mongoose.Schema(
  {
    flagId: {
      type: String,
      unique: true,
      required: true,
    },
    detectionSource: {
      type: String,
      enum: ["cron_scan", "realtime_check", "manual_review"],
      default: "cron_scan",
    },

    category: {
      type: String,
      enum: [
        "self_bidding",
        "related_account",
        "bid_inflation",
        "bid_velocity",
        "last_second_manipulation",
      ],
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
      default: "medium",
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: ["detected", "under_review", "confirmed", "dismissed", "action_taken"],
      default: "detected",
      index: true,
    },

    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetUserRole: {
      type: String,
      enum: ["bidder", "seller"],
    },
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      default: null,
    },
    relatedAuctions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auction",
      },
    ],

    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    summary: {
      type: String,
      required: true,
    },
    detectionRules: [String],

    riskFactors: [
      {
        factor: String,
        score: Number,
        detail: String,
      },
    ],

    actionTaken: {
      type: String,
      enum: [
        "none",
        "warning",
        "bid_removed",
        "auction_cancelled",
        "user_suspended",
        "user_banned",
        "referral_frozen",
      ],
      default: "none",
    },
    actionTakenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actionTakenAt: Date,
    actionNotes: String,

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    reviewNotes: String,
  },
  { timestamps: true },
);

integrityFlagSchema.index({ category: 1, severity: -1 });
integrityFlagSchema.index({ status: 1, createdAt: -1 });
integrityFlagSchema.index({ targetUser: 1, category: 1 });
integrityFlagSchema.index({ riskScore: -1 });
integrityFlagSchema.index({ createdAt: -1 });

export default mongoose.models.AuctionIntegrityFlag ||
  mongoose.model("AuctionIntegrityFlag", integrityFlagSchema);
