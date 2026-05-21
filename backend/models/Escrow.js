import mongoose from "mongoose";

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

    notes: String,
    disputeReason: String,

    history: [{ action: String, by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, at: { type: Date, default: Date.now } }],
    lastActionKey: String,

    autoReleased: { type: Boolean, default: false },
    warningSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

escrowSchema.index({ car: 1 });
escrowSchema.index({ buyer: 1, createdAt: -1 });
escrowSchema.index({ seller: 1, createdAt: -1 });
escrowSchema.index({ status: 1, createdAt: -1 });

escrowSchema.methods.addHistory = function (action, userId) {
  this.history.push({ action, by: userId || null, at: new Date() });
};

escrowSchema.methods.markFunded = function () {
  if (this.status !== "pending") return this;
  this.status = "held";
  this.fundedAt = new Date();
  this.autoReleaseEligibleAt = new Date(Date.now() + this.releaseWindowDays * 86400000);
  this.addHistory(`Funded — KES ${this.amount.toLocaleString("en-KE")} held`);
  return this.save();
};

escrowSchema.methods.confirmDelivery = function (userId) {
  if (this.status !== "held") throw new Error("Escrow not in delivery state");
  this.deliveryConfirmed = true;
  this.deliveryConfirmedAt = new Date();
  this.addHistory("Buyer confirmed delivery", userId);
  return this.save();
};

escrowSchema.methods.releaseFunds = function (adminId) {
  if (!["held", "disputed"].includes(this.status)) throw new Error("Escrow not in releasable state");
  const commissionRate = 0.05;
  this.commission = this.amount * commissionRate;
  this.sellerAmount = this.amount - this.commission;
  this.status = "released";
  this.releasedAt = new Date();
  this.releasedBy = adminId;
  this.addHistory(`Released to seller — KES ${this.sellerAmount.toLocaleString("en-KE")}`, adminId);
  return this.save();
};

escrowSchema.methods.refundBuyer = function (adminId, reason) {
  if (!["held", "disputed"].includes(this.status)) throw new Error("Cannot refund this escrow");
  this.status = "refunded";
  this.refundedAt = new Date();
  this.refundedBy = adminId;
  if (reason) this.disputeReason = reason;
  this.addHistory(`Refunded to buyer — ${reason || "No reason"}`, adminId);
  return this.save();
};

escrowSchema.methods.openDispute = function (userId, reason) {
  if (["released", "refunded"].includes(this.status)) throw new Error("Cannot dispute finalized escrow");
  this.status = "disputed";
  this.disputeReason = reason;
  this.disputedBy = userId;
  this.disputedAt = new Date();
  this.addHistory(`Dispute opened — ${reason}`, userId);
  return this.save();
};

escrowSchema.methods.autoRelease = function () {
  if (this.status !== "held" || !this.autoReleaseEligibleAt) return null;
  if (new Date() < this.autoReleaseEligibleAt) return null;
  this.autoReleased = true;
  return this.releaseFunds(null);
};

const Escrow = mongoose.models.Escrow || mongoose.model("Escrow", escrowSchema);
export default Escrow;
