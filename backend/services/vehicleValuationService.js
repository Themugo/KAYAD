// backend/services/vehicleValuationService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Vehicle Valuation service
// Manages vehicle pricing data and valuation calculations
// ─────────────────────────────────────────────────────────────

import VehicleValuation from "../models/VehicleValuation.js";
import MarketPricing from "../models/MarketPricing.js";
import BrandDepreciation from "../models/BrandDepreciation.js";
import MileageImpact from "../models/MileageImpact.js";
import DemandSignals from "../models/DemandSignals.js";
import Car from "../models/Car.js";
import Auction from "../models/Auction.js";
import Escrow from "../models/Escrow.js";
import SearchAnalytics from "../models/SearchAnalytics.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 💰 CAPTURE LISTING PRICE
// =============================

export const captureListingPrice = async (carId) => {
  try {
    const car = await Car.findById(carId);
    if (!car) {
      logWarn("Car not found for listing price capture", { carId });
      return null;
    }

    const valuation = await VehicleValuation.create({
      car: car._id,
      vehicle: {
        brand: car.brand,
        model: car.model,
        year: car.year,
        bodyType: car.bodyType,
        fuelType: car.fuel,
        transmission: car.transmission,
        color: car.color,
        condition: car.condition,
        mileage: car.mileage,
      },
      location: {
        city: car.location?.city,
        county: car.location?.city, // Using city as county for now
        coordinates: car.location?.coordinates,
      },
      pricing: {
        listingPrice: car.price,
      },
      source: "listing",
      valuationDate: new Date(),
    });

    logInfo("Listing price captured", { carId, price: car.price });
    return valuation;
  } catch (err) {
    logError("Failed to capture listing price", err);
    throw err;
  }
};

// =============================
// 💰 CAPTURE AUCTION PRICE
// =============================

export const captureAuctionPrice = async (auctionId) => {
  try {
    const auction = await Auction.findById(auctionId).populate("carId");
    if (!auction) {
      logWarn("Auction not found for price capture", { auctionId });
      return null;
    }

    if (auction.status !== "completed" || !auction.winner) {
      logWarn("Auction not completed", { auctionId });
      return null;
    }

    const car = auction.carId;
    if (!car) {
      logWarn("Car not found for auction", { auctionId });
      return null;
    }

    const valuation = await VehicleValuation.create({
      car: car._id,
      vehicle: {
        brand: car.brand,
        model: car.model,
        year: car.year,
        bodyType: car.bodyType,
        fuelType: car.fuel,
        transmission: car.transmission,
        color: car.color,
        condition: car.condition,
        mileage: car.mileage,
      },
      location: {
        city: car.location?.city,
        county: car.location?.city,
        coordinates: car.location?.coordinates,
      },
      pricing: {
        listingPrice: car.price,
        auctionPrice: auction.winner.bid,
        salePrice: auction.winner.bid,
      },
      source: "auction",
      valuationDate: new Date(),
      saleDate: new Date(),
    });

    await valuation.calculatePriceDifference();
    await valuation.save();

    logInfo("Auction price captured", { auctionId, price: auction.winner.bid });
    return valuation;
  } catch (err) {
    logError("Failed to capture auction price", err);
    throw err;
  }
};

// =============================
// 💰 CAPTURE ESCROW PRICE
// =============================

export const captureEscrowPrice = async (escrowId) => {
  try {
    const escrow = await Escrow.findById(escrowId).populate("car");
    if (!escrow) {
      logWarn("Escrow not found for price capture", { escrowId });
      return null;
    }

    if (escrow.status !== "released") {
      logWarn("Escrow not released", { escrowId });
      return null;
    }

    const car = escrow.car;
    if (!car) {
      logWarn("Car not found for escrow", { escrowId });
      return null;
    }

    const valuation = await VehicleValuation.create({
      car: car._id,
      vehicle: {
        brand: car.brand,
        model: car.model,
        year: car.year,
        bodyType: car.bodyType,
        fuelType: car.fuel,
        transmission: car.transmission,
        color: car.color,
        condition: car.condition,
        mileage: car.mileage,
      },
      location: {
        city: car.location?.city,
        county: car.location?.city,
        coordinates: car.location?.coordinates,
      },
      pricing: {
        listingPrice: car.price,
        escrowPrice: escrow.amount,
        salePrice: escrow.amount,
      },
      source: "escrow",
      valuationDate: new Date(),
      saleDate: escrow.releasedAt,
    });

    await valuation.calculatePriceDifference();
    await valuation.save();

    logInfo("Escrow price captured", { escrowId, price: escrow.amount });
    return valuation;
  } catch (err) {
    logError("Failed to capture escrow price", err);
    throw err;
  }
};

// =============================
// 📊 CALCULATE VEHICLE VALUE
// =============================

export const calculateVehicleValue = async (carId) => {
  try {
    const car = await Car.findById(carId);
    if (!car) {
      logWarn("Car not found for valuation", { carId });
      return null;
    }

    // Get market pricing for county
    const marketPricing = await MarketPricing.getLatest({
      county: car.location?.city,
      "vehicle.brand": car.brand,
    });

    // Get brand depreciation
    const brandDepreciation = await BrandDepreciation.getByBrand(car.brand);

    // Get mileage impact
    const mileageImpact = await MileageImpact.getByVehicleType({
      "vehicle.brand": car.brand,
      "vehicle.bodyType": car.bodyType,
    });

    // Get demand signals
    const demandSignals = await DemandSignals.getLatest({
      "search.filters.brand": car.brand,
      "search.county": car.location?.city,
    });

    // Calculate estimated value
    let estimatedValue = car.price;

    // Apply market pricing adjustment
    if (marketPricing && marketPricing.pricing.averagePrice > 0) {
      const marketAdjustment = (marketPricing.pricing.averagePrice - car.price) * 0.3;
      estimatedValue += marketAdjustment;
    }

    // Apply brand depreciation
    if (brandDepreciation && brandDepreciation.depreciation.annualRate > 0) {
      const carAge = new Date().getFullYear() - car.year;
      const depreciationFactor = Math.pow(1 - brandDepreciation.depreciation.annualRate, carAge);
      estimatedValue *= depreciationFactor;
    }

    // Apply mileage impact
    if (mileageImpact && car.mileage > 0) {
      const mileageDepreciation = mileageImpact.impact.pricePer1000Miles * (car.mileage / 1000);
      estimatedValue -= Math.min(mileageDepreciation, car.price * 0.3);
    }

    // Apply demand multiplier
    if (demandSignals && demandSignals.priceImpact.demandMultiplier > 0) {
      estimatedValue *= demandSignals.priceImpact.demandMultiplier;
    }

    // Ensure value is positive
    estimatedValue = Math.max(estimatedValue, car.price * 0.5);

    // Calculate confidence
    let confidence = 0;
    if (marketPricing) confidence += 0.3;
    if (brandDepreciation) confidence += 0.2;
    if (mileageImpact) confidence += 0.2;
    if (demandSignals) confidence += 0.2;
    if (car.mileage > 0) confidence += 0.1;

    // Calculate price range
    const priceRange = estimatedValue * 0.15;

    const valuation = {
      carId,
      vehicle: {
        brand: car.brand,
        model: car.model,
        year: car.year,
        mileage: car.mileage,
      },
      valuation: {
        estimatedValue,
        confidence: Math.min(confidence, 1),
        priceRange: {
          low: estimatedValue - priceRange,
          high: estimatedValue + priceRange,
        },
      },
      marketData: {
        averagePrice: marketPricing?.pricing.averagePrice || 0,
        demandScore: demandSignals?.demand.urgencyScore || 0,
      },
      factors: {
        marketAdjustment: marketPricing ? (marketPricing.pricing.averagePrice - car.price) * 0.3 : 0,
        depreciation: brandDepreciation ? brandDepreciation.depreciation.annualRate : 0,
        mileageImpact: mileageImpact ? mileageImpact.impact.pricePer1000Miles * (car.mileage / 1000) : 0,
        demandMultiplier: demandSignals ? demandSignals.priceImpact.demandMultiplier : 1,
      },
    };

    logInfo("Vehicle value calculated", { carId, estimatedValue });
    return valuation;
  } catch (err) {
    logError("Failed to calculate vehicle value", err);
    throw err;
  }
};

// =============================
// 📊 GET HISTORICAL PRICES
// =============================

export const getHistoricalPrices = async (carId) => {
  try {
    const valuations = await VehicleValuation.getByVehicle(carId);
    return valuations.map(v => ({
      price: v.pricing.salePrice || v.pricing.listingPrice,
      date: v.valuationDate,
      source: v.source,
    }));
  } catch (err) {
    logError("Failed to get historical prices", err);
    throw err;
  }
};

// =============================
// 📊 GET MARKET POSITION
// =============================

export const getMarketPosition = async (carId) => {
  try {
    const car = await Car.findById(carId);
    if (!car) return null;

    const marketPricing = await MarketPricing.getLatest({
      county: car.location?.city,
      "vehicle.brand": car.brand,
    });

    if (!marketPricing || marketPricing.pricing.averagePrice === 0) {
      return null;
    }

    const percentDifference = ((car.price - marketPricing.pricing.averagePrice) / marketPricing.pricing.averagePrice) * 100;

    let position;
    if (percentDifference < -10) {
      position = "below_market";
    } else if (percentDifference > 10) {
      position = "above_market";
    } else {
      position = "fair_market";
    }

    return {
      position,
      percent: Math.abs(percentDifference),
      marketAverage: marketPricing.pricing.averagePrice,
      listingPrice: car.price,
    };
  } catch (err) {
    logError("Failed to get market position", err);
    throw err;
  }
};

// =============================
// 🔄 UPDATE VALUATION
// =============================

export const updateValuation = async (carId) => {
  try {
    const valuation = await calculateVehicleValue(carId);
    if (!valuation) return null;

    const existingValuation = await VehicleValuation.findOne({ car: carId })
      .sort({ valuationDate: -1 });

    if (existingValuation) {
      existingValuation.valuation = valuation.valuation;
      existingValuation.market = valuation.marketData;
      existingValuation.valuationDate = new Date();
      await existingValuation.save();
      return existingValuation;
    }

    const car = await Car.findById(carId);
    const newValuation = await VehicleValuation.create({
      car: carId,
      vehicle: {
        brand: car.brand,
        model: car.model,
        year: car.year,
        bodyType: car.bodyType,
        fuelType: car.fuel,
        transmission: car.transmission,
        color: car.color,
        condition: car.condition,
        mileage: car.mileage,
      },
      location: {
        city: car.location?.city,
        county: car.location?.city,
        coordinates: car.location?.coordinates,
      },
      pricing: {
        listingPrice: car.price,
      },
      valuation: valuation.valuation,
      market: valuation.marketData,
      source: "listing",
      valuationDate: new Date(),
    });

    return newValuation;
  } catch (err) {
    logError("Failed to update valuation", err);
    throw err;
  }
};

// =============================
// 📊 GET COUNTY PRICING
// =============================

export const getCountyPricing = async (county, filters = {}) => {
  try {
    const marketPricing = await MarketPricing.getLatest({ county, ...filters });
    if (!marketPricing) return null;

    return {
      county,
      pricing: marketPricing.pricing,
      metrics: marketPricing.metrics,
      trend: marketPricing.trend,
    };
  } catch (err) {
    logError("Failed to get county pricing", err);
    throw err;
  }
};

// =============================
// 📊 GET BRAND DEPRECIATION
// =============================

export const getBrandDepreciation = async (brand) => {
  try {
    const brandDepreciation = await BrandDepreciation.getByBrand(brand);
    if (!brandDepreciation) return null;

    return {
      brand,
      depreciation: brandDepreciation.depreciation,
      market: brandDepreciation.market,
    };
  } catch (err) {
    logError("Failed to get brand depreciation", err);
    throw err;
  }
};

// =============================
// 📊 GET MILEAGE IMPACT
// =============================

export const getMileageImpact = async (filters = {}) => {
  try {
    const mileageImpact = await MileageImpact.getByVehicleType(filters);
    if (!mileageImpact) return null;

    return {
      vehicle: filters.vehicle || {},
      mileageRanges: mileageImpact.mileageRanges,
      impact: mileageImpact.impact,
    };
  } catch (err) {
    logError("Failed to get mileage impact", err);
    throw err;
  }
};

// =============================
// 📊 GET DEMAND SIGNALS
// =============================

export const getDemandSignals = async (filters = {}) => {
  try {
    const demandSignals = await DemandSignals.getLatest(filters);
    if (!demandSignals) return null;

    return {
      search: demandSignals.search,
      demand: demandSignals.demand,
      priceImpact: demandSignals.priceImpact,
    };
  } catch (err) {
    logError("Failed to get demand signals", err);
    throw err;
  }
};

export default {
  captureListingPrice,
  captureAuctionPrice,
  captureEscrowPrice,
  calculateVehicleValue,
  getHistoricalPrices,
  getMarketPosition,
  updateValuation,
  getCountyPricing,
  getBrandDepreciation,
  getMileageImpact,
  getDemandSignals,
};
