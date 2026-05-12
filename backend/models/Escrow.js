import mongoose from "mongoose";

const escrowSchema = new mongoose.Schema(
  {
    // =============================
    // 🚗 CAR
    // =============================
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true,
    },

    // =============================
    // 👥 PARTIES
    // =============================
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =============================
    // 💰 FINANCIALS
    // =============================
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    commission: {
      type: Number,
      default: 0,
    },

    sellerAmount: {
      type: Number,
      default: 0, // 🔥 FIX: don't require at creation
    },

    // =============================
    // 🔗 PAYMENT LINK
    // =============================
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },

    // =============================
    // 📊 STATUS
    // =============================
    status: {
      type: String,
      enum: [
        "pending",   // created but not funded
        "held",      // money received
        "released",  // seller paid
        "refunded",  // buyer refunded
        "disputed",  // conflict
      ],
      default: "pending",
      index: true,
    },

    // =============================
    // 🧠 AUDIT TRAIL
    // =============================
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // =============================
    // 🕒 TIMESTAMPS
    // =============================
    fundedAt: Date,
    releasedAt: Date,
    refundedAt: Date,

    // =============================
    // 📝 NOTES / DISPUTE
    // =============================
    notes: String,
    disputeReason: String,

    // =============================
    // 📜 AUDIT HISTORY
    // =============================
    history: [{ action: String, at: { type: Date, default: Date.now } }],
    lastActionKey: String,

    // =============================
    // 🤖 AUTO-RELEASE
    // =============================
    autoReleased: { type: Boolean, default: false },
    warningSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// =============================
// 🔥 INDEXES (OPTIMIZED)
// =============================
escrowSchema.index({ car: 1 });
escrowSchema.index({ buyer: 1, createdAt: -1 });
escrowSchema.index({ seller: 1, createdAt: -1 });
escrowSchema.index({ status: 1, createdAt: -1 });

// =============================
// ⚡ METHODS
// =============================

// ✅ MARK FUNDED (after MPESA success)
escrowSchema.methods.markFunded = function () {
  if (this.status !== "pending") return this;

  this.status = "held";
  this.fundedAt = new Date();

  return this.save();
};

// ✅ RELEASE FUNDS (ADMIN)
escrowSchema.methods.releaseFunds = function (adminId) {
  if (this.status !== "held") {
    throw new Error("Escrow not in releasable state");
  }

  // 🔥 calculate safely here too (double safety)
  const commissionRate = 0.05;
  this.commission = this.amount * commissionRate;
  this.sellerAmount = this.amount - this.commission;

  this.status = "released";
  this.releasedAt = new Date();
  this.releasedBy = adminId;

  return this.save();
};

// 🔁 REFUND BUYER
escrowSchema.methods.refundBuyer = function (adminId, reason) {
  if (!["held", "disputed"].includes(this.status)) {
    throw new Error("Cannot refund this escrow");
  }

  this.status = "refunded";
  this.refundedAt = new Date();
  this.refundedBy = adminId;
  this.disputeReason = reason;

  return this.save();
};

// ⚠️ OPEN DISPUTE
escrowSchema.methods.openDispute = function (reason) {
  this.status = "disputed";
  this.disputeReason = reason;

  return this.save();
};

// =============================
// 🚀 SAFE EXPORT
// =============================
const Escrow =
  mongoose.models.Escrow ||
  mongoose.model("Escrow", escrowSchema);

export default Escrow;