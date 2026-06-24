// backend/models/Dispute.js - Enterprise Dispute Management v2.0
// ─────────────────────────────────────────────────────────────
// Full 7-state workflow: OPEN → UNDER_REVIEW → MEDIATION →
// RESOLVED → APPEALED → (re-enter) → CLOSED. Supports evidence
// uploads, internal notes, mediation scheduling, resolution
// decisions, and appeal review. Backward-compatible with v1
// status values.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import { STATES } from "../services/disputeStateMachine.js";

const disputeSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 RELATED ENTITIES
    // =============================
    escrow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
      required: true,
      index: true,
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    openedAgainst: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    // =============================
    // 📋 DISPUTE DETAILS
    // =============================
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["condition_mismatch", "delivery_issue", "payment_dispute", "fraud", "other"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    amountInDispute: {
      type: Number,
      default: 0,
    },

    // =============================
    // 📊 DISPUTE STATUS (State Machine)
    // =============================
    status: {
      type: String,
      enum: Object.values(STATES),
      default: STATES.OPEN,
      index: true,
    },

    // =============================
    // 📎 EVIDENCE (ref array to Evidence model)
    // =============================
    evidence: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Evidence",
      },
    ],

    // =============================
    // ⚖️ MEDIATION
    // =============================
    mediation: {
      scheduledAt: Date,
      completedAt: Date,
      mediatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      mediatorNotes: String,
      outcome: {
        type: String,
        enum: ["settled", "impasse", "buyer_favored", "seller_favored", "partial"],
      },
      resolvedByMediation: {
        type: Boolean,
        default: false,
      },
      buyerSatisfied: Boolean,
      sellerSatisfied: Boolean,
    },

    // =============================
    // ⚖️ RESOLUTION
    // =============================
    resolution: {
      decision: {
        type: String,
        enum: ["partial_refund", "full_refund", "release_funds", "split_settlement", "dismissed"],
      },
      amount: Number,
      sellerAmount: Number,
      buyerAmount: Number,
      platformFee: Number,
      reason: String,
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      decidedAt: Date,
      implementedAt: Date,
      implemented: {
        type: Boolean,
        default: false,
      },
    },

    // =============================
    // 🔄 APPEAL
    // =============================
    appeal: {
      reason: String,
      additionalDetails: String,
      appealedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      appealedAt: Date,
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: Date,
      reviewNotes: String,
      appealDecision: {
        type: String,
        enum: ["uphold_resolution", "overturn_resolution", "modify_resolution"],
      },
    },

    // =============================
    // 📝 INTERNAL NOTES (admin only)
    // =============================
    internalNotes: [
      {
        note: { type: String, required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        addedAt: { type: Date, default: Date.now },
        isPrivate: { type: Boolean, default: true },
      },
    ],

    // =============================
    // 📊 AUDIT TIMELINE
    // =============================
    timeline: [
      {
        action: { type: String, required: true },
        actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        fromStatus: String,
        toStatus: String,
        note: String,
        at: { type: Date, default: Date.now },
      },
    ],
    openedAt: { type: Date, default: Date.now },
    underReviewAt: Date,
    mediationStartedAt: Date,
    resolvedAt: Date,
    appealedAt: Date,
    closedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// =============================
// 🔗 VIRTUAL: evidenceCount
// =============================
disputeSchema.virtual("evidenceCount").get(function () {
  return this.evidence?.length || 0;
});

// =============================
// 🎯 INSTANCE METHODS
// =============================
disputeSchema.methods.addTimelineEntry = function ({ action, actor, fromStatus, toStatus, note }) {
  this.timeline.push({ action, actor, fromStatus, toStatus, note, at: new Date() });
};

// =============================
// 📊 INDEXES
// =============================
disputeSchema.index({ openedBy: 1, createdAt: -1 });
disputeSchema.index({ openedAgainst: 1, createdAt: -1 });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ category: 1 });
disputeSchema.index({ priority: 1 });

// =============================
// 🔒 SOFT DELETE
// =============================
disputeSchema.add({
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

disputeSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

disputeSchema.statics.softDelete = async function (ids, userId) {
  return this.updateMany(
    { _id: { $in: ids } },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

export default mongoose.models.Dispute || mongoose.model("Dispute", disputeSchema);
