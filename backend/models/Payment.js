// models/Payment.js

import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 USER
    // =============================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // =============================
    // 🔗 UNIFIED REFERENCE
    // =============================
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    referenceModel: {
      type: String,
      enum: ["Car", "Bid", "Escrow"],
      required: true,
      index: true,
    },

    // =============================
    // 💳 PAYMENT TYPE
    // =============================
    type: {
      type: String,
      enum: ["bid", "auction_win", "buy", "listing", "subscription", "escrow", "inspection"],
      required: true,
      index: true,
    },

    // =============================
    // 💰 AMOUNT
    // =============================
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // =============================
    // 📞 PHONE
    // =============================
    phone: {
      type: String,
      required: true,
      index: true,
    },

    // =============================
    // 📊 STATUS
    // =============================
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled"],
      default: "pending",
      index: true,
    },

    // =============================
    // 🧾 MPESA DETAILS
    // =============================
    mpesaReceipt: {
      type: String,
      unique: true,
      sparse: true,
    },

    checkoutRequestId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    merchantRequestId: String,

    mode: {
      type: String,
      enum: ["mpesa", "mock", "card", "bank"],
      default: "mpesa",
    },

    // =============================
    // 🔁 PROCESS CONTROL
    // =============================
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },

    // =============================
    // 📡 CALLBACK RAW DATA
    // =============================
    callbackData: Object,

    failureReason: String,

    // =============================
    // 💼 BUSINESS SPLIT
    // =============================
    platformFee: {
      type: Number,
      default: 0,
    },

    dealerAmount: {
      type: Number,
      default: 0,
    },

    // =============================
    // 🚗 CAR REFERENCE (for socket emissions + escrow)
    // =============================
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      index: true,
    },

    // =============================
    // 🔗 ESCROW LINK
    // =============================
    escrow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// =============================
// �️ SOFT DELETE (Phase 2 Database Audit)
// =============================
paymentSchema.add({
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// Override delete to soft-delete
paymentSchema.statics.softDelete = async function (ids, userId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

// Soft-delete filter — exclude deleted payments by default
paymentSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

paymentSchema.pre("findOneAndUpdate", function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

paymentSchema.pre("countDocuments", function (next) {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

// =============================
// � INDEXES (CRITICAL FOR SCALE - Phase 1 Database Audit)
// =============================

// user history
paymentSchema.index({ user: 1, createdAt: -1 });

// admin dashboard
paymentSchema.index({ status: 1, createdAt: -1 });

// analytics
paymentSchema.index({ type: 1, createdAt: -1 });

// reference lookup
paymentSchema.index({ referenceId: 1, referenceModel: 1 });

// Phase 1: Add compound index for pending payments
paymentSchema.index({ status: 1, processed: 1, createdAt: -1 });

// =============================
// 🔗 CASCADE DELETE LOGIC (Phase 2 Database Audit)
// =============================

// Cascade delete: When payment is deleted, soft-delete related escrow
paymentSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  try {
    const Escrow = mongoose.model("Escrow");

    // Soft-delete related escrow
    if (doc.escrow) {
      await Escrow.updateMany({ _id: doc.escrow }, { $set: { deletedAt: new Date(), deletedBy: doc.user } });
    }
  } catch (err) {
    console.error("❌ CASCADE DELETE ERROR FOR PAYMENT:", err);
  }
});

// =============================
// ⚡ METHODS
// =============================

// ✅ MARK SUCCESS (IDEMPOTENT)
paymentSchema.methods.markSuccess = function (receipt, callback) {
  if (this.status === "success") return this;

  this.status = "success";
  this.mpesaReceipt = receipt;
  this.callbackData = callback;
  this.processed = true;

  return this.save();
};

// ❌ MARK FAILED
paymentSchema.methods.markFailed = function (reason) {
  if (this.status === "failed") return this;

  this.status = "failed";
  this.failureReason = reason;
  this.processed = true;

  return this.save();
};

// 🔁 CANCEL PAYMENT (manual/admin)
paymentSchema.methods.cancel = function () {
  if (this.status !== "pending") return this;

  this.status = "cancelled";
  this.processed = true;

  return this.save();
};

// =============================
// ⚡ STATICS
// =============================

// find by checkout
paymentSchema.statics.findByCheckoutId = function (id) {
  return this.findOne({ checkoutRequestId: id });
};

// get user payments
paymentSchema.statics.getUserPayments = function (userId) {
  return this.find({ user: userId }).sort({ createdAt: -1 }).populate("referenceId");
};

// 🔥 get pending (for retries / cron jobs)
paymentSchema.statics.getPendingPayments = function () {
  return this.find({
    status: "pending",
    processed: false,
  });
};

// =============================
// 🧠 SAFETY HOOK
// =============================
paymentSchema.pre("save", function (next) {
  // prevent negative splits
  if (this.platformFee < 0) this.platformFee = 0;
  if (this.dealerAmount < 0) this.dealerAmount = 0;

  next();
});

// =============================
// 🚀 EXPORT
// =============================
const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
