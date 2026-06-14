import mongoose from "mongoose";

const contactShieldSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 PARTICIPANTS
    // =============================
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true,
    },

    // =============================
    // 🔒 SHIELD STATUS
    // =============================
    status: {
      type: String,
      enum: ["active", "unlocked", "expired"],
      default: "active",
      index: true,
    },

    // =============================
    // 🔓 UNLOCK CONDITIONS
    // =============================
    unlockedAt: Date,
    unlockedBy: {
      type: String,
      enum: ["offer_submitted", "escrow_initiated", "admin_override"],
    },
    escrowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    // =============================
    // 📊 METRICS
    // =============================
    contactAttempts: {
      type: Number,
      default: 0,
    },
    lastContactAttemptAt: Date,
    blockedMessages: [
      {
        type: String,
        content: String,
        detectedAt: Date,
        pattern: String,
      },
    ],

    // =============================
    // 🎯 INCENTIVES
    // =============================
    buyerProtectionOffered: {
      type: Boolean,
      default: true,
    },
    vehicleVerificationOffered: {
      type: Boolean,
      default: true,
    },
    disputeResolutionOffered: {
      type: Boolean,
      default: true,
    },
    transferSupportOffered: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Indexes for efficient queries
contactShieldSchema.index({ buyer: 1, car: 1 });
contactShieldSchema.index({ dealer: 1, car: 1 });
contactShieldSchema.index({ status: 1, createdAt: -1 });
contactShieldSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days TTL

export default mongoose.models.ContactShield || mongoose.model("ContactShield", contactShieldSchema);
