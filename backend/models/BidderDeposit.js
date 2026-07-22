import mongoose from "mongoose";
import crypto from "crypto";

const bidderDepositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ["basic", "premium"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "KES",
    },
    paymentMethod: {
      type: String,
      enum: ["mpesa", "bank_wire", "card"],
      required: true,
    },
    paymentReference: {
      type: String,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "verified", "rejected", "refunded"],
      default: "pending",
      index: true,
    },
    mpesaReceiptNumber: {
      type: String,
    },
    bankReference: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
    },
    biometricVerified: {
      type: Boolean,
      default: false,
    },
    biometricVerifiedAt: {
      type: Date,
    },
    kycLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
bidderDepositSchema.index({ user: 1, status: 1 });
bidderDepositSchema.index({ paymentReference: 1 });
bidderDepositSchema.index({ createdAt: -1 });

// Generate unique deposit reference
bidderDepositSchema.pre("save", function (next) {
  if (!this.paymentReference) {
    this.paymentReference = `KD-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  }
  if (!this.expiresAt && this.status === "pending") {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

// Virtual for checking if deposit is active
bidderDepositSchema.virtual("isActive").get(function () {
  return this.status === "verified" && (!this.expiresAt || this.expiresAt > new Date());
});

// Check if user has premium access
bidderDepositSchema.methods.hasPremiumAccess = function () {
  return this.tier === "premium" && this.status === "verified";
};

const BidderDeposit = mongoose.model("BidderDeposit", bidderDepositSchema);

export default BidderDeposit;
