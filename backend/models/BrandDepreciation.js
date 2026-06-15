// backend/models/BrandDepreciation.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Brand Depreciation model
// Tracks brand-specific depreciation patterns and market position
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const brandDepreciationSchema = new mongoose.Schema(
  {
    // =============================
    // 🚗 BRAND
    // =============================
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // =============================
    // 📊 DEPRECIATION DATA
    // =============================
    depreciation: {
      annualRate: {
        type: Number,
        default: 0,
      },
      fiveYearRate: {
        type: Number,
        default: 0,
      },
      tenYearRate: {
        type: Number,
        default: 0,
      },
      resaleValue: {
        after1Year: {
          type: Number,
          default: 0,
        },
        after3Years: {
          type: Number,
          default: 0,
        },
        after5Years: {
          type: Number,
          default: 0,
        },
        after10Years: {
          type: Number,
          default: 0,
        },
      },
    },

    // =============================
    // 📈 MARKET POSITION
    // =============================
    market: {
      reliabilityScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 10,
      },
      popularityScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 10,
      },
      maintenanceCost: {
        type: Number,
        default: 0,
        min: 0,
        max: 10,
      },
      fuelEfficiency: {
        type: Number,
        default: 0,
        min: 0,
        max: 10,
      },
    },

    // =============================
    // 📊 HISTORICAL DATA
    // =============================
    historical: [{
      year: Number,
      averagePrice: Number,
      depreciationRate: Number,
      sampleSize: Number,
    }],

    // =============================
    // 📊 CATEGORY DATA
    // =============================
    categories: [{
      bodyType: String,
      depreciationRate: Number,
      averagePrice: Number,
    }],
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
brandDepreciationSchema.index({ brand: 1 });
brandDepreciationSchema.index({ "market.reliabilityScore": -1 });
brandDepreciationSchema.index({ "market.popularityScore": -1 });
brandDepreciationSchema.index({ createdAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Calculate depreciation rate
brandDepreciationSchema.methods.calculateDepreciationRate = function (prices) {
  if (prices.length < 2) return this;
  
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const years = prices.length - 1;
  
  const depreciationRate = ((firstPrice - lastPrice) / firstPrice) / years;
  this.depreciation.annualRate = depreciationRate;
  this.depreciation.fiveYearRate = depreciationRate * 5;
  this.depreciation.tenYearRate = depreciationRate * 10;
  
  return this;
};

// Predict resale value
brandDepreciationSchema.methods.predictResaleValue = function (currentPrice, years) {
  if (this.depreciation.annualRate === 0) return currentPrice;
  
  const depreciationFactor = Math.pow(1 - this.depreciation.annualRate, years);
  return currentPrice * depreciationFactor;
};

// Update historical data
brandDepreciationSchema.methods.updateHistoricalData = function (year, averagePrice, depreciationRate, sampleSize) {
  this.historical.push({
    year,
    averagePrice,
    depreciationRate,
    sampleSize,
  });
  
  // Keep only last 20 entries
  if (this.historical.length > 20) {
    this.historical = this.historical.slice(-20);
  }
  
  return this;
};

// Add category data
brandDepreciationSchema.methods.addCategoryData = function (bodyType, depreciationRate, averagePrice) {
  const existingCategory = this.categories.find(c => c.bodyType === bodyType);
  
  if (existingCategory) {
    existingCategory.depreciationRate = depreciationRate;
    existingCategory.averagePrice = averagePrice;
  } else {
    this.categories.push({
      bodyType,
      depreciationRate,
      averagePrice,
    });
  }
  
  return this;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Get brand depreciation by brand
brandDepreciationSchema.statics.getByBrand = async function (brand) {
  return this.findOne({ brand })
    .lean();
};

// Get all brand depreciations
brandDepreciationSchema.statics.getAll = async function () {
  return this.find({})
    .sort({ "market.popularityScore": -1 })
    .lean();
};

// Get top brands by reliability
brandDepreciationSchema.statics.getTopByReliability = async function (limit = 10) {
  return this.find({})
    .sort({ "market.reliabilityScore": -1 })
    .limit(limit)
    .lean();
};

// Get top brands by popularity
brandDepreciationSchema.statics.getTopByPopularity = async function (limit = 10) {
  return this.find({})
    .sort({ "market.popularityScore": -1 })
    .limit(limit)
    .lean();
};

// Calculate brand depreciation from valuations
brandDepreciationSchema.statics.calculateFromValuations = async function (brand) {
  const VehicleValuation = mongoose.model("VehicleValuation");
  
  const valuations = await VehicleValuation.find({
    "vehicle.brand": brand,
    "pricing.salePrice": { $gt: 0 },
  })
    .sort({ "vehicle.year": -1 })
    .lean();
  
  if (valuations.length === 0) return null;
  
  // Group by year
  const yearGroups = {};
  valuations.forEach(v => {
    const year = v.vehicle.year;
    if (!yearGroups[year]) {
      yearGroups[year] = [];
    }
    yearGroups[year].push(v.pricing.salePrice);
  });
  
  // Calculate average price per year
  const yearlyPrices = Object.keys(yearGroups)
    .sort((a, b) => b - a)
    .map(year => ({
      year: parseInt(year),
      averagePrice: yearGroups[year].reduce((sum, price) => sum + price, 0) / yearGroups[year].length,
      sampleSize: yearGroups[year].length,
    }));
  
  if (yearlyPrices.length < 2) return null;
  
  // Calculate depreciation rate
  const firstPrice = yearlyPrices[0].averagePrice;
  const lastPrice = yearlyPrices[yearlyPrices.length - 1].averagePrice;
  const years = yearlyPrices[0].year - yearlyPrices[yearlyPrices.length - 1].year;
  
  const depreciationRate = years > 0 ? ((firstPrice - lastPrice) / firstPrice) / years : 0;
  
  return {
    brand,
    depreciation: {
      annualRate: depreciationRate,
      fiveYearRate: depreciationRate * 5,
      tenYearRate: depreciationRate * 10,
      resaleValue: {
        after1Year: firstPrice * (1 - depreciationRate),
        after3Years: firstPrice * Math.pow(1 - depreciationRate, 3),
        after5Years: firstPrice * Math.pow(1 - depreciationRate, 5),
        after10Years: firstPrice * Math.pow(1 - depreciationRate, 10),
      },
    },
    historical: yearlyPrices,
  };
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const BrandDepreciation = mongoose.models.BrandDepreciation || mongoose.model("BrandDepreciation", brandDepreciationSchema);

export default BrandDepreciation;
