// backend/models/EscrowAudit.js - Production Hardened v4.0
// ─────────────────────────────────────────────────────────────
// Immutable escrow audit model for fintech compliance
// Tracks all escrow actions with full state changes and compliance data
// Write-once pattern - records cannot be modified after creation
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const escrowAuditSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 LINKED ESCROW
    // =============================
    escrow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
      required: true,
      index: true,
    },

    // =============================
    // 🎯 ACTION DETAILS
    // =============================
    action: {
      type: String,
      required: true,
      enum: [
        "mark_funded",
        "confirm_delivery",
        "schedule_inspection",
        "submit_transfer",
        "approve_transfer",
        "release_funds",
        "refund_buyer",
        "open_dispute",
        "auto_release",
        "request_release",
      ],
      index: true,
    },

    // =============================
    // 👤 PERFORMER DETAILS
    // =============================
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    performedByRole: {
      type: String,
      required: true,
    },

    performedByName: {
      type: String,
      required: true,
    },

    performedByEmail: {
      type: String,
    },

    // =============================
    // 🌐 COMPLIANCE TRACKING
    // =============================
    ipAddress: {
      type: String,
      required: true,
    },

    userAgent: {
      type: String,
    },

    timestamp: {
      type: Date,
      required: true,
      index: true,
      immutable: true,
    },

    // =============================
    // 📊 STATE TRACKING
    // =============================
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    newState: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    stateChanges: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // =============================
    // 📝 ADDITIONAL CONTEXT
    // =============================
    notes: String,

    reason: String,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // =============================
    // 🔒 IMMUTABILITY FLAGS
    // =============================
    isImmutable: {
      type: Boolean,
      default: true,
      immutable: true,
    },

    // =============================
    // 📋 AUDIT METADATA
    // =============================
    auditVersion: {
      type: String,
      default: "1.0",
    },

    source: {
      type: String,
      enum: ["api", "cron", "system", "admin"],
      default: "api",
    },

    requestId: String,
  },
  {
    timestamps: true,
  },
);

// =============================
// 🔥 INDEXES (PERFORMANCE & COMPLIANCE)
// =============================
escrowAuditSchema.index({ escrow: 1, timestamp: -1 });
escrowAuditSchema.index({ performedBy: 1, timestamp: -1 });
escrowAuditSchema.index({ action: 1, timestamp: -1 });
escrowAuditSchema.index({ timestamp: -1 });
escrowAuditSchema.index({ ipAddress: 1 });
escrowAuditSchema.index({ source: 1 });
escrowAuditSchema.index({ createdAt: -1 });

// =============================
// 🔒 PREVENT UPDATES (IMMUTABILITY)
// =============================
escrowAuditSchema.pre("save", function (next) {
  if (this.isNew === false) {
    throw new Error("EscrowAudit records are immutable and cannot be updated");
  }
  next();
});

escrowAuditSchema.pre("findOneAndUpdate", function () {
  throw new Error("EscrowAudit records are immutable and cannot be updated");
});

escrowAuditSchema.pre("updateOne", function () {
  throw new Error("EscrowAudit records are immutable and cannot be updated");
});

escrowAuditSchema.pre("updateMany", function () {
  throw new Error("EscrowAudit records are immutable and cannot be updated");
});

// =============================
// 🔒 PREVENT DELETES (COMPLIANCE)
// =============================
escrowAuditSchema.pre("deleteOne", function () {
  throw new Error("EscrowAudit records cannot be deleted for compliance reasons");
});

escrowAuditSchema.pre("deleteMany", function () {
  throw new Error("EscrowAudit records cannot be deleted for compliance reasons");
});

// =============================
// ⚡ METHOD: GET STATE SUMMARY
// =============================
escrowAuditSchema.methods.getStateSummary = function () {
  return {
    previousStatus: this.previousState.status,
    newStatus: this.newState.status,
    previousAmount: this.previousState.amount,
    newAmount: this.newState.amount,
    previousDeliveryConfirmed: this.previousState.deliveryConfirmed,
    newDeliveryConfirmed: this.newState.deliveryConfirmed,
  };
};

// =============================
// ⚡ METHOD: GET PERFORMER SUMMARY
// =============================
escrowAuditSchema.methods.getPerformerSummary = function () {
  return {
    userId: this.performedBy,
    name: this.performedByName,
    email: this.performedByEmail,
    role: this.performedByRole,
    ipAddress: this.ipAddress,
    timestamp: this.timestamp,
  };
};

// =============================
// ⚡ METHOD: GET COMPLIANCE SUMMARY
// =============================
escrowAuditSchema.methods.getComplianceSummary = function () {
  return {
    action: this.action,
    performedBy: this.performedByName,
    performedByRole: this.performedByRole,
    ipAddress: this.ipAddress,
    timestamp: this.timestamp,
    source: this.source,
    requestId: this.requestId,
  };
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const EscrowAudit = mongoose.models.EscrowAudit || mongoose.model("EscrowAudit", escrowAuditSchema);

export default EscrowAudit;
