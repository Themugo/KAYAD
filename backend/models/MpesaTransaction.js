// backend/models/MpesaTransaction.js

import mongoose from "mongoose";

const mpesaTransactionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    checkoutRequestID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    merchantRequestID: {
      type: String,
    },

    mpesaReceipt: {
      type: String,
      unique: true,
      sparse: true,
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
      index: true,
    },

    // =============================
    // 🔗 RELATIONS
    // =============================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
    },

    bidId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
    },
  },
  { timestamps: true }
);

// =============================
// 🔥 INDEXES
// =============================
mpesaTransactionSchema.index({ createdAt: -1 });

// =============================
// ⚡ METHODS
// =============================
mpesaTransactionSchema.methods.markSuccess = function (receipt) {
  this.status = "success";
  this.mpesaReceipt = receipt;
  return this.save();
};

mpesaTransactionSchema.methods.markFailed = function () {
  this.status = "failed";
  return this.save();
};

// =============================
// 🚀 SAFE EXPORT
// =============================
const MpesaTransaction =
  mongoose.models.MpesaTransaction ||
  mongoose.model("MpesaTransaction", mpesaTransactionSchema);

export default MpesaTransaction;