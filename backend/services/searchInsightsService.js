// backend/services/searchInsightsService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Search Insights service
// Provides analytics and insights from search data
// ─────────────────────────────────────────────────────────────

import SearchAnalytics from "../models/SearchAnalytics.js";
import Car from "../models/Car.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";

// =============================
// 🔍 TRACK SEARCH EVENT
// =============================

export const trackSearch = async (searchData) => {
  try {
    const search = await SearchAnalytics.trackSearch(searchData);
    logInfo("Search tracked", { searchTerm: searchData.searchTerm, resultCount: searchData.resultCount });
    return search;
  } catch (err) {
    logError("Failed to track search", err);
    // Don't throw error to avoid breaking search functionality
    return null;
  }
};

// =============================
// 📈 GET TRENDING SEARCHES
// =============================

export const getTrendingSearches = async (limit = 10, period = 7) => {
  try {
    const trending = await SearchAnalytics.getTrendingSearches(limit, period);
    return trending;
  } catch (err) {
    logError("Failed to get trending searches", err);
    throw err;
  }
};

// =============================
// 🚨 GET NO-RESULT SEARCHES
// =============================

export const getNoResultSearches = async (limit = 10, period = 7) => {
  try {
    const noResults = await SearchAnalytics.getNoResultSearches(limit, period);
    return noResults;
  } catch (err) {
    logError("Failed to get no-result searches", err);
    throw err;
  }
};

// =============================
// 📊 GET POPULAR FILTERS
// =============================

export const getPopularFilters = async (period = 7) => {
  try {
    const filters = await SearchAnalytics.getPopularFilters(period);
    return filters;
  } catch (err) {
    logError("Failed to get popular filters", err);
    throw err;
  }
};

// =============================
// 📍 GET COUNTY SEARCH STATS
// =============================

export const getCountySearchStats = async (period = 7) => {
  try {
    const stats = await SearchAnalytics.getCountySearchStats(period);
    return stats;
  } catch (err) {
    logError("Failed to get county search stats", err);
    throw err;
  }
};

// =============================
// 💰 GET PRICE RANGE SEARCH STATS
// =============================

export const getPriceRangeSearchStats = async (period = 7) => {
  try {
    const stats = await SearchAnalytics.getPriceRangeSearchStats(period);
    return stats;
  } catch (err) {
    logError("Failed to get price range stats", err);
    throw err;
  }
};

// =============================
// 🚗 GET BRAND/MODEL SEARCH STATS
// =============================

export const getBrandModelSearchStats = async (period = 7) => {
  try {
    const stats = await SearchAnalytics.getBrandModelSearchStats(period);
    return stats;
  } catch (err) {
    logError("Failed to get brand/model stats", err);
    throw err;
  }
};

// =============================
// 📋 GET MISSING INVENTORY REPORT
// =============================

export const getMissingInventoryReport = async () => {
  try {
    // Get no-result searches
    const noResultSearches = await SearchAnalytics.getNoResultSearches(50, 30);

    // Get current inventory
    const inventory = await Car.find({ status: "active" }).lean();

    // Analyze gaps
    const missingInventory = [];

    for (const search of noResultSearches) {
      const filters = search.filters;

      // Check if inventory matches the search
      const matchingInventory = inventory.filter((car) => {
        if (filters.brand && car.brand !== filters.brand) return false;
        if (filters.model && car.model !== filters.model) return false;
        if (filters.year) {
          if (filters.year.min && car.year < filters.year.min) return false;
          if (filters.year.max && car.year > filters.year.max) return false;
        }
        if (filters.price) {
          if (filters.price.min && car.price < filters.price.min) return false;
          if (filters.price.max && car.price > filters.price.max) return false;
        }
        if (filters.county && car.location?.city !== filters.county) return false;
        if (filters.bodyType && car.bodyType !== filters.bodyType) return false;
        if (filters.fuelType && car.fuel !== filters.fuelType) return false;
        if (filters.transmission && car.transmission !== filters.transmission) return false;
        return true;
      });

      // If no matching inventory, add to missing inventory report
      if (matchingInventory.length === 0) {
        missingInventory.push({
          searchTerm: search.searchTerm,
          filters: filters,
          searchCount: search.searchCount,
          lastSearchedAt: search.lastSearchedAt,
          demandScore: search.searchCount * 10, // Simple demand score
        });
      }
    }

    // Sort by demand score
    missingInventory.sort((a, b) => b.demandScore - a.demandScore);

    return missingInventory.slice(0, 20); // Return top 20
  } catch (err) {
    logError("Failed to get missing inventory report", err);
    throw err;
  }
};

// =============================
// 📊 GET SEARCH DEMAND REPORT
// =============================

export const getSearchDemandReport = async (period = 30) => {
  try {
    const brandModelStats = await SearchAnalytics.getBrandModelSearchStats(period);
    const priceRangeStats = await SearchAnalytics.getPriceRangeSearchStats(period);
    const countyStats = await SearchAnalytics.getCountySearchStats(period);

    return {
      brandModel: brandModelStats,
      priceRange: priceRangeStats,
      county: countyStats,
      period,
      generatedAt: new Date(),
    };
  } catch (err) {
    logError("Failed to get search demand report", err);
    throw err;
  }
};

// =============================
// 📊 GET COMPREHENSIVE SEARCH INSIGHTS
// =============================

export const getSearchInsights = async (period = 7) => {
  try {
    const [trending, noResults, filters, countyStats, priceStats, brandModelStats] = await Promise.all([
      getTrendingSearches(10, period),
      getNoResultSearches(10, period),
      getPopularFilters(period),
      getCountySearchStats(period),
      getPriceRangeSearchStats(period),
      getBrandModelSearchStats(period),
    ]);

    return {
      trending,
      noResults,
      popularFilters: filters,
      countyStats,
      priceRangeStats,
      brandModelStats,
      period,
      generatedAt: new Date(),
    };
  } catch (err) {
    logError("Failed to get search insights", err);
    throw err;
  }
};

// =============================
// 📊 GET SEARCH SUMMARY
// =============================

export const getSearchSummary = async (period = 7) => {
  try {
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const totalSearches = await SearchAnalytics.countDocuments({
      lastSearchedAt: { $gte: startDate },
    });

    const uniqueSearches = await SearchAnalytics.distinct("normalizedTerm", {
      lastSearchedAt: { $gte: startDate },
    });

    const noResultCount = await SearchAnalytics.countDocuments({
      lastSearchedAt: { $gte: startDate },
      hasResults: false,
    });

    const avgResultCount = await SearchAnalytics.aggregate([
      {
        $match: {
          lastSearchedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          avgResultCount: { $avg: "$resultCount" },
        },
      },
    ]);

    return {
      totalSearches,
      uniqueSearches: uniqueSearches.length,
      noResultCount,
      noResultRate: totalSearches > 0 ? (noResultCount / totalSearches) * 100 : 0,
      avgResultCount: avgResultCount[0]?.avgResultCount || 0,
      period,
      generatedAt: new Date(),
    };
  } catch (err) {
    logError("Failed to get search summary", err);
    throw err;
  }
};

// =============================
// 📊 GET DEALER DEMAND INSIGHTS
// =============================

export const getDealerDemandInsights = async (period = 30) => {
  try {
    const brandModelStats = await SearchAnalytics.getBrandModelSearchStats(period);
    const priceRangeStats = await SearchAnalytics.getPriceRangeSearchStats(period);
    const missingInventory = await getMissingInventoryReport();

    // Get current inventory distribution
    const inventory = await Car.find({ status: "active" }).lean();

    const inventoryByBrand = {};
    inventory.forEach((car) => {
      if (car.brand) {
        inventoryByBrand[car.brand] = (inventoryByBrand[car.brand] || 0) + 1;
      }
    });

    // Calculate demand vs inventory gap
    const demandGaps = brandModelStats.map((stat) => {
      const inventoryCount = inventoryByBrand[stat.brand] || 0;
      const demandScore = stat.searchCount;
      const gap = demandScore - inventoryCount;

      return {
        brand: stat.brand,
        model: stat.model,
        demandScore,
        inventoryCount,
        gap,
        recommendation: gap > 0 ? "Increase inventory" : gap < -10 ? "Reduce inventory" : "Maintain inventory",
      };
    });

    // Sort by gap (descending)
    demandGaps.sort((a, b) => b.gap - a.gap);

    return {
      demandGaps: demandGaps.slice(0, 20),
      priceRangeDemand: priceRangeStats.slice(0, 10),
      missingInventory: missingInventory.slice(0, 10),
      period,
      generatedAt: new Date(),
    };
  } catch (err) {
    logError("Failed to get dealer demand insights", err);
    throw err;
  }
};

export default {
  trackSearch,
  getTrendingSearches,
  getNoResultSearches,
  getPopularFilters,
  getCountySearchStats,
  getPriceRangeSearchStats,
  getBrandModelSearchStats,
  getMissingInventoryReport,
  getSearchDemandReport,
  getSearchInsights,
  getSearchSummary,
  getDealerDemandInsights,
};
