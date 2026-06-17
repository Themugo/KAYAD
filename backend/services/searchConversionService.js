// backend/services/searchConversionService.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Search Conversion Tracking service
// Tracks search → view → bid → purchase funnel
// ─────────────────────────────────────────────────────────────

import SearchAnalytics from "../models/SearchAnalytics.js";
import { logInfo, logError } from "../utils/logger.js";

// =============================
// 📊 TRACK SEARCH CONVERSION
// =============================

export const trackSearchConversion = async (conversionData) => {
  try {
    const {
      searchId,
      searchTerm,
      conversionType, // view, bid, purchase, favorite
      carId,
      userId,
    } = conversionData;

    // Find the corresponding search analytics record
    const search = await SearchAnalytics.findOne({
      searchTerm,
      userId,
    }).sort({ createdAt: -1 });

    if (!search) {
      logWarn("Search not found for conversion tracking", { searchTerm, userId });
      return null;
    }

    // Update conversion tracking
    const conversionField = `conversions.${conversionType}`;
    const update = {
      $inc: {
        [conversionField]: 1,
        totalConversions: 1,
      },
    };

    await SearchAnalytics.findByIdAndUpdate(search._id, update);

    logInfo("Search conversion tracked", {
      searchId: search._id,
      conversionType,
      searchTerm,
    });

    return search;
  } catch (err) {
    logError("Failed to track search conversion", err);
    return null;
  }
};

// =============================
// 📊 GET CONVERSION RATE BY SEARCH TERM
// =============================

export const getConversionRateBySearchTerm = async (period = 7) => {
  try {
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const stats = await SearchAnalytics.aggregate([
      {
        $match: {
          lastSearchedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$normalizedTerm",
          totalSearches: { $sum: "$searchCount" },
          totalConversions: { $sum: "$totalConversions" },
          views: { $sum: "$conversions.view" },
          bids: { $sum: "$conversions.bid" },
          purchases: { $sum: "$conversions.purchase" },
          favorites: { $sum: "$conversions.favorite" },
        },
      },
      {
        $project: {
          searchTerm: "$_id",
          totalSearches: 1,
          totalConversions: 1,
          conversionRate: {
            $cond: [
              { $eq: ["$totalSearches", 0] },
              0,
              { $multiply: [{ $divide: ["$totalConversions", "$totalSearches"] }, 100] },
            ],
          },
          views: 1,
          bids: 1,
          purchases: 1,
          favorites: 1,
        },
      },
      {
        $sort: { conversionRate: -1 },
      },
      {
        $limit: 50,
      },
    ]);

    return stats;
  } catch (err) {
    logError("Failed to get conversion rate by search term", err);
    throw err;
  }
};

// =============================
// 📊 GET CONVERSION FUNNEL ANALYSIS
// =============================

export const getConversionFunnelAnalysis = async (period = 7) => {
  try {
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const funnel = await SearchAnalytics.aggregate([
      {
        $match: {
          lastSearchedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalSearches: { $sum: "$searchCount" },
          totalViews: { $sum: "$conversions.view" },
          totalBids: { $sum: "$conversions.bid" },
          totalPurchases: { $sum: "$conversions.purchase" },
          totalFavorites: { $sum: "$conversions.favorite" },
        },
      },
    ]);

    if (funnel.length === 0) {
      return {
        totalSearches: 0,
        totalViews: 0,
        totalBids: 0,
        totalPurchases: 0,
        totalFavorites: 0,
        searchToViewRate: 0,
        viewToBidRate: 0,
        bidToPurchaseRate: 0,
        searchToPurchaseRate: 0,
      };
    }

    const data = funnel[0];
    const totalSearches = data.totalSearches || 0;

    return {
      totalSearches,
      totalViews: data.totalViews || 0,
      totalBids: data.totalBids || 0,
      totalPurchases: data.totalPurchases || 0,
      totalFavorites: data.totalFavorites || 0,
      searchToViewRate: totalSearches > 0 ? (data.totalViews / totalSearches) * 100 : 0,
      viewToBidRate: data.totalViews > 0 ? (data.totalBids / data.totalViews) * 100 : 0,
      bidToPurchaseRate: data.totalBids > 0 ? (data.totalPurchases / data.totalBids) * 100 : 0,
      searchToPurchaseRate: totalSearches > 0 ? (data.totalPurchases / totalSearches) * 100 : 0,
    };
  } catch (err) {
    logError("Failed to get conversion funnel analysis", err);
    throw err;
  }
};

// =============================
// 📊 GET HIGH CONVERTING SEARCHES
// =============================

export const getHighConvertingSearches = async (limit = 10, period = 7) => {
  try {
    const conversionRates = await getConversionRateBySearchTerm(period);
    
    // Filter for searches with at least 10 searches
    const significantSearches = conversionRates.filter(
      (item) => item.totalSearches >= 10
    );

    return significantSearches.slice(0, limit);
  } catch (err) {
    logError("Failed to get high converting searches", err);
    throw err;
  }
};

// =============================
// 📊 GET LOW CONVERTING SEARCHES
// =============================

export const getLowConvertingSearches = async (limit = 10, period = 7) => {
  try {
    const conversionRates = await getConversionRateBySearchTerm(period);
    
    // Filter for searches with at least 10 searches
    const significantSearches = conversionRates.filter(
      (item) => item.totalSearches >= 10
    );

    // Sort by conversion rate ascending
    const lowConverting = significantSearches.sort((a, b) => a.conversionRate - b.conversionRate);

    return lowConverting.slice(0, limit);
  } catch (err) {
    logError("Failed to get low converting searches", err);
    throw err;
  }
};

export default {
  trackSearchConversion,
  getConversionRateBySearchTerm,
  getConversionFunnelAnalysis,
  getHighConvertingSearches,
  getLowConvertingSearches,
};
