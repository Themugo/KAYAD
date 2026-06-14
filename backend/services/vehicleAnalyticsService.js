// backend/services/vehicleAnalyticsService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Vehicle Analytics service
// Calculates market trends, prices, and vehicle performance metrics
// ─────────────────────────────────────────────────────────────

import Car from "../models/Car.js";
import Transaction from "../models/Transaction.js";
import Auction from "../models/Auction.js";
import Escrow from "../models/Escrow.js";
import SavedSearch from "../models/SavedSearch.js";
import VehicleMarketAnalytics from "../models/VehicleMarketAnalytics.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 💰 CALCULATE AVERAGE SELLING PRICE
// =============================

export const calculateAverageSellingPrice = async (startDate, endDate) => {
  try {
    // Get completed escrows (sales)
    const escrows = await Escrow.find({
      status: "released",
      releasedAt: { $gte: startDate, $lte: endDate },
    }).populate("car");

    const auctionSales = await Auction.find({
      status: "completed",
      endTime: { $gte: startDate, $lte: endDate },
    }).populate("carId");

    const prices = [];

    escrows.forEach((escrow) => {
      if (escrow.amount) prices.push(escrow.amount);
    });

    auctionSales.forEach((auction) => {
      if (auction.highestBid) prices.push(auction.highestBid);
    });

    if (prices.length === 0) return 0;

    const sum = prices.reduce((a, b) => a + b, 0);
    return sum / prices.length;
  } catch (err) {
    logError("Failed to calculate average selling price", err);
    throw err;
  }
};

// =============================
// 💰 CALCULATE AVERAGE LISTING PRICE
// =============================

export const calculateAverageListingPrice = async (startDate, endDate) => {
  try {
    const cars = await Car.find({
      status: "active",
      createdAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    });

    if (cars.length === 0) return 0;

    const sum = cars.reduce((a, b) => a + (b.price || 0), 0);
    return sum / cars.length;
  } catch (err) {
    logError("Failed to calculate average listing price", err);
    throw err;
  }
};

// =============================
// ⏱️ CALCULATE DAYS ON MARKET
// =============================

export const calculateDaysOnMarket = async (startDate, endDate) => {
  try {
    const soldCars = await Car.find({
      status: "sold",
      updatedAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    });

    if (soldCars.length === 0) {
      return { average: 0, median: 0, fastest: 0 };
    }

    const daysOnMarket = soldCars.map((car) => {
      const created = new Date(car.createdAt);
      const sold = new Date(car.updatedAt);
      return Math.floor((sold - created) / (1000 * 60 * 60 * 24));
    });

    daysOnMarket.sort((a, b) => a - b);

    const sum = daysOnMarket.reduce((a, b) => a + b, 0);
    const average = sum / daysOnMarket.length;
    const median = daysOnMarket[Math.floor(daysOnMarket.length / 2)];
    const fastest = daysOnMarket[0];

    return { average, median, fastest };
  } catch (err) {
    logError("Failed to calculate days on market", err);
    throw err;
  }
};

// =============================
// 👁️ GET MOST VIEWED VEHICLES
// =============================

export const getMostViewedVehicles = async (limit = 10, startDate, endDate) => {
  try {
    const cars = await Car.find({
      createdAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    })
      .sort({ views: -1 })
      .limit(limit)
      .select("title views price")
      .lean();

    return cars.map((car) => ({
      carId: car._id,
      title: car.title,
      views: car.views,
      price: car.price,
    }));
  } catch (err) {
    logError("Failed to get most viewed vehicles", err);
    throw err;
  }
};

// =============================
// 🔍 GET MOST SEARCHED VEHICLES
// =============================

export const getMostSearchedVehicles = async (limit = 10, startDate, endDate) => {
  try {
    const searches = await SavedSearch.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).select("filters");

    const searchCounts = {};

    searches.forEach((search) => {
      const key = JSON.stringify(search.filters);
      searchCounts[key] = (searchCounts[key] || 0) + 1;
    });

    const sortedSearches = Object.entries(searchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([filters, count]) => ({
        filters: JSON.parse(filters),
        count,
      }));

    return sortedSearches;
  } catch (err) {
    logError("Failed to get most searched vehicles", err);
    throw err;
  }
};

// =============================
// ⚡ GET FASTEST SELLING VEHICLES
// =============================

export const getFastestSellingVehicles = async (limit = 10, startDate, endDate) => {
  try {
    const soldCars = await Car.find({
      status: "sold",
      updatedAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    }).select("title createdAt updatedAt price");

    const withDaysOnMarket = soldCars.map((car) => {
      const created = new Date(car.createdAt);
      const sold = new Date(car.updatedAt);
      const daysOnMarket = Math.floor((sold - created) / (1000 * 60 * 60 * 24));
      return {
        carId: car._id,
        title: car.title,
        daysOnMarket,
        sellingPrice: car.price,
      };
    });

    return withDaysOnMarket.sort((a, b) => a.daysOnMarket - b.daysOnMarket).slice(0, limit);
  } catch (err) {
    logError("Failed to get fastest selling vehicles", err);
    throw err;
  }
};

// =============================
// 📍 GET COUNTY TRENDS
// =============================

export const getCountyTrends = async (startDate, endDate) => {
  try {
    const cars = await Car.find({
      status: { $in: ["active", "sold"] },
      createdAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    }).select("location.city price status createdAt updatedAt");

    const countyData = {};

    cars.forEach((car) => {
      const county = car.location?.city || "Unknown";
      if (!countyData[county]) {
        countyData[county] = {
          county,
          totalPrice: 0,
          volume: 0,
          totalDaysOnMarket: 0,
          soldCount: 0,
        };
      }

      countyData[county].totalPrice += car.price || 0;
      countyData[county].volume += 1;

      if (car.status === "sold") {
        const created = new Date(car.createdAt);
        const sold = new Date(car.updatedAt);
        const daysOnMarket = Math.floor((sold - created) / (1000 * 60 * 60 * 24));
        countyData[county].totalDaysOnMarket += daysOnMarket;
        countyData[county].soldCount += 1;
      }
    });

    return Object.values(countyData).map((data) => ({
      county: data.county,
      averagePrice: data.volume > 0 ? data.totalPrice / data.volume : 0,
      volume: data.volume,
      daysOnMarket: data.soldCount > 0 ? data.totalDaysOnMarket / data.soldCount : 0,
    }));
  } catch (err) {
    logError("Failed to get county trends", err);
    throw err;
  }
};

// =============================
// 🚗 GET BRAND TRENDS
// =============================

export const getBrandTrends = async (startDate, endDate) => {
  try {
    const cars = await Car.find({
      status: { $in: ["active", "sold"] },
      createdAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    }).select("brand price status createdAt updatedAt");

    const totalVolume = cars.length;
    const brandData = {};

    cars.forEach((car) => {
      const brand = car.brand || "Unknown";
      if (!brandData[brand]) {
        brandData[brand] = {
          brand,
          totalPrice: 0,
          volume: 0,
          totalDaysOnMarket: 0,
          soldCount: 0,
        };
      }

      brandData[brand].totalPrice += car.price || 0;
      brandData[brand].volume += 1;

      if (car.status === "sold") {
        const created = new Date(car.createdAt);
        const sold = new Date(car.updatedAt);
        const daysOnMarket = Math.floor((sold - created) / (1000 * 60 * 60 * 24));
        brandData[brand].totalDaysOnMarket += daysOnMarket;
        brandData[brand].soldCount += 1;
      }
    });

    return Object.values(brandData).map((data) => ({
      brand: data.brand,
      averagePrice: data.volume > 0 ? data.totalPrice / data.volume : 0,
      volume: data.volume,
      daysOnMarket: data.soldCount > 0 ? data.totalDaysOnMarket / data.soldCount : 0,
      marketShare: totalVolume > 0 ? (data.volume / totalVolume) * 100 : 0,
    }));
  } catch (err) {
    logError("Failed to get brand trends", err);
    throw err;
  }
};

// =============================
// 📋 GET MODEL TRENDS
// =============================

export const getModelTrends = async (startDate, endDate) => {
  try {
    const cars = await Car.find({
      status: { $in: ["active", "sold"] },
      createdAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    }).select("brand model price status createdAt updatedAt");

    const modelData = {};

    cars.forEach((car) => {
      const brand = car.brand || "Unknown";
      const model = car.model || "Unknown";
      const key = `${brand}-${model}`;

      if (!modelData[key]) {
        modelData[key] = {
          brand,
          model,
          totalPrice: 0,
          volume: 0,
          totalDaysOnMarket: 0,
          soldCount: 0,
        };
      }

      modelData[key].totalPrice += car.price || 0;
      modelData[key].volume += 1;

      if (car.status === "sold") {
        const created = new Date(car.createdAt);
        const sold = new Date(car.updatedAt);
        const daysOnMarket = Math.floor((sold - created) / (1000 * 60 * 60 * 24));
        modelData[key].totalDaysOnMarket += daysOnMarket;
        modelData[key].soldCount += 1;
      }
    });

    return Object.values(modelData).map((data) => ({
      brand: data.brand,
      model: data.model,
      averagePrice: data.volume > 0 ? data.totalPrice / data.volume : 0,
      volume: data.volume,
      daysOnMarket: data.soldCount > 0 ? data.totalDaysOnMarket / data.soldCount : 0,
    }));
  } catch (err) {
    logError("Failed to get model trends", err);
    throw err;
  }
};

// =============================
// 📊 GET SPEC TRENDS
// =============================

export const getSpecTrends = async (startDate, endDate) => {
  try {
    const cars = await Car.find({
      status: { $in: ["active", "sold"] },
      createdAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    }).select("fuel transmission bodyType price");

    const fuelData = {};
    const transmissionData = {};
    const bodyTypeData = {};

    cars.forEach((car) => {
      // Fuel type
      if (car.fuel) {
        if (!fuelData[car.fuel]) {
          fuelData[car.fuel] = { type: car.fuel, totalPrice: 0, volume: 0 };
        }
        fuelData[car.fuel].totalPrice += car.price || 0;
        fuelData[car.fuel].volume += 1;
      }

      // Transmission
      if (car.transmission) {
        if (!transmissionData[car.transmission]) {
          transmissionData[car.transmission] = { type: car.transmission, totalPrice: 0, volume: 0 };
        }
        transmissionData[car.transmission].totalPrice += car.price || 0;
        transmissionData[car.transmission].volume += 1;
      }

      // Body type
      if (car.bodyType) {
        if (!bodyTypeData[car.bodyType]) {
          bodyTypeData[car.bodyType] = { type: car.bodyType, totalPrice: 0, volume: 0 };
        }
        bodyTypeData[car.bodyType].totalPrice += car.price || 0;
        bodyTypeData[car.bodyType].volume += 1;
      }
    });

    return {
      fuelTypeTrends: Object.values(fuelData).map((data) => ({
        type: data.type,
        averagePrice: data.volume > 0 ? data.totalPrice / data.volume : 0,
        volume: data.volume,
      })),
      transmissionTrends: Object.values(transmissionData).map((data) => ({
        type: data.type,
        averagePrice: data.volume > 0 ? data.totalPrice / data.volume : 0,
        volume: data.volume,
      })),
      bodyTypeTrends: Object.values(bodyTypeData).map((data) => ({
        type: data.type,
        averagePrice: data.volume > 0 ? data.totalPrice / data.volume : 0,
        volume: data.volume,
      })),
    };
  } catch (err) {
    logError("Failed to get spec trends", err);
    throw err;
  }
};

// =============================
// 📈 GET PRICE TREND
// =============================

export const getPriceTrend = async (startDate, endDate) => {
  try {
    const analytics = await VehicleMarketAnalytics.find({
      startDate: { $gte: startDate },
      endDate: { $lte: endDate },
    }).sort({ startDate: 1 });

    return analytics.map((a) => ({
      date: a.startDate,
      averagePrice: a.averageSellingPrice,
      volume: a.totalSales,
    }));
  } catch (err) {
    logError("Failed to get price trend", err);
    throw err;
  }
};

// =============================
// 📈 GET VOLUME TREND
// =============================

export const getVolumeTrend = async (startDate, endDate) => {
  try {
    const analytics = await VehicleMarketAnalytics.find({
      startDate: { $gte: startDate },
      endDate: { $lte: endDate },
    }).sort({ startDate: 1 });

    return analytics.map((a) => ({
      date: a.startDate,
      listings: a.totalListings,
      sales: a.totalSales,
    }));
  } catch (err) {
    logError("Failed to get volume trend", err);
    throw err;
  }
};

// =============================
// 🔄 GENERATE MARKET ANALYTICS
// =============================

export const generateMarketAnalytics = async (period, startDate, endDate) => {
  try {
    logInfo("Generating market analytics", { period, startDate, endDate });

    const [
      averageSellingPrice,
      averageListingPrice,
      daysOnMarket,
      mostViewed,
      mostSearched,
      fastestSelling,
      countyTrends,
      brandTrends,
      modelTrends,
      specTrends,
    ] = await Promise.all([
      calculateAverageSellingPrice(startDate, endDate),
      calculateAverageListingPrice(startDate, endDate),
      calculateDaysOnMarket(startDate, endDate),
      getMostViewedVehicles(10, startDate, endDate),
      getMostSearchedVehicles(10, startDate, endDate),
      getFastestSellingVehicles(10, startDate, endDate),
      getCountyTrends(startDate, endDate),
      getBrandTrends(startDate, endDate),
      getModelTrends(startDate, endDate),
      getSpecTrends(startDate, endDate),
    ]);

    // Calculate price range
    const cars = await Car.find({
      status: { $in: ["active", "sold"] },
      createdAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    }).select("price");

    const prices = cars.map((c) => c.price).filter((p) => p > 0);
    prices.sort((a, b) => a - b);

    const priceRange = {
      min: prices.length > 0 ? prices[0] : 0,
      max: prices.length > 0 ? prices[prices.length - 1] : 0,
      median: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
    };

    // Calculate volume metrics
    const totalListings = await Car.countDocuments({
      status: "active",
      createdAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    });

    const totalSales = await Car.countDocuments({
      status: "sold",
      updatedAt: { $gte: startDate, $lte: endDate },
      deletedAt: null,
    });

    const totalAuctions = await Auction.countDocuments({
      status: "completed",
      endTime: { $gte: startDate, $lte: endDate },
    });

    const conversionRate = totalListings > 0 ? (totalSales / totalListings) * 100 : 0;

    // Create or update analytics record
    const analytics = await VehicleMarketAnalytics.findOneAndUpdate(
      {
        period,
        startDate,
        endDate,
      },
      {
        averageSellingPrice,
        averageListingPrice,
        priceRange,
        averageDaysOnMarket: daysOnMarket.average,
        medianDaysOnMarket: daysOnMarket.median,
        fastestSaleDays: daysOnMarket.fastest,
        totalListings,
        totalSales,
        totalAuctions,
        conversionRate,
        mostViewed,
        fastestSelling,
        topSearches: mostSearched,
        countyTrends,
        brandTrends,
        modelTrends,
        fuelTypeTrends: specTrends.fuelTypeTrends,
        transmissionTrends: specTrends.transmissionTrends,
        bodyTypeTrends: specTrends.bodyTypeTrends,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    logInfo("Market analytics generated", { period, startDate, endDate, analyticsId: analytics._id });
    return analytics;
  } catch (err) {
    logError("Failed to generate market analytics", err);
    throw err;
  }
};

export default {
  calculateAverageSellingPrice,
  calculateAverageListingPrice,
  calculateDaysOnMarket,
  getMostViewedVehicles,
  getMostSearchedVehicles,
  getFastestSellingVehicles,
  getCountyTrends,
  getBrandTrends,
  getModelTrends,
  getSpecTrends,
  getPriceTrend,
  getVolumeTrend,
  generateMarketAnalytics,
};
