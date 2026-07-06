import mongoose from "mongoose";

const ledgerEntrySchema = new mongoose.Schema(
  {
    transaction_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    external_reference: {
      type: String,
      index: true,
      sparse: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    entries: [
      {
        account: { type: mongoose.Schema.Types.ObjectId, ref: "LedgerAccount", required: true },
        debit: { type: Number, default: 0, min: 0 },
        credit: { type: Number, default: 0, min: 0 },
      },
    ],
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "KES" },
    source: {
      type: String,
      required: true,
      enum: [
        "escrow_deposit", "escrow_release", "refund",
        "auction_payment", "subscription", "inspection_fee",
        "commission", "platform_fee", "manual_adjustment",
      ],
      index: true,
    },
    destination: {
      type: String,
      required: true,
      enum: [
        "buyer", "seller", "platform", "inspector", "dealer",
      ],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "reversed"],
      default: "pending",
      index: true,
    },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    reversed_at: Date,
    reversed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  },
);

ledgerEntrySchema.index({ user: 1, createdAt: -1 });
ledgerEntrySchema.index({ source: 1, createdAt: -1 });
ledgerEntrySchema.index({ status: 1, createdAt: -1 });
ledgerEntrySchema.index({ external_reference: 1, source: 1 });

ledgerEntrySchema.pre("validate", function (next) {
  if (this.entries && this.entries.length >= 2) {
    const totalDebit = this.entries.reduce((s, e) => s + (e.debit || 0), 0);
    const totalCredit = this.entries.reduce((s, e) => s + (e.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return next(new Error(`Debit/credit mismatch: ${totalDebit} vs ${totalCredit}`));
    }
  }
  next();
});

const LedgerEntry = mongoose.models.LedgerEntry || mongoose.model("LedgerEntry", ledgerEntrySchema);
export default LedgerEntry;
