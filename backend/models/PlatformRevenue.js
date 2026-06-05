// models/PlatformRevenue.js

import mongoose from "mongoose";

const platformRevenueSchema = new mongoose.Schema(
  {
    // =============================
    // 💰 AMOUNT
    // =============================
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "KES",
    },

    // =============================
    // 🧾 SOURCE (EXPANDED 🔥)
    // =============================
    source: {
      type: String,
      enum: [
        "listing",
        "boost",
        "subscription",
        "bid_fee",
        "commission",   // 🔥 from escrow release
        "penalty",
        "other",
      ],
      default: "other",
      index: true,
    },

    // =============================
    // 👤 DEALER (OPTIONAL)
    // =============================
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // =============================
    // 🚗 CAR (OPTIONAL)
    // =============================
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      index: true,
    },

    // =============================
    // 💳 PAYMENT LINK
    // =============================
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },

    // =============================
    // 🔗 ESCROW LINK (NEW 🔥)
    // =============================
    escrowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escrow",
      index: true,
    },

    // =============================
    // 🧾 DESCRIPTION
    // =============================
    description: {
      type: String,
      default: "",
    },

    // =============================
    // 🧠 FLEXIBLE METADATA
    // =============================
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

// =============================
// 🔥 INDEXES (OPTIMIZED)
// =============================

// time-based dashboards
platformRevenueSchema.index({ createdAt: -1 });

// analytics by source
platformRevenueSchema.index({ source: 1, createdAt: -1 });

// dealer earnings tracking
platformRevenueSchema.index({ dealerId: 1, createdAt: -1 });

// car revenue tracking
platformRevenueSchema.index({ carId: 1 });

// payment reconciliation
platformRevenueSchema.index({ paymentId: 1 });

// escrow reconciliation
platformRevenueSchema.index({ escrowId: 1 });

// =============================
// ⚡ STATICS
// =============================

// ✅ TOTAL REVENUE
platformRevenueSchema.statics.getTotalRevenue = function () {
  return this.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
};

// ✅ DAILY REVENUE
platformRevenueSchema.statics.getDailyRevenue = function () {
  return this.aggregate([
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        revenue: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// ✅ REVENUE BY SOURCE (NEW 🔥)
platformRevenueSchema.statics.getRevenueBySource = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$source",
        total: { $sum: "$amount" },
      },
    },
    { $sort: { total: -1 } },
  ]);
};

// =============================
// ⚡ METHOD: RECORD REVENUE
// =============================
platformRevenueSchema.statics.record = function (data) {
  return this.create(data);
};

// =============================
// 🚀 EXPORT
// =============================
const PlatformRevenue =
  mongoose.models.PlatformRevenue ||
  mongoose.model("PlatformRevenue", platformRevenueSchema);

export default PlatformRevenue;