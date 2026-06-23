// backend/models/VehicleValuation.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Vehicle Valuation model
// Tracks vehicle pricing data and valuation metrics for AI training
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";

const vehicleValuationSchema = new mongoose.Schema(
  {
    // =============================
    // 🔗 VEHICLE REFERENCE
    // =============================
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      index: true,
    },

    // =============================
    // 🚗 VEHICLE FEATURES
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
      year: {
        type: Number,
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
      color: {
        type: String,
        trim: true,
      },
      condition: {
        type: String,
        trim: true,
      },
      mileage: {
        type: Number,
        index: true,
      },
    },

    // =============================
    // 📍 LOCATION
    // =============================
    location: {
      city: {
        type: String,
        trim: true,
        index: true,
      },
      county: {
        type: String,
        trim: true,
        index: true,
      },
      coordinates: {
        type: { type: String },
        coordinates: [Number],
      },
    },

    // =============================
    // 💰 PRICING DATA
    // =============================
    pricing: {
      listingPrice: {
        type: Number,
        default: 0,
      },
      salePrice: {
        type: Number,
        default: 0,
      },
      auctionPrice: {
        type: Number,
        default: 0,
      },
      escrowPrice: {
        type: Number,
        default: 0,
      },
      priceDifference: {
        type: Number,
        default: 0,
      },
      priceChangePercent: {
        type: Number,
        default: 0,
      },
    },

    // =============================
    // 📊 VALUATION METRICS
    // =============================
    valuation: {
      estimatedValue: {
        type: Number,
        default: 0,
      },
      confidence: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
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
      marketPosition: {
        type: {
          type: String,
          enum: ["below_market", "fair_market", "above_market"],
        },
        percent: {
          type: Number,
          default: 0,
        },
      },
    },

    // =============================
    // 📈 HISTORICAL DATA
    // =============================
    historical: {
      previousPrices: [
        {
          price: Number,
          date: Date,
          source: {
            type: String,
            enum: ["listing", "auction", "escrow", "external"],
          },
        },
      ],
      priceHistory: [
        {
          date: Date,
          price: Number,
          source: {
            type: String,
            enum: ["listing", "auction", "escrow", "external"],
          },
        },
      ],
    },

    // =============================
    // 📊 MARKET DATA
    // =============================
    market: {
      demandScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      competitionLevel: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      daysOnMarket: {
        type: Number,
        default: 0,
      },
      viewCount: {
        type: Number,
        default: 0,
      },
      inquiryCount: {
        type: Number,
        default: 0,
      },
    },

    // =============================
    // 🔍 SOURCE
    // =============================
    source: {
      type: String,
      enum: ["listing", "auction", "escrow", "external"],
      index: true,
    },

    // =============================
    // 📅 TIMESTAMPS
    // =============================
    valuationDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    saleDate: {
      type: Date,
    },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
vehicleValuationSchema.index({ "vehicle.brand": 1, "vehicle.model": 1, "vehicle.year": 1 });
vehicleValuationSchema.index({ "location.county": 1, valuationDate: -1 });
vehicleValuationSchema.index({ source: 1, valuationDate: -1 });
vehicleValuationSchema.index({ "pricing.salePrice": 1 });
vehicleValuationSchema.index({ createdAt: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Calculate price difference
vehicleValuationSchema.methods.calculatePriceDifference = function () {
  if (this.pricing.salePrice > 0 && this.pricing.listingPrice > 0) {
    this.pricing.priceDifference = this.pricing.salePrice - this.pricing.listingPrice;
    this.pricing.priceChangePercent = (this.pricing.priceDifference / this.pricing.listingPrice) * 100;
  }
  return this;
};

// Update market position
vehicleValuationSchema.methods.updateMarketPosition = function (marketAveragePrice) {
  if (marketAveragePrice > 0) {
    const percentDifference = ((this.pricing.listingPrice - marketAveragePrice) / marketAveragePrice) * 100;

    if (percentDifference < -10) {
      this.valuation.marketPosition.type = "below_market";
    } else if (percentDifference > 10) {
      this.valuation.marketPosition.type = "above_market";
    } else {
      this.valuation.marketPosition.type = "fair_market";
    }

    this.valuation.marketPosition.percent = Math.abs(percentDifference);
  }
  return this;
};

// Add historical price
vehicleValuationSchema.methods.addHistoricalPrice = function (price, source) {
  this.historical.previousPrices.push({
    price,
    date: new Date(),
    source,
  });

  this.historical.priceHistory.push({
    price,
    date: new Date(),
    source,
  });

  // Keep only last 50 entries
  if (this.historical.previousPrices.length > 50) {
    this.historical.previousPrices = this.historical.previousPrices.slice(-50);
  }
  if (this.historical.priceHistory.length > 50) {
    this.historical.priceHistory = this.historical.priceHistory.slice(-50);
  }

  return this;
};

// Calculate confidence score
vehicleValuationSchema.methods.calculateConfidence = function () {
  let confidence = 0;

  // Data availability
  if (this.pricing.salePrice > 0) confidence += 0.3;
  if (this.historical.previousPrices.length > 0) confidence += 0.2;
  if (this.market.demandScore > 0) confidence += 0.2;
  if (this.market.competitionLevel > 0) confidence += 0.1;
  if (this.vehicle.mileage > 0) confidence += 0.1;
  if (this.location.county) confidence += 0.1;

  this.valuation.confidence = Math.min(confidence, 1);
  return this;
};

// Calculate price range
vehicleValuationSchema.methods.calculatePriceRange = function (marketStdDev) {
  if (this.valuation.estimatedValue > 0) {
    const range = marketStdDev || this.valuation.estimatedValue * 0.15;
    this.valuation.priceRange.low = this.valuation.estimatedValue - range;
    this.valuation.priceRange.high = this.valuation.estimatedValue + range;
  }
  return this;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Get valuations by vehicle
vehicleValuationSchema.statics.getByVehicle = async function (carId) {
  return this.find({ car: carId }).sort({ valuationDate: -1 }).lean();
};

// Get valuations by county
vehicleValuationSchema.statics.getByCounty = async function (county) {
  return this.find({ "location.county": county }).sort({ valuationDate: -1 }).lean();
};

// Get valuations by brand
vehicleValuationSchema.statics.getByBrand = async function (brand) {
  return this.find({ "vehicle.brand": brand }).sort({ valuationDate: -1 }).lean();
};

// Get valuations by brand and model
vehicleValuationSchema.statics.getByBrandModel = async function (brand, model) {
  return this.find({ "vehicle.brand": brand, "vehicle.model": model }).sort({ valuationDate: -1 }).lean();
};

// Get valuations by year range
vehicleValuationSchema.statics.getByYearRange = async function (minYear, maxYear) {
  return this.find({
    "vehicle.year": { $gte: minYear, $lte: maxYear },
  })
    .sort({ valuationDate: -1 })
    .lean();
};

// Get average price by county
vehicleValuationSchema.statics.getAveragePriceByCounty = async function (county) {
  const result = await this.aggregate([
    { $match: { "location.county": county, "pricing.salePrice": { $gt: 0 } } },
    {
      $group: {
        _id: "$location.county",
        averagePrice: { $avg: "$pricing.salePrice" },
        medianPrice: { $median: { input: "$pricing.salePrice" } },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] || null;
};

// Get average price by brand
vehicleValuationSchema.statics.getAveragePriceByBrand = async function (brand) {
  const result = await this.aggregate([
    { $match: { "vehicle.brand": brand, "pricing.salePrice": { $gt: 0 } } },
    {
      $group: {
        _id: "$vehicle.brand",
        averagePrice: { $avg: "$pricing.salePrice" },
        medianPrice: { $median: { input: "$pricing.salePrice" } },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] || null;
};

// Get price trend for vehicle
vehicleValuationSchema.statics.getPriceTrend = async function (carId) {
  const valuations = await this.getByVehicle(carId);

  if (valuations.length < 2) return null;

  const prices = valuations.map((v) => v.pricing.salePrice).filter((p) => p > 0);
  if (prices.length < 2) return null;

  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;

  return {
    direction: percentChange > 0 ? "increasing" : percentChange < 0 ? "decreasing" : "stable",
    percentChange: Math.abs(percentChange),
    firstPrice,
    lastPrice,
  };
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const VehicleValuation = mongoose.models.VehicleValuation || mongoose.model("VehicleValuation", vehicleValuationSchema);

export default VehicleValuation;
