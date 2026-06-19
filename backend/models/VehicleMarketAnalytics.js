// backend/models/VehicleMarketAnalytics.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Vehicle Market Analytics model
// Tracks market trends, prices, and vehicle performance metrics
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const vehicleMarketAnalyticsSchema = new mongoose.Schema(
  {
    // =============================
    // 📊 METADATA
    // =============================
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly", "quarterly", "yearly"],
      required: true,
      index: true,
    },

    startDate: {
      type: Date,
      required: true,
      index: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // =============================
    // 💰 PRICE METRICS
    // =============================
    averageSellingPrice: {
      type: Number,
    },

    averageListingPrice: {
      type: Number,
    },

    priceRange: {
      min: Number,
      max: Number,
      median: Number,
    },

    // =============================
    // ⏱️ TIME METRICS
    // =============================
    averageDaysOnMarket: {
      type: Number,
    },

    medianDaysOnMarket: {
      type: Number,
    },

    fastestSaleDays: {
      type: Number,
    },

    // =============================
    // 📈 VOLUME METRICS
    // =============================
    totalListings: {
      type: Number,
      default: 0,
    },

    totalSales: {
      type: Number,
      default: 0,
    },

    totalAuctions: {
      type: Number,
      default: 0,
    },

    conversionRate: {
      type: Number,
    },

    // =============================
    // 🏆 TOP VEHICLES
    // =============================
    mostViewed: [
      {
        carId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Car",
        },
        title: String,
        views: Number,
        price: Number,
      },
    ],

    fastestSelling: [
      {
        carId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Car",
        },
        title: String,
        daysOnMarket: Number,
        sellingPrice: Number,
      },
    ],

    // =============================
    // 🔍 SEARCH TRENDS
    // =============================
    topSearches: [
      {
        filters: {
          type: Object,
          default: {},
        },
        count: Number,
      },
    ],

    // =============================
    // 📍 COUNTY TRENDS
    // =============================
    countyTrends: [
      {
        county: String,
        averagePrice: Number,
        volume: Number,
        daysOnMarket: Number,
      },
    ],

    // =============================
    // 🚗 BRAND TRENDS
    // =============================
    brandTrends: [
      {
        brand: String,
        averagePrice: Number,
        volume: Number,
        daysOnMarket: Number,
        marketShare: Number,
      },
    ],

    // =============================
    // 📋 MODEL TRENDS
    // =============================
    modelTrends: [
      {
        brand: String,
        model: String,
        averagePrice: Number,
        volume: Number,
        daysOnMarket: Number,
      },
    ],

    // =============================
    // 📊 BREAKDOWN BY SPECS
    // =============================
    fuelTypeTrends: [
      {
        type: String,
        averagePrice: Number,
        volume: Number,
      },
    ],

    transmissionTrends: [
      {
        type: String,
        averagePrice: Number,
        volume: Number,
      },
    ],

    bodyTypeTrends: [
      {
        type: String,
        averagePrice: Number,
        volume: Number,
      },
    ],

    // =============================
    // 📈 TREND DATA (for charts)
    // =============================
    priceTrend: [
      {
        date: Date,
        averagePrice: Number,
        volume: Number,
      },
    ],

    volumeTrend: [
      {
        date: Date,
        listings: Number,
        sales: Number,
      },
    ],
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
vehicleMarketAnalyticsSchema.index({ period: 1, startDate: -1 });
vehicleMarketAnalyticsSchema.index({ startDate: 1, endDate: 1 });
vehicleMarketAnalyticsSchema.index({ period: 1, endDate: -1 });

// =============================
// ⚡ STATIC: GENERATE DAILY ANALYTICS
// =============================
vehicleMarketAnalyticsSchema.statics.generateDailyAnalytics = async function (date = new Date()) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return this.findOne({
    period: "daily",
    startDate,
    endDate,
  });
};

// =============================
// ⚡ STATIC: GENERATE WEEKLY ANALYTICS
// =============================
vehicleMarketAnalyticsSchema.statics.generateWeeklyAnalytics = async function (date = new Date()) {
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return this.findOne({
    period: "weekly",
    startDate,
    endDate,
  });
};

// =============================
// ⚡ STATIC: GENERATE MONTHLY ANALYTICS
// =============================
vehicleMarketAnalyticsSchema.statics.generateMonthlyAnalytics = async function (date = new Date()) {
  const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endDate.setHours(23, 59, 59, 999);

  return this.findOne({
    period: "monthly",
    startDate,
    endDate,
  });
};

// =============================
// ⚡ STATIC: GET TREND DATA
// =============================
vehicleMarketAnalyticsSchema.statics.getTrendData = async function (metric, startDate, endDate) {
  const analytics = await this.find({
    startDate: { $gte: startDate },
    endDate: { $lte: endDate },
  }).sort({ startDate: 1 });

  return analytics.map((a) => ({
    date: a.startDate,
    value: a[metric],
  }));
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const VehicleMarketAnalytics =
  mongoose.models.VehicleMarketAnalytics || mongoose.model("VehicleMarketAnalytics", vehicleMarketAnalyticsSchema);

export default VehicleMarketAnalytics;
