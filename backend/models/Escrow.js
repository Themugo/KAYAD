// backend/models/Escrow.js - Production v2.0 (State Machine)
// ─────────────────────────────────────────────────────────────
// Escrow model with strict state machine validation.
// All status transitions go through validateTransition() which
// checks: allowed path, role permissions, and guard conditions.
// Every transition is logged to EscrowAudit.
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import { logEscrowAction } from "../services/escrowAuditService.js";
import { STATES, validateTransition, isTerminal } from "../services/escrowStateMachine.js";
import PlatformConfig from "./PlatformConfig.js";

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
      enum: Object.values(STATES),
      default: STATES.PENDING,
      index: true,
    },

    releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    disputedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    fundedAt: Date,
    vehicleConfirmedAt: Date,
    deliveredAt: Date,
    releasedAt: Date,
    refundedAt: Date,
    disputedAt: Date,
    closedAt: Date,

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
    disputeResolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    disputeResolvedAt: Date,
    disputeResolution: String,

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

// =============================
// 🗑️ SOFT DELETE
// =============================
escrowSchema.add({
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

escrowSchema.statics.softDelete = async function (ids, userId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

escrowSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});
escrowSchema.pre("findOneAndUpdate", function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});
escrowSchema.pre("countDocuments", function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});
escrowSchema.pre("aggregate", function () {
  const hasDeletedAt = this.pipeline().some(stage => {
    const stageStr = JSON.stringify(stage);
    return stageStr.includes("deletedAt") || stageStr.includes("deleted_at");
  });
  if (!hasDeletedAt) {
    this.pipeline().unshift({ $match: { deletedAt: null } });
  }
});

// =============================
// 🔥 INDEXES
// =============================
escrowSchema.index({ car: 1 });
escrowSchema.index({ buyer: 1, createdAt: -1 });
escrowSchema.index({ seller: 1, createdAt: -1 });
escrowSchema.index({ status: 1, createdAt: -1 });
escrowSchema.index({ buyer: 1, status: 1, createdAt: -1 });
escrowSchema.index({ seller: 1, status: 1, createdAt: -1 });
escrowSchema.index({ fundedAt: 1 }, { sparse: true });
escrowSchema.index({ status: 1, autoReleaseEligibleAt: 1 });

// =============================
// 🏛️ CORE STATE MACHINE TRANSITION
// =============================
escrowSchema.methods.transitionTo = async function (nextStatus, userId, role, options = {}) {
  if (isTerminal(this.status)) {
    throw new Error(`Escrow is in terminal state ${this.status}; no transitions allowed`);
  }

  if (options.idempotencyKey && this.lastActionKey === options.idempotencyKey) {
    return this;
  }

  const validation = validateTransition(this.status, nextStatus, role, this);
  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  const previousStatus = this.status;
  const now = new Date();

  // Set status-specific timestamps
  switch (nextStatus) {
    case STATES.FUNDED:
      this.fundedAt = now;
      this.autoReleaseEligibleAt = new Date(now.getTime() + this.releaseWindowDays * 86400000);
      this.timeline.depositReceived = true;
      this.timeline.depositReceivedAt = now;
      break;
    case STATES.VEHICLE_CONFIRMED:
      this.vehicleConfirmedAt = now;
      this.timeline.inspectionCompleted = true;
      this.timeline.inspectionCompletedAt = now;
      break;
    case STATES.DELIVERED:
      this.deliveredAt = now;
      this.deliveryConfirmed = true;
      this.deliveryConfirmedAt = now;
      break;
    case STATES.DISPUTED:
      this.disputedAt = now;
      this.disputedBy = userId;
      this.disputeReason = options.reason || this.disputeReason;
      break;
    case STATES.REFUNDED:
      this.refundedAt = now;
      this.refundedBy = userId;
      this.disputeResolvedBy = userId;
      this.disputeResolvedAt = now;
      this.disputeResolution = options.resolution || "refund";
      break;
    case STATES.RELEASED: {
      this.releasedAt = now;
      this.releasedBy = userId;
      this.timeline.fundsReleased = true;
      this.timeline.fundsReleasedAt = now;
      if (previousStatus === STATES.DISPUTED) {
        this.disputeResolvedBy = userId;
        this.disputeResolvedAt = now;
        this.disputeResolution = options.resolution || "release";
      }
      break;
    }
    case STATES.CLOSED:
      this.closedAt = now;
      break;
  }

  // Apply idempotency key if provided
  if (options.idempotencyKey) {
    this.lastActionKey = options.idempotencyKey;
  }

  this.status = nextStatus;

  const label = options.label || `Transitioned from ${previousStatus} to ${nextStatus}`;
  this.history.push({ action: label, by: userId || null, at: now });

  const result = await this.save();

  // ── Audit log (async, non-blocking) ─────────────────────
  if (options.req || userId) {
    setImmediate(async () => {
      try {
        await logEscrowAction(this._id, `transition:${previousStatus}->${nextStatus}`, userId || "system", options.req, {
          executeAction: async () => {},
          notes: label,
          reason: options.reason,
          metadata: { previousStatus, nextStatus, role, autoReleased: options.autoReleased },
          source: options.source || "api",
        });
      } catch (err) {
        // audit failure must not break escrow
      }
    });
  }

  return result;
};

// =============================
// 📝 ADD HISTORY
// =============================
escrowSchema.methods.addHistory = function (action, userId) {
  this.history.push({ action, by: userId || null, at: new Date() });
};

// =============================
// ⚡ LEGACY COMPAT ALIASES
// =============================
escrowSchema.methods.markFunded = async function (userId, req) {
  return this.transitionTo(STATES.FUNDED, userId, "system", { req, label: `Funded — KES ${this.amount.toLocaleString("en-KE")} held` });
};

escrowSchema.methods.confirmDelivery = async function (userId, req) {
  return this.transitionTo(STATES.DELIVERED, userId, "seller", { req, label: "Seller confirmed delivery" });
};

escrowSchema.methods.releaseFunds = async function (adminId, req) {
  try {
    const config = await PlatformConfig.findOne().lean();
    const rate = config?.dealerCommission ? config.dealerCommission / 100 : 0.05;
    this.commission = this.amount * rate;
  } catch {
    this.commission = this.amount * 0.05;
  }
  this.sellerAmount = this.amount - this.commission;
  return this.transitionTo(STATES.RELEASED, adminId, "admin", {
    req,
    label: `Released to seller — KES ${this.sellerAmount.toLocaleString("en-KE")}`,
  });
};

escrowSchema.methods.refundBuyer = async function (adminId, reason, req) {
  if (reason) this.disputeReason = reason;
  return this.transitionTo(STATES.REFUNDED, adminId, "admin", {
    req,
    reason,
    label: `Refunded to buyer — ${reason || "No reason"}`,
  });
};

escrowSchema.methods.openDispute = async function (userId, reason, req) {
  if (reason) this.disputeReason = reason;
  const role = req?.user?.role === "admin" || req?.user?.role === "superadmin" ? "admin" : "buyer";
  return this.transitionTo(STATES.DISPUTED, userId, role, {
    req,
    reason,
    label: `Dispute opened — ${reason}`,
  });
};

escrowSchema.methods.autoRelease = async function (req) {
  if (this.status === STATES.DELIVERED) {
    if (!this.deliveryConfirmedAt) return null;
    const deliverCutoff = new Date(Date.now() - 3 * 86_400_000);
    if (this.deliveryConfirmedAt > deliverCutoff) return null;
    this.autoReleased = true;
    return this.transitionTo(STATES.RELEASED, null, "system", {
      req,
      autoReleased: true,
      source: "cron",
      label: "Auto-released after delivery — buyer did not dispute",
    });
  }
  if (this.status !== STATES.FUNDED && this.status !== STATES.VEHICLE_CONFIRMED) return null;
  if (this.autoReleaseEligibleAt && new Date() < this.autoReleaseEligibleAt) return null;
  this.autoReleased = true;
  return this.transitionTo(STATES.RELEASED, null, "system", {
    req,
    autoReleased: true,
    source: "cron",
    label: "Auto-released after delivery confirmation window",
  });
};

const Escrow = mongoose.models.Escrow || mongoose.model("Escrow", escrowSchema);
export default Escrow;
