import mongoose from "mongoose";
import { logEscrowAction } from "../services/escrowAuditService.js";

const escrowSchema = new mongoose.Schema(
  {
    car: { type: mongoose.Schema.Types.ObjectId, ref: "Car", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    amount: { type: Number, required: true, min: 1 },
    reservePrice: { type: Number, default: null, min: 0 },
    commission: { type: Number, default: 0 },
    sellerAmount: { type: Number, default: 0 },

    releaseWindowDays: { type: Number, default: 3, min: 1, max: 30 },
    deliveryConfirmed: { type: Boolean, default: false },
    deliveryConfirmedAt: Date,
    autoReleaseEligibleAt: Date,

    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, index: true },

    status: {
      type: String,
      enum: ["pending", "held", "released", "refunded", "disputed"],
      default: "pending",
      index: true,
    },

    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    disputedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    fundedAt: Date,
    releasedAt: Date,
    refundedAt: Date,
    disputedAt: Date,

    // =============================
    // 📊 TIMELINE STAGES
    // =============================
    timeline: {
      depositReceived: { type: Boolean, default: false },
      depositReceivedAt: Date,
      inspectionScheduled: { type: Boolean, default: false },
      inspectionScheduledAt: Date,
      inspectionCompleted: { type: Boolean, default: false },
      inspectionCompletedAt: Date,
      transferSubmitted: { type: Boolean, default: false },
      transferSubmittedAt: Date,
      transferApproved: { type: Boolean, default: false },
      transferApprovedAt: Date,
      fundsReleased: { type: Boolean, default: false },
      fundsReleasedAt: Date,
    },

    notes: String,
    disputeReason: String,

    history: [
      {
        action: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],
    lastActionKey: String,

    autoReleased: { type: Boolean, default: false },
    warningSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

escrowSchema.index({ car: 1 });
escrowSchema.index({ buyer: 1, createdAt: -1 });
escrowSchema.index({ seller: 1, createdAt: -1 });
escrowSchema.index({ status: 1, createdAt: -1 });
// Phase 1: Add compound indexes for status queries
escrowSchema.index({ buyer: 1, status: 1, createdAt: -1 });
escrowSchema.index({ seller: 1, status: 1, createdAt: -1 });

escrowSchema.methods.addHistory = function (action, userId) {
  this.history.push({ action, by: userId || null, at: new Date() });
};

escrowSchema.methods.markFunded = async function (userId, req) {
  if (this.status !== "pending") return this;

  // Capture state before action
  const previousState = this.toObject();

  this.status = "held";
  this.fundedAt = new Date();
  this.autoReleaseEligibleAt = new Date(Date.now() + this.releaseWindowDays * 86400000);
  this.timeline.depositReceived = true;
  this.timeline.depositReceivedAt = new Date();
  this.addHistory(`Funded — KES ${this.amount.toLocaleString("en-KE")} held`);

  const result = await this.save();

  // Log audit asynchronously (non-blocking)
  if (userId && req) {
    setImmediate(async () => {
      try {
        await logEscrowAction(this._id, "mark_funded", userId, req, {
          executeAction: async () => {}, // Already executed
          notes: "Escrow funded and held",
        });
      } catch (err) {
        // Audit logging failure should not break escrow operations
        console.warn("⚠️ Audit logging failed for mark_funded:", err.message);
      }
    });
  }

  return result;
};

escrowSchema.methods.confirmDelivery = async function (userId, req) {
  if (this.status !== "held") throw new Error("Escrow not in delivery state");

  const previousState = this.toObject();

  this.deliveryConfirmed = true;
  this.deliveryConfirmedAt = new Date();
  this.timeline.inspectionCompleted = true;
  this.timeline.inspectionCompletedAt = new Date();
  this.addHistory("Buyer confirmed delivery", userId);

  const result = await this.save();

  // Log audit asynchronously
  if (userId && req) {
    setImmediate(async () => {
      try {
        await logEscrowAction(this._id, "confirm_delivery", userId, req, {
          executeAction: async () => {},
          notes: "Buyer confirmed delivery",
        });
      } catch (err) {
        console.warn("⚠️ Audit logging failed for confirm_delivery:", err.message);
      }
    });
  }

  return result;
};

escrowSchema.methods.scheduleInspection = async function (userId, req) {
  const previousState = this.toObject();

  this.timeline.inspectionScheduled = true;
  this.timeline.inspectionScheduledAt = new Date();
  this.addHistory("Inspection scheduled", userId);

  const result = await this.save();

  // Log audit asynchronously
  if (userId && req) {
    setImmediate(async () => {
      try {
        await logEscrowAction(this._id, "schedule_inspection", userId, req, {
          executeAction: async () => {},
          notes: "Inspection scheduled",
        });
      } catch (err) {
        console.warn("⚠️ Audit logging failed for schedule_inspection:", err.message);
      }
    });
  }

  return result;
};

escrowSchema.methods.submitTransfer = async function (userId, req) {
  const previousState = this.toObject();

  this.timeline.transferSubmitted = true;
  this.timeline.transferSubmittedAt = new Date();
  this.addHistory("Transfer submitted for approval", userId);

  const result = await this.save();

  // Log audit asynchronously
  if (userId && req) {
    setImmediate(async () => {
      try {
        await logEscrowAction(this._id, "submit_transfer", userId, req, {
          executeAction: async () => {},
          notes: "Transfer submitted for approval",
        });
      } catch (err) {
        console.warn("⚠️ Audit logging failed for submit_transfer:", err.message);
      }
    });
  }

  return result;
};

escrowSchema.methods.approveTransfer = async function (userId, req) {
  const previousState = this.toObject();

  this.timeline.transferApproved = true;
  this.timeline.transferApprovedAt = new Date();
  this.addHistory("Transfer approved", userId);

  const result = await this.save();

  // Log audit asynchronously
  if (userId && req) {
    setImmediate(async () => {
      try {
        await logEscrowAction(this._id, "approve_transfer", userId, req, {
          executeAction: async () => {},
          notes: "Transfer approved",
        });
      } catch (err) {
        console.warn("⚠️ Audit logging failed for approve_transfer:", err.message);
      }
    });
  }

  return result;
};

escrowSchema.methods.releaseFunds = async function (adminId, req) {
  if (!["held", "disputed"].includes(this.status)) throw new Error("Escrow not in releasable state");

  const previousState = this.toObject();

  const commissionRate = 0.05;
  this.commission = this.amount * commissionRate;
  this.sellerAmount = this.amount - this.commission;
  this.status = "released";
  this.releasedAt = new Date();
  this.releasedBy = adminId;
  this.timeline.fundsReleased = true;
  this.timeline.fundsReleasedAt = new Date();
  this.addHistory(`Released to seller — KES ${this.sellerAmount.toLocaleString("en-KE")}`, adminId);

  const result = await this.save();

  // Log audit asynchronously
  if (adminId && req) {
    setImmediate(async () => {
      try {
        await logEscrowAction(this._id, "release_funds", adminId, req, {
          executeAction: async () => {},
          notes: "Funds released to seller",
          reason: `Commission: KES ${this.commission.toLocaleString("en-KE")}, Seller amount: KES ${this.sellerAmount.toLocaleString("en-KE")}`,
        });
      } catch (err) {
        console.warn("⚠️ Audit logging failed for release_funds:", err.message);
      }
    });
  }

  return result;
};

escrowSchema.methods.refundBuyer = async function (adminId, reason, req) {
  if (!["held", "disputed"].includes(this.status)) throw new Error("Cannot refund this escrow");

  const previousState = this.toObject();

  this.status = "refunded";
  this.refundedAt = new Date();
  this.refundedBy = adminId;
  if (reason) this.disputeReason = reason;
  this.addHistory(`Refunded to buyer — ${reason || "No reason"}`, adminId);

  const result = await this.save();

  // Log audit asynchronously
  if (adminId && req) {
    setImmediate(async () => {
      try {
        await logEscrowAction(this._id, "refund_buyer", adminId, req, {
          executeAction: async () => {},
          notes: "Refunded to buyer",
          reason: reason || "No reason provided",
        });
      } catch (err) {
        console.warn("⚠️ Audit logging failed for refund_buyer:", err.message);
      }
    });
  }

  return result;
};

escrowSchema.methods.openDispute = async function (userId, reason, req) {
  if (["released", "refunded"].includes(this.status)) throw new Error("Cannot dispute finalized escrow");

  const previousState = this.toObject();

  this.status = "disputed";
  this.disputeReason = reason;
  this.disputedBy = userId;
  this.disputedAt = new Date();
  this.addHistory(`Dispute opened — ${reason}`, userId);

  const result = await this.save();

  // Log audit asynchronously
  if (userId && req) {
    setImmediate(async () => {
      try {
        await logEscrowAction(this._id, "open_dispute", userId, req, {
          executeAction: async () => {},
          notes: "Dispute opened",
          reason: reason || "No reason provided",
        });
      } catch (err) {
        console.warn("⚠️ Audit logging failed for open_dispute:", err.message);
      }
    });
  }

  return result;
};

escrowSchema.methods.autoRelease = async function (req) {
  if (this.status !== "held" || !this.autoReleaseEligibleAt) return null;
  if (new Date() < this.autoReleaseEligibleAt) return null;

  this.autoReleased = true;

  // Call releaseFunds with null adminId (system action)
  const result = await this.releaseFunds(null, req);

  // Log audit asynchronously for auto-release
  if (req) {
    setImmediate(async () => {
      try {
        await logEscrowAction(this._id, "auto_release", null, req, {
          executeAction: async () => {},
          notes: "Auto-released after delivery confirmation window",
          source: "cron",
        });
      } catch (err) {
        console.warn("⚠️ Audit logging failed for auto_release:", err.message);
      }
    });
  }

  return result;
};

const Escrow = mongoose.models.Escrow || mongoose.model("Escrow", escrowSchema);
export default Escrow;
