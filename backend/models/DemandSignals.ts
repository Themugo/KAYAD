// backend/models/DemandSignals.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Demand Signals model
// Tracks market demand signals from search analytics
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const demandSignalsSchema = new mongoose.Schema(
  {
    // =============================
    // 🔍 SEARCH DATA
    // =============================
    search: {
      searchTerm: {
        type: String,
        trim: true,
        index: true,
      },
      normalizedTerm: {
        type: String,
        trim: true,
        index: true,
      },
      filters: {
        brand: {
          type: String,
          trim: true,
        },
        model: {
          type: String,
          trim: true,
        },
        year: {
          min: Number,
          max: Number,
        },
        price: {
          min: Number,
          max: Number,
        },
        location: {
          type: String,
          trim: true,
        },
        county: {
          type: String,
          trim: true,
          index: true,
        },
        bodyType: {
          type: String,
          trim: true,
        },
        fuelType: {
          type: String,
          trim: true,
        },
        transmission: {
          type: String,
          trim: true,
        },
        mileage: {
          max: Number,
        },
        condition: {
          type: String,
          trim: true,
        },
      },
    },

    // =============================
    // 📊 DEMAND METRICS
    // =============================
    demand: {
      searchVolume: {
        type: Number,
        default: 0,
      },
      trend: {
        type: String,
        enum: ["increasing", "decreasing", "stable"],
        default: "stable",
      },
      trendPercent: {
        type: Number,
        default: 0,
      },
      competitionLevel: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      urgencyScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
    },

    // =============================
    // 💰 PRICE IMPACT
    // =============================
    priceImpact: {
      averagePrice: {
        type: Number,
        default: 0,
      },
      pricePremium: {
        type: Number,
        default: 0,
      },
      priceDiscount: {
        type: Number,
        default: 0,
      },
      demandMultiplier: {
        type: Number,
        default: 1,
      },
    },

    // =============================
    // 📅 TIME PERIOD
    // =============================
    period: {
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: {
        type: Date,
      },
    },

    // =============================
    // 📊 HISTORICAL DATA
    // =============================
    historical: [
      {
        date: Date,
        searchVolume: Number,
        averagePrice: Number,
        demandMultiplier: Number,
      },
    ],
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
demandSignalsSchema.index({ "search.searchTerm": 1 });
demandSignalsSchema.index({ "search.normalizedTerm": 1 });
demandSignalsSchema.index({ "search.county": 1 });
demandSignalsSchema.index({ "search.filters.brand": 1 });
demandSignalsSchema.index({ "period.startDate": -1 });
demandSignalsSchema.index({ createdAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Calculate demand score
demandSignalsSchema.methods.calculateDemandScore = function (searchVolume, competitionLevel) {
  const normalizedVolume = Math.min(searchVolume / 1000, 1);
  const demandScore = normalizedVolume * 0.7 + (1 - competitionLevel) * 0.3;
  this.demand.urgencyScore = demandScore;
  return this;
};

// Update trend
demandSignalsSchema.methods.updateTrend = function (previousVolume) {
  if (previousVolume > 0) {
    const percentChange = ((this.demand.searchVolume - previousVolume) / previousVolume) * 100;

    if (percentChange > 10) {
      this.demand.trend = "increasing";
    } else if (percentChange < -10) {
      this.demand.trend = "decreasing";
    } else {
      this.demand.trend = "stable";
    }

    this.demand.trendPercent = Math.abs(percentChange);
  }
  return this;
};

// Calculate price impact
demandSignalsSchema.methods.calculatePriceImpact = function (marketAveragePrice) {
  if (this.demand.urgencyScore > 0.7) {
    this.priceImpact.demandMultiplier = 1.1;
    this.priceImpact.pricePremium = marketAveragePrice * 0.1;
  } else if (this.demand.urgencyScore < 0.3) {
    this.priceImpact.demandMultiplier = 0.9;
    this.priceImpact.priceDiscount = marketAveragePrice * 0.1;
  } else {
    this.priceImpact.demandMultiplier = 1.0;
  }

  return this;
};

// Add historical data
demandSignalsSchema.methods.addHistoricalData = function () {
  this.historical.push({
    date: new Date(),
    searchVolume: this.demand.searchVolume,
    averagePrice: this.priceImpact.averagePrice,
    demandMultiplier: this.priceImpact.demandMultiplier,
  });

  // Keep only last 100 entries
  if (this.historical.length > 100) {
    this.historical = this.historical.slice(-100);
  }

  return this;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Get demand signals by search term
demandSignalsSchema.statics.getBySearchTerm = async function (searchTerm) {
  return this.find({ "search.searchTerm": searchTerm }).sort({ "period.startDate": -1 }).limit(12).lean();
};

// Get demand signals by county
demandSignalsSchema.statics.getByCounty = async function (county) {
  return this.find({ "search.county": county }).sort({ "period.startDate": -1 }).limit(12).lean();
};

// Get demand signals by brand
demandSignalsSchema.statics.getByBrand = async function (brand) {
  return this.find({ "search.filters.brand": brand }).sort({ "period.startDate": -1 }).limit(12).lean();
};

// Get latest demand signals
demandSignalsSchema.statics.getLatest = async function (filters = {}) {
  return this.findOne(filters).sort({ "period.startDate": -1 }).lean();
};

// Get demand trend
demandSignalsSchema.statics.getDemandTrend = async function (filters = {}) {
  const demandSignals = await this.find(filters).sort({ "period.startDate": -1 }).limit(12).lean();

  if (demandSignals.length < 2) return null;

  const latest = demandSignals[0];
  const previous = demandSignals[demandSignals.length - 1];

  const percentChange =
    ((latest.demand.searchVolume - previous.demand.searchVolume) / previous.demand.searchVolume) * 100;

  return {
    direction: percentChange > 10 ? "increasing" : percentChange < -10 ? "decreasing" : "stable",
    percentChange: Math.abs(percentChange),
    latestVolume: latest.demand.searchVolume,
    previousVolume: previous.demand.searchVolume,
    dataPoints: demandSignals.length,
  };
};

// Calculate demand signals from search analytics
demandSignalsSchema.statics.calculateFromSearchAnalytics = async function (filters = {}) {
  const SearchAnalytics = mongoose.model("SearchAnalytics");

  const query = {
    ...filters,
  };

  const searchAnalytics = await SearchAnalytics.find(query).lean();

  if (searchAnalytics.length === 0) return null;

  const searchVolume = searchAnalytics.length;
  const averageResultCount = searchAnalytics.reduce((sum, s) => sum + s.resultCount, 0) / searchAnalytics.length;
  const competitionLevel = Math.min(averageResultCount / 100, 1);

  return {
    search: filters.search || {},
    demand: {
      searchVolume,
      competitionLevel,
      urgencyScore: 0, // Will be calculated
    },
    period: {
      startDate: new Date(),
    },
  };
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const DemandSignals = mongoose.models.DemandSignals || mongoose.model("DemandSignals", demandSignalsSchema);

export default DemandSignals;
