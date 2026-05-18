import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 RELATIONS
    // =============================
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    car:  { type: mongoose.Schema.Types.ObjectId, ref: "Car", index: true },

    // =============================
    // 💰 AMOUNT
    // =============================
    amount:   { type: Number, required: true },
    currency: { type: String, default: "KES" },

    // =============================
    // 📋 TYPE & STATUS
    // =============================
    type: {
      type: String,
      enum: ["bid_commitment", "escrow_deposit", "escrow_release", "buy_now", "refund", "commission", "withdrawal", "deposit", "referral_bonus"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded", "cancelled"],
      default: "pending",
      index: true,
    },

    // =============================
    // 📱 M-PESA
    // =============================
    phone:             { type: String },
    mpesaReceipt:      { type: String },
    checkoutRequestId: { type: String },
    resultCode:        { type: String },
    resultDesc:        { type: String },
    transactionDate:   { type: Date },

    // =============================
    // 📎 REFERENCES
    // =============================
    reference:   { type: String, index: true },
    description: { type: String },

    // =============================
    // 🔒 ESCROW
    // =============================
    escrowId: { type: mongoose.Schema.Types.ObjectId, ref: "Escrow" },
    releasedAt: { type: Date },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ mpesaReceipt: 1 }, { sparse: true });
transactionSchema.index({ checkoutRequestId: 1 }, { sparse: true });

export default mongoose.model("Transaction", transactionSchema);
