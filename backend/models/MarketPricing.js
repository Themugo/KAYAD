// backend/models/MarketPricing.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Market Pricing model
// Tracks county-level pricing data and market metrics
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const marketPricingSchema = new mongoose.Schema(
  {
    // =============================
    // 📍 LOCATION
    // =============================
    county: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // =============================
    // 🚗 VEHICLE CATEGORY
    // =============================
    vehicle: {
      brand: {
        type: String,
        trim: true,
        index: true,
      },
      model: {
        type: String,
        trim: true,
      },
      bodyType: {
        type: String,
        trim: true,
        index: true,
      },
      fuelType: {
        type: String,
        trim: true,
      },
    },

    // =============================
    // 💰 PRICING DATA
    // =============================
    pricing: {
      averagePrice: {
        type: Number,
        default: 0,
      },
      medianPrice: {
        type: Number,
        default: 0,
      },
      priceRange: {
        low: {
          type: Number,
          default: 0,
        },
        high: {
          type: Number,
          default: 0,
        },
      },
      pricePerMile: {
        type: Number,
        default: 0,
      },
    },

    // =============================
    // 📊 MARKET METRICS
    // =============================
    metrics: {
      totalListings: {
        type: Number,
        default: 0,
      },
      totalSales: {
        type: Number,
        default: 0,
      },
      averageDaysOnMarket: {
        type: Number,
        default: 0,
      },
      demandScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
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
    // 📊 TREND DATA
    // =============================
    trend: {
      direction: {
        type: String,
        enum: ["increasing", "decreasing", "stable"],
        default: "stable",
      },
      percentChange: {
        type: Number,
        default: 0,
      },
    },

    // =============================
    // 📊 HISTORICAL DATA
    // =============================
    historical: [{
      date: Date,
      averagePrice: Number,
      medianPrice: Number,
      totalListings: Number,
    }],
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
marketPricingSchema.index({ county: 1, "vehicle.brand": 1 });
marketPricingSchema.index({ county: 1, "vehicle.bodyType": 1 });
marketPricingSchema.index({ "period.startDate": -1 });
marketPricingSchema.index({ createdAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Calculate average price
marketPricingSchema.methods.calculateAveragePrice = function (prices) {
  if (prices.length === 0) return this;
  
  const sum = prices.reduce((acc, price) => acc + price, 0);
  this.pricing.averagePrice = sum / prices.length;
  return this;
};

// Calculate price range
marketPricingSchema.methods.calculatePriceRange = function (prices) {
  if (prices.length === 0) return this;
  
  const sortedPrices = prices.sort((a, b) => a - b);
  const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
  const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
  
  this.pricing.priceRange.low = q1;
  this.pricing.priceRange.high = q3;
  return this;
};

// Update trend
marketPricingSchema.methods.updateTrend = function (previousAveragePrice) {
  if (previousAveragePrice > 0) {
    const percentChange = ((this.pricing.averagePrice - previousAveragePrice) / previousAveragePrice) * 100;
    
    if (percentChange > 5) {
      this.trend.direction = "increasing";
    } else if (percentChange < -5) {
      this.trend.direction = "decreasing";
    } else {
      this.trend.direction = "stable";
    }
    
    this.trend.percentChange = Math.abs(percentChange);
  }
  return this;
};

// Add historical data
marketPricingSchema.methods.addHistoricalData = function () {
  this.historical.push({
    date: new Date(),
    averagePrice: this.pricing.averagePrice,
    medianPrice: this.pricing.medianPrice,
    totalListings: this.metrics.totalListings,
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

// Get market pricing by county
marketPricingSchema.statics.getByCounty = async function (county) {
  return this.find({ county })
    .sort({ "period.startDate": -1 })
    .limit(12)
    .lean();
};

// Get market pricing by county and brand
marketPricingSchema.statics.getByCountyAndBrand = async function (county, brand) {
  return this.find({ county, "vehicle.brand": brand })
    .sort({ "period.startDate": -1 })
    .limit(12)
    .lean();
};

// Get market pricing by county and body type
marketPricingSchema.statics.getByCountyAndBodyType = async function (county, bodyType) {
  return this.find({ county, "vehicle.bodyType": bodyType })
    .sort({ "period.startDate": -1 })
    .limit(12)
    .lean();
};

// Get latest market pricing
marketPricingSchema.statics.getLatest = async function (county, filters = {}) {
  const query = { county, ...filters };
  return this.findOne(query)
    .sort({ "period.startDate": -1 })
    .lean();
};

// Get market pricing trend
marketPricingSchema.statics.getMarketTrend = async function (county, filters = {}) {
  const query = { county, ...filters };
  const marketPricings = await this.find(query)
    .sort({ "period.startDate": -1 })
    .limit(12)
    .lean();
  
  if (marketPricings.length < 2) return null;
  
  const latest = marketPricings[0];
  const previous = marketPricings[marketPricings.length - 1];
  
  const percentChange = ((latest.pricing.averagePrice - previous.pricing.averagePrice) / previous.pricing.averagePrice) * 100;
  
  return {
    direction: percentChange > 5 ? "increasing" : percentChange < -5 ? "decreasing" : "stable",
    percentChange: Math.abs(percentChange),
    latestPrice: latest.pricing.averagePrice,
    previousPrice: previous.pricing.averagePrice,
    dataPoints: marketPricings.length,
  };
};

// Calculate market pricing from valuations
marketPricingSchema.statics.calculateFromValuations = async function (county, filters = {}) {
  const VehicleValuation = mongoose.model("VehicleValuation");
  
  const query = {
    "location.county": county,
    "pricing.salePrice": { $gt: 0 },
    ...filters,
  };
  
  const valuations = await VehicleValuation.find(query).lean();
  
  if (valuations.length === 0) return null;
  
  const prices = valuations.map(v => v.pricing.salePrice);
  const sortedPrices = prices.sort((a, b) => a - b);
  
  const sum = prices.reduce((acc, price) => acc + price, 0);
  const averagePrice = sum / prices.length;
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
  
  const q1 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
  const q3 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
  
  return {
    county,
    vehicle: filters.vehicle || {},
    pricing: {
      averagePrice,
      medianPrice,
      priceRange: {
        low: q1,
        high: q3,
      },
    },
    metrics: {
      totalListings: valuations.length,
      totalSales: valuations.filter(v => v.pricing.salePrice > 0).length,
    },
  };
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const MarketPricing = mongoose.models.MarketPricing || mongoose.model("MarketPricing", marketPricingSchema);

export default MarketPricing;
