import mongoose from "mongoose";

const ledgerAccountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["asset", "liability", "equity", "revenue", "expense"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "cash", "escrow", "fees", "commission", "subscription",
        "inspection", "refund", "payable", "receivable", "reserve",
      ],
      required: true,
    },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "KES" },
  },
  { timestamps: true },
);

ledgerAccountSchema.index({ type: 1, category: 1 });

const LedgerAccount = mongoose.models.LedgerAccount || mongoose.model("LedgerAccount", ledgerAccountSchema);
export default LedgerAccount;
