// backend/models/EscrowAnomaly.js - Escrow-specific anomaly detection records
// ─────────────────────────────────────────────────────────────
// Each document is a single detected anomaly on an escrow or
// user. Supports 5 anomaly categories with severity scoring,
// evidence snapshots, and admin review workflow.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const escrowAnomalySchema = new mongoose.Schema(
  {
    // ── Detection identity ──────────────────────────────
    anomalyId: {
      type: String,
      unique: true,
      required: true,
    },
    detectionSource: {
      type: String,
      enum: ["cron_scan", "realtime_check", "manual_review"],
      default: "cron_scan",
    },

    // ── Anomaly category ───────────────────────────────
    category: {
      type: String,
      enum: [
        "large_transaction",
        "rapid_refund",
        "multiple_disputes",
        "repeat_offender",
        "escrow_abuse",
      ],
      required: true,
      index: true,
    },

    // ── Severity & risk ────────────────────────────────
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

    // ── Status workflow ────────────────────────────────
    status: {
      type: String,
      enum: ["detected", "under_review", "confirmed", "dismissed", "action_taken"],
      default: "detected",
      index: true,
    },

    // ── Related entities ───────────────────────────────
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetUserRole: {
      type: String,
      enum: ["buyer", "seller"],
    },
    escrow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
      default: null,
    },
    relatedEscrows: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Escrow",
      },
    ],

    // ── Evidence snapshot ──────────────────────────────
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    summary: {
      type: String,
      required: true,
    },
    detectionRules: [String],

    // ── Risk factor breakdown ─────────────────────────
    riskFactors: [
      {
        factor: String,
        score: Number,
        detail: String,
      },
    ],

    // ── Admin action ───────────────────────────────────
    actionTaken: {
      type: String,
      enum: ["none", "warning", "escrow_frozen", "user_suspended", "user_banned", "funds_held"],
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

escrowAnomalySchema.index({ category: 1, severity: -1 });
escrowAnomalySchema.index({ status: 1, createdAt: -1 });
escrowAnomalySchema.index({ targetUser: 1, category: 1 });
escrowAnomalySchema.index({ riskScore: -1 });
escrowAnomalySchema.index({ createdAt: -1 });

export default mongoose.models.EscrowAnomaly || mongoose.model("EscrowAnomaly", escrowAnomalySchema);
