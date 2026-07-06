import mongoose from "mongoose";

const escrowVaultSchema = new mongoose.Schema(
  {
    car: { type: mongoose.Schema.Types.ObjectId, ref: "Car", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    bankTransferRef: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: [
        "awaiting_payment",
        "escrow_locked",
        "inspection_pending",
        "inspection_complete",
        "otp_sent",
        "released",
        "refunded",
      ],
      default: "awaiting_payment",
    },
    platformAccountName: { type: String, default: "KAYAD Escrow Services Ltd" },
    platformAccountNumber: { type: String, default: process.env.ESCROW_ACCOUNT_NUMBER || "" },
    platformBankName: { type: String, default: process.env.ESCROW_BANK_NAME || "Equity Bank Kenya" },
    releaseOtp: String,
    otpExpiry: Date,
    lastOtpSentAt: Date,
    otpAttempts: { type: Number, default: 0 },
    sellerNotifiedAt: Date,
    fundedAt: Date,
    inspectionCompletedAt: Date,
    releasedAt: Date,
    history: [
      {
        action: String,
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    lastActionKey: { type: String, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

escrowVaultSchema.index({ buyer: 1, createdAt: -1 });
escrowVaultSchema.index({ seller: 1, createdAt: -1 });
escrowVaultSchema.index({ car: 1 });
escrowVaultSchema.index({ deletedAt: 1 });

escrowVaultSchema.statics.softDelete = async function (ids, userId) {
  const idArray = Array.isArray(ids) ? ids : [ids];
  return this.updateMany(
    { _id: { $in: idArray }, deletedAt: null },
    { $set: { deletedAt: new Date(), deletedBy: userId } },
  );
};

escrowVaultSchema.pre(/^find/, function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

escrowVaultSchema.pre("findOneAndUpdate", function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});

escrowVaultSchema.pre("countDocuments", function (next) {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
  next();
});
escrowVaultSchema.pre("aggregate", function () {
  const hasDeletedAt = this.pipeline().some(stage => {
    const stageStr = JSON.stringify(stage);
    return stageStr.includes("deletedAt") || stageStr.includes("deleted_at");
  });
  if (!hasDeletedAt) {
    this.pipeline().unshift({ $match: { deletedAt: null } });
  }
});

export default mongoose.model("EscrowVault", escrowVaultSchema);
