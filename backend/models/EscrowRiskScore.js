// backend/models/EscrowRiskScore.js - Aggregated escrow risk profile per user
// ─────────────────────────────────────────────────────────────
// Tracks cumulative risk for each buyer and seller.
// Scores decay over time. High scores trigger anomaly flags.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const escrowRiskScoreSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["buyer", "seller"],
      required: true,
    },
    totalEscrows: { type: Number, default: 0 },
    completedEscrows: { type: Number, default: 0 },
    disputedEscrows: { type: Number, default: 0 },
    refundedEscrows: { type: Number, default: 0 },
    releasedEscrows: { type: Number, default: 0 },

    // ── Anomaly counters (lifetime) ────────────────
    largeTransactionCount: { type: Number, default: 0 },
    rapidRefundCount: { type: Number, default: 0 },
    disputeInitiatorCount: { type: Number, default: 0 },
    disputeCounterpartyCount: { type: Number, default: 0 },
    abusePatternCount: { type: Number, default: 0 },

    // ── Rolling window counters (30-day) ──────────
    recentEscrows30d: { type: Number, default: 0 },
    recentRefunds30d: { type: Number, default: 0 },
    recentDisputes30d: { type: Number, default: 0 },
    totalVolume30d: { type: Number, default: 0 },

    // ── Risk score (0-100) ────────────────────────
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    riskTier: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    lastAnomalyAt: Date,
    lastScoreUpdate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

escrowRiskScoreSchema.index({ riskScore: -1 });
escrowRiskScoreSchema.index({ role: 1, riskScore: -1 });
escrowRiskScoreSchema.index({ user: 1, role: 1 }, { unique: true });

export default mongoose.models.EscrowRiskScore || mongoose.model("EscrowRiskScore", escrowRiskScoreSchema);
