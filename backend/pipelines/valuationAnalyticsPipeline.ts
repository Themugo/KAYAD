// backend/pipelines/valuationAnalyticsPipeline.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Valuation Analytics Pipeline
// Processes valuation data and generates analytics
// ─────────────────────────────────────────────────────────────

import VehicleValuation from "../models/VehicleValuation.ts";
import MarketPricing from "../models/MarketPricing.ts";
import BrandDepreciation from "../models/BrandDepreciation.ts";
import MileageImpact from "../models/MileageImpact.ts";
import DemandSignals from "../models/DemandSignals.ts";
import Car from "../models/Car.ts";
import Auction from "../models/Auction.ts";
import Escrow from "../models/Escrow.ts";
import SearchAnalytics from "../models/SearchAnalytics.ts";
import { logInfo, logError, logWarn } from "../utils/logger.ts";

// =============================
// 📊 PROCESS LISTINGS
// =============================

export const processListings = async (limit = 100) => {
  try {
    logInfo("Processing listings for valuation analytics");

    const cars = await Car.find({ price: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    let processedCount = 0;
    for (const car of cars) {
      try {
        const existingValuation = await VehicleValuation.findOne({
          car: car._id,
          source: "listing",
          pricing: { listingPrice: car.price },
        });

        if (!existingValuation) {
          await VehicleValuation.create({
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
            },
            source: "listing",
            valuationDate: new Date(),
          });
          processedCount++;
        }
      } catch (err) {
        logWarn("Failed to process listing", { carId: car._id, error: err.message });
      }
    }

    logInfo("Listings processed", { total: cars.length, processed: processedCount });
    return { total: cars.length, processed: processedCount };
  } catch (err) {
    logError("Failed to process listings", err);
    throw err;
  }
};

// =============================
// 📊 PROCESS AUCTIONS
// =============================

export const processAuctions = async (limit = 100) => {
  try {
    logInfo("Processing auctions for valuation analytics");

    const auctions = await Auction.find({ status: "completed", winner: { $exists: true } })
      .populate("carId")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    let processedCount = 0;
    for (const auction of auctions) {
      try {
        if (!auction.carId) continue;

        const existingValuation = await VehicleValuation.findOne({
          car: auction.carId._id,
          source: "auction",
          "pricing.auctionPrice": auction.winner.bid,
        });

        if (!existingValuation) {
          const car = auction.carId;
          await VehicleValuation.create({
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
          processedCount++;
        }
      } catch (err) {
        logWarn("Failed to process auction", { auctionId: auction._id, error: err.message });
      }
    }

    logInfo("Auctions processed", { total: auctions.length, processed: processedCount });
    return { total: auctions.length, processed: processedCount };
  } catch (err) {
    logError("Failed to process auctions", err);
    throw err;
  }
};

// =============================
// 📊 PROCESS ESCROWS
// =============================

export const processEscrows = async (limit = 100) => {
  try {
    logInfo("Processing escrows for valuation analytics");

    const escrows = await Escrow.find({ status: "released" })
      .populate("car")
      .sort({ releasedAt: -1 })
      .limit(limit)
      .lean();

    let processedCount = 0;
    for (const escrow of escrows) {
      try {
        if (!escrow.car) continue;

        const existingValuation = await VehicleValuation.findOne({
          car: escrow.car._id,
          source: "escrow",
          "pricing.escrowPrice": escrow.amount,
        });

        if (!existingValuation) {
          const car = escrow.car;
          await VehicleValuation.create({
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
          processedCount++;
        }
      } catch (err) {
        logWarn("Failed to process escrow", { escrowId: escrow._id, error: err.message });
      }
    }

    logInfo("Escrows processed", { total: escrows.length, processed: processedCount });
    return { total: escrows.length, processed: processedCount };
  } catch (err) {
    logError("Failed to process escrows", err);
    throw err;
  }
};

// =============================
// 📊 PROCESS SEARCH DATA
// =============================

export const processSearchData = async (limit = 100) => {
  try {
    logInfo("Processing search data for valuation analytics");

    const searchAnalytics = await SearchAnalytics.find({}).sort({ createdAt: -1 }).limit(limit).lean();

    let processedCount = 0;
    for (const search of searchAnalytics) {
      try {
        const existingSignal = await DemandSignals.findOne({
          "search.searchTerm": search.searchTerm,
          "search.county": search.filters?.county,
          period: {
            startDate: {
              $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
            },
          },
        });

        if (!existingSignal) {
          await DemandSignals.create({
            search: {
              searchTerm: search.searchTerm,
              normalizedTerm: search.normalizedTerm,
              filters: search.filters,
            },
            demand: {
              searchVolume: 1,
              competitionLevel: Math.min(search.resultCount / 100, 1),
            },
            period: {
              startDate: new Date(),
            },
          });
          processedCount++;
        } else {
          existingSignal.demand.searchVolume += 1;
          await existingSignal.save();
        }
      } catch (err) {
        logWarn("Failed to process search data", { searchId: search._id, error: err.message });
      }
    }

    logInfo("Search data processed", { total: searchAnalytics.length, processed: processedCount });
    return { total: searchAnalytics.length, processed: processedCount };
  } catch (err) {
    logError("Failed to process search data", err);
    throw err;
  }
};

// =============================
// 📊 CALCULATE MARKET METRICS
// =============================

export const calculateMarketMetrics = async () => {
  try {
    logInfo("Calculating market metrics");

    // Calculate county-level pricing
    const counties = await VehicleValuation.distinct("location.county");
    for (const county of counties) {
      try {
        const marketData = await MarketPricing.calculateFromValuations({ "location.county": county });
        if (marketData) {
          const existingMarket = await MarketPricing.getLatest({ county });
          if (existingMarket) {
            existingMarket.pricing = marketData.pricing;
            existingMarket.metrics = marketData.metrics;
            existingMarket.period.endDate = new Date();
            await existingMarket.addHistoricalData();
            await existingMarket.save();
          } else {
            await MarketPricing.create({
              ...marketData,
              period: {
                startDate: new Date(),
              },
            });
          }
        }
      } catch (err) {
        logWarn("Failed to calculate county pricing", { county, error: err.message });
      }
    }

    // Calculate brand depreciation
    const brands = await VehicleValuation.distinct("vehicle.brand");
    for (const brand of brands) {
      try {
        const brandData = await BrandDepreciation.calculateFromValuations(brand);
        if (brandData) {
          const existingBrand = await BrandDepreciation.getByBrand(brand);
          if (existingBrand) {
            existingBrand.depreciation = brandData.depreciation;
            existingBrand.historical = brandData.historical;
            await existingBrand.save();
          } else {
            await BrandDepreciation.create(brandData);
          }
        }
      } catch (err) {
        logWarn("Failed to calculate brand depreciation", { brand, error: err.message });
      }
    }

    // Calculate mileage impact
    const bodyTypes = await VehicleValuation.distinct("vehicle.bodyType");
    for (const bodyType of bodyTypes) {
      try {
        const mileageData = await MileageImpact.calculateFromValuations({ "vehicle.bodyType": bodyType });
        if (mileageData) {
          const existingMileage = await MileageImpact.getByBodyType(bodyType);
          if (existingMileage) {
            existingMileage.mileageRanges = mileageData.mileageRanges;
            existingMileage.impact = mileageData.impact;
            await existingMileage.save();
          } else {
            await MileageImpact.create(mileageData);
          }
        }
      } catch (err) {
        logWarn("Failed to calculate mileage impact", { bodyType, error: err.message });
      }
    }

    logInfo("Market metrics calculated");
    return { success: true };
  } catch (err) {
    logError("Failed to calculate market metrics", err);
    throw err;
  }
};

// =============================
// 📊 UPDATE DEPRECIATION DATA
// =============================

export const updateDepreciationData = async () => {
  try {
    logInfo("Updating depreciation data");

    const brands = await VehicleValuation.distinct("vehicle.brand");
    for (const brand of brands) {
      try {
        const valuations = await VehicleValuation.find({
          "vehicle.brand": brand,
          "pricing.salePrice": { $gt: 0 },
        })
          .sort({ "vehicle.year": -1 })
          .lean();

        if (valuations.length < 2) continue;

        const brandDepreciation = await BrandDepreciation.getByBrand(brand);
        if (!brandDepreciation) continue;

        // Group by year
        const yearGroups = {};
        valuations.forEach((v) => {
          const year = v.vehicle.year;
          if (!yearGroups[year]) {
            yearGroups[year] = [];
          }
          yearGroups[year].push(v.pricing.salePrice);
        });

        // Calculate average price per year
        const yearlyPrices = Object.keys(yearGroups)
          .sort((a, b) => b - a)
          .map((year) => ({
            year: parseInt(year),
            averagePrice: yearGroups[year].reduce((sum, price) => sum + price, 0) / yearGroups[year].length,
            sampleSize: yearGroups[year].length,
          }));

        // Update historical data
        brandDepreciation.historical = yearlyPrices;
        await brandDepreciation.save();
      } catch (err) {
        logWarn("Failed to update brand depreciation", { brand, error: err.message });
      }
    }

    logInfo("Depreciation data updated");
    return { success: true };
  } catch (err) {
    logError("Failed to update depreciation data", err);
    throw err;
  }
};

// =============================
// 📊 GENERATE TRAINING DATA
// =============================

export const generateTrainingData = async (limit = 1000) => {
  try {
    logInfo("Generating training data");

    const valuations = await VehicleValuation.find({
      "pricing.salePrice": { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const trainingData = valuations.map((v) => ({
      features: {
        vehicle: {
          brand: v.vehicle.brand,
          model: v.vehicle.model,
          year: v.vehicle.year,
          mileage: v.vehicle.mileage,
          bodyType: v.vehicle.bodyType,
          fuelType: v.vehicle.fuelType,
          transmission: v.vehicle.transmission,
          color: v.vehicle.color,
          condition: v.vehicle.condition,
          age: new Date().getFullYear() - v.vehicle.year,
        },
        location: {
          county: v.location.county,
          city: v.location.city,
        },
      },
      labels: {
        salePrice: v.pricing.salePrice,
        priceDifference: v.pricing.priceDifference,
        priceChangePercent: v.pricing.priceChangePercent,
      },
      metadata: {
        carId: v.car,
        source: v.source,
        timestamp: v.valuationDate,
      },
    }));

    logInfo("Training data generated", { count: trainingData.length });
    return trainingData;
  } catch (err) {
    logError("Failed to generate training data", err);
    throw err;
  }
};

// =============================
// 🚀 RUN FULL PIPELINE
// =============================

export const runFullPipeline = async () => {
  try {
    logInfo("Starting full valuation analytics pipeline");

    const results = {
      listings: await processListings(),
      auctions: await processAuctions(),
      escrows: await processEscrows(),
      searchData: await processSearchData(),
      marketMetrics: await calculateMarketMetrics(),
      depreciationData: await updateDepreciationData(),
      trainingData: await generateTrainingData(),
    };

    logInfo("Full valuation analytics pipeline completed", results);
    return results;
  } catch (err) {
    logError("Failed to run full pipeline", err);
    throw err;
  }
};

export default {
  processListings,
  processAuctions,
  processEscrows,
  processSearchData,
  calculateMarketMetrics,
  updateDepreciationData,
  generateTrainingData,
  runFullPipeline,
};
