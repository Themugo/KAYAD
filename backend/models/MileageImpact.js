// backend/models/MileageImpact.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Mileage Impact model
// Tracks mileage effects on vehicle pricing
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const mileageImpactSchema = new mongoose.Schema(
  {
    // =============================
    // 🚗 VEHICLE TYPE
    // =============================
    vehicle: {
      brand: {
        type: String,
        trim: true,
        index: true,
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
    // 📊 MILEAGE RANGES
    // =============================
    mileageRanges: [
      {
        minMileage: {
          type: Number,
          required: true,
        },
        maxMileage: {
          type: Number,
          required: true,
        },
        averagePrice: {
          type: Number,
          default: 0,
        },
        pricePerMile: {
          type: Number,
          default: 0,
        },
        depreciationFactor: {
          type: Number,
          default: 0,
        },
        sampleSize: {
          type: Number,
          default: 0,
        },
      },
    ],

    // =============================
    // 💰 IMPACT METRICS
    // =============================
    impact: {
      pricePer1000Miles: {
        type: Number,
        default: 0,
      },
      criticalMileage: {
        type: Number,
        default: 100000,
      },
      severeDepreciationThreshold: {
        type: Number,
        default: 150000,
      },
      optimalMileageRange: {
        min: {
          type: Number,
          default: 0,
        },
        max: {
          type: Number,
          default: 50000,
        },
      },
    },

    // =============================
    // 📊 HISTORICAL DATA
    // =============================
    historical: [
      {
        date: Date,
        averagePrice: Number,
        averageMileage: Number,
        pricePerMile: Number,
      },
    ],
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
mileageImpactSchema.index({ "vehicle.brand": 1, "vehicle.bodyType": 1 });
mileageImpactSchema.index({ "vehicle.bodyType": 1 });
mileageImpactSchema.index({ createdAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Calculate mileage impact
mileageImpactSchema.methods.calculateMileageImpact = function (mileage, price) {
  if (mileage === 0 || price === 0) return this;

  const pricePerMile = price / mileage;
  this.impact.pricePer1000Miles = pricePerMile * 1000;

  return this;
};

// Get price per mile
mileageImpactSchema.methods.getPricePerMile = function (mileage) {
  const range = this.mileageRanges.find((r) => mileage >= r.minMileage && mileage <= r.maxMileage);

  return range ? range.pricePerMile : 0;
};

// Predict mileage depreciation
mileageImpactSchema.methods.predictMileageDepreciation = function (mileage, basePrice) {
  if (mileage === 0 || basePrice === 0) return 0;

  const pricePerMile = this.getPricePerMile(mileage);
  const depreciation = pricePerMile * mileage;

  return Math.min(depreciation, basePrice * 0.5); // Max 50% depreciation from mileage
};

// Add mileage range
mileageImpactSchema.methods.addMileageRange = function (
  minMileage,
  maxMileage,
  averagePrice,
  pricePerMile,
  depreciationFactor,
  sampleSize,
) {
  const existingRange = this.mileageRanges.find((r) => r.minMileage === minMileage && r.maxMileage === maxMileage);

  if (existingRange) {
    existingRange.averagePrice = averagePrice;
    existingRange.pricePerMile = pricePerMile;
    existingRange.depreciationFactor = depreciationFactor;
    existingRange.sampleSize = sampleSize;
  } else {
    this.mileageRanges.push({
      minMileage,
      maxMileage,
      averagePrice,
      pricePerMile,
      depreciationFactor,
      sampleSize,
    });
  }

  // Sort ranges by mileage
  this.mileageRanges.sort((a, b) => a.minMileage - b.minMileage);

  return this;
};

// Add historical data
mileageImpactSchema.methods.addHistoricalData = function (averagePrice, averageMileage, pricePerMile) {
  this.historical.push({
    date: new Date(),
    averagePrice,
    averageMileage,
    pricePerMile,
  });

  // Keep only last 50 entries
  if (this.historical.length > 50) {
    this.historical = this.historical.slice(-50);
  }

  return this;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Get mileage impact by vehicle type
mileageImpactSchema.statics.getByVehicleType = async function (filters = {}) {
  return this.find(filters).lean();
};

// Get mileage impact by brand
mileageImpactSchema.statics.getByBrand = async function (brand) {
  return this.find({ "vehicle.brand": brand }).lean();
};

// Get mileage impact by body type
mileageImpactSchema.statics.getByBodyType = async function (bodyType) {
  return this.find({ "vehicle.bodyType": bodyType }).lean();
};

// Calculate mileage impact from valuations
mileageImpactSchema.statics.calculateFromValuations = async function (filters = {}) {
  const VehicleValuation = mongoose.model("VehicleValuation");

  const query = {
    "pricing.salePrice": { $gt: 0 },
    "vehicle.mileage": { $gt: 0 },
    ...filters,
  };

  const valuations = await VehicleValuation.find(query).lean();

  if (valuations.length === 0) return null;

  // Group by mileage ranges
  const mileageRanges = [
    { min: 0, max: 10000 },
    { min: 10001, max: 30000 },
    { min: 30001, max: 50000 },
    { min: 50001, max: 75000 },
    { min: 75001, max: 100000 },
    { min: 100001, max: 125000 },
    { min: 125001, max: 150000 },
    { min: 150001, max: 200000 },
    { min: 200001, max: Infinity },
  ];

  const rangeData = mileageRanges
    .map((range) => {
      const rangeValuations = valuations.filter(
        (v) => v.vehicle.mileage >= range.min && v.vehicle.mileage <= range.max,
      );

      if (rangeValuations.length === 0) return null;

      const prices = rangeValuations.map((v) => v.pricing.salePrice);
      const mileages = rangeValuations.map((v) => v.vehicle.mileage);

      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const averageMileage = mileages.reduce((sum, mileage) => sum + mileage, 0) / mileages.length;
      const pricePerMile = averagePrice / averageMileage;

      return {
        minMileage: range.min,
        maxMileage: range.max === Infinity ? 999999 : range.max,
        averagePrice,
        pricePerMile,
        depreciationFactor: pricePerMile / averagePrice,
        sampleSize: rangeValuations.length,
      };
    })
    .filter((r) => r !== null);

  // Calculate overall impact metrics
  const pricePer1000Miles =
    rangeData.length > 0 ? (rangeData.reduce((sum, r) => sum + r.pricePerMile, 0) / rangeData.length) * 1000 : 0;

  return {
    vehicle: filters.vehicle || {},
    mileageRanges: rangeData,
    impact: {
      pricePer1000Miles,
      criticalMileage: 100000,
      severeDepreciationThreshold: 150000,
      optimalMileageRange: {
        min: 0,
        max: 50000,
      },
    },
  };
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const MileageImpact = mongoose.models.MileageImpact || mongoose.model("MileageImpact", mileageImpactSchema);

export default MileageImpact;
