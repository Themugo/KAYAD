import mongoose from "mongoose";

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  referee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["pending", "credited", "expired"],
    default: "pending",
  },
  bonusAmount: { type: Number, default: 0 },
  creditedAt: Date,
}, { timestamps: true });

referralSchema.index({ referrer: 1, createdAt: -1 });

export default mongoose.models.Referral || mongoose.model("Referral", referralSchema);
