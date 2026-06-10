import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    // =============================
    // 👤 DEALER
    // =============================
    dealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // =============================
    // 📦 PLAN
    // =============================
    plan: {
      type: String,
      enum: ["starter", "growth", "enterprise"],
      required: true,
      index: true,
    },

    // =============================
    // 📊 PLAN LIMITS
    // =============================
    limits: {
      maxListings: { type: Number, default: 20 },
      maxAuctions: { type: Number, default: 5 },
      featuredListings: { type: Number, default: 0 },
      analyticsAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
    },

    // =============================
    // 💰 PRICING
    // =============================
    pricing: {
      monthly: { type: Number, required: true },
      annual: { type: Number, required: true },
      currency: { type: String, default: "KES" },
    },

    // =============================
    // 📅 BILLING
    // =============================
    status: {
      type: String,
      enum: ["active", "past_due", "cancelled", "expired"],
      default: "active",
      index: true,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "annual"],
      default: "monthly",
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // =============================
    // 💳 PAYMENT
    // =============================
    paymentMethod: {
      type: String,
      enum: ["mpesa", "card", "bank_transfer"],
    },
    paymentDetails: {
      type: Object,
      default: {},
    },

    // =============================
    // 📈 USAGE
    // =============================
    usage: {
      currentListings: { type: Number, default: 0 },
      currentAuctions: { type: Number, default: 0 },
      featuredUsed: { type: Number, default: 0 },
    },

    // =============================
    // 🎯 FEATURES
    // =============================
    features: [{
      name: String,
      enabled: Boolean,
      expiresAt: Date,
    }],

    // =============================
    // 📋 METADATA
    // =============================
    trialEndsAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    upgradedFrom: String,
    upgradedAt: Date,
  },
  { timestamps: true },
);

// Indexes for efficient queries
subscriptionSchema.index({ dealer: 1, status: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: -1 });
subscriptionSchema.index({ plan: 1, status: 1 });

export default mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);
