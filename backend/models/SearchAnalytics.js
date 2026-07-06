// backend/models/SearchAnalytics.js - Production Hardened v7.0
// ─────────────────────────────────────────────────────────────
// Search Analytics model
// Tracks user search behavior and provides insights
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import crypto from "crypto";

const searchAnalyticsSchema = new mongoose.Schema(
  {
    // =============================
    // 🔍 SEARCH INFO
    // =============================
    searchTerm: {
      type: String,
      index: true,
      trim: true,
    },

    normalizedTerm: {
      type: String,
      index: true,
      trim: true,
    },

    // =============================
    // 📊 FILTERS USED
    // =============================
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

    // =============================
    // 📈 RESULTS
    // =============================
    resultCount: {
      type: Number,
      default: 0,
    },

    hasResults: {
      type: Boolean,
      default: false,
    },

    // =============================
    // 👤 USER CONTEXT
    // =============================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    userRole: {
      type: String,
      enum: ["admin", "dealer", "buyer", "superadmin"],
    },

    // =============================
    // 🌍 LOCATION CONTEXT
    // =============================
    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    // =============================
    // 📋 METADATA
    // =============================
    searchType: {
      type: String,
      enum: ["quick_search", "advanced_search", "saved_search"],
      default: "quick_search",
    },

    category: {
      type: String,
      enum: ["auctions", "listings", "all"],
      default: "all",
    },

    // =============================
    // 📊 AGGREGATION DATA
    // =============================
    searchCount: {
      type: Number,
      default: 1,
      index: true,
    },

    lastSearchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    trendingScore: {
      type: Number,
      default: 0,
      index: true,
    },

    // =============================
    // 📊 CONVERSION TRACKING
    // =============================
    conversions: {
      view: {
        type: Number,
        default: 0,
      },
      bid: {
        type: Number,
        default: 0,
      },
      purchase: {
        type: Number,
        default: 0,
      },
      favorite: {
        type: Number,
        default: 0,
      },
    },

    totalConversions: {
      type: Number,
      default: 0,
      index: true,
    },

    // =============================
    // 🔑 DEDUPLICATION HASH
    // =============================
    searchHash: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

// =============================
// 🔥 INDEXES (PERFORMANCE)
// =============================
searchAnalyticsSchema.index({ searchTerm: 1, normalizedTerm: 1 });
searchAnalyticsSchema.index({ "filters.brand": 1 });
searchAnalyticsSchema.index({ "filters.county": 1 });
searchAnalyticsSchema.index({ searchCount: -1 });
searchAnalyticsSchema.index({ lastSearchedAt: -1 });
searchAnalyticsSchema.index({ trendingScore: -1 });

// =============================
// 🧠 INSTANCE METHODS
// =============================

// Increment search count
searchAnalyticsSchema.methods.incrementCount = async function () {
  this.searchCount += 1;
  this.lastSearchedAt = new Date();
  this.calculateTrendingScore();
  return this.save();
};

// Update result count
searchAnalyticsSchema.methods.updateResultCount = function (count) {
  this.resultCount = count;
  this.hasResults = count > 0;
  return this.save();
};

// Calculate trending score
searchAnalyticsSchema.methods.calculateTrendingScore = function () {
  const now = new Date();
  const lastSearched = this.lastSearchedAt || this.createdAt;
  const hoursSinceSearch = (now - lastSearched) / (1000 * 60 * 60);

  // Base score from search count
  let score = this.searchCount * 10;

  // Time decay: more recent searches get higher score
  const timeDecay = Math.max(0, 100 - hoursSinceSearch * 2);
  score += timeDecay;

  // Result penalty: no-result searches get lower score
  if (!this.hasResults) {
    score *= 0.5;
  }

  this.trendingScore = Math.round(score);
  return this.trendingScore;
};

// Check if search has no results
searchAnalyticsSchema.methods.isNoResultSearch = function () {
  return !this.hasResults || this.resultCount === 0;
};

// Get search hash for deduplication
searchAnalyticsSchema.methods.getSearchHash = function () {
  const searchKey = {
    searchTerm: this.searchTerm,
    normalizedTerm: this.normalizedTerm,
    filters: this.filters,
  };
  const hash = crypto.createHash("md5").update(JSON.stringify(searchKey)).digest("hex");
  return hash;
};

// =============================
// ⚡ STATIC METHODS
// =============================

// Track a search event
searchAnalyticsSchema.statics.trackSearch = async function (searchData) {
  const { searchTerm, filters, userId, userRole, ipAddress, userAgent, searchType, category, resultCount } = searchData;

  // Normalize search term
  const normalizedTerm = searchTerm ? searchTerm.toLowerCase().trim() : "";

  // Calculate search hash
  const searchKey = {
    searchTerm,
    normalizedTerm,
    filters,
  };
  const searchHash = crypto.createHash("md5").update(JSON.stringify(searchKey)).digest("hex");

  // Try to find existing search
  let search = await this.findOne({ searchHash });

  if (search) {
    // Update existing search
    search.incrementCount();
    if (resultCount !== undefined) {
      search.updateResultCount(resultCount);
    }
  } else {
    // Create new search
    search = await this.create({
      searchTerm,
      normalizedTerm,
      filters,
      userId,
      userRole,
      ipAddress,
      userAgent,
      searchType,
      category,
      resultCount: resultCount || 0,
      hasResults: (resultCount || 0) > 0,
      searchHash,
    });
  }

  return search;
};

// Get trending searches
searchAnalyticsSchema.statics.getTrendingSearches = async function (limit = 10, period = 7) {
  const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

  const trending = await this.find({
    lastSearchedAt: { $gte: startDate },
    hasResults: true,
  })
    .sort({ trendingScore: -1 })
    .limit(limit)
    .lean();

  return trending;
};

// Get no-result searches
searchAnalyticsSchema.statics.getNoResultSearches = async function (limit = 10, period = 7) {
  const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

  const noResults = await this.find({
    lastSearchedAt: { $gte: startDate },
    hasResults: false,
  })
    .sort({ searchCount: -1 })
    .limit(limit)
    .lean();

  return noResults;
};

// Get popular filters
searchAnalyticsSchema.statics.getPopularFilters = async function (period = 7) {
  const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

  const searches = await this.find({
    lastSearchedAt: { $gte: startDate },
  }).lean();

  const filterStats = {
    brand: {},
    model: {},
    county: {},
    bodyType: {},
    fuelType: {},
    transmission: {},
    priceRange: {},
  };

  searches.forEach((search) => {
    if (search.filters.brand) {
      filterStats.brand[search.filters.brand] = (filterStats.brand[search.filters.brand] || 0) + 1;
    }
    if (search.filters.model) {
      filterStats.model[search.filters.model] = (filterStats.model[search.filters.model] || 0) + 1;
    }
    if (search.filters.county) {
      filterStats.county[search.filters.county] = (filterStats.county[search.filters.county] || 0) + 1;
    }
    if (search.filters.bodyType) {
      filterStats.bodyType[search.filters.bodyType] = (filterStats.bodyType[search.filters.bodyType] || 0) + 1;
    }
    if (search.filters.fuelType) {
      filterStats.fuelType[search.filters.fuelType] = (filterStats.fuelType[search.filters.fuelType] || 0) + 1;
    }
    if (search.filters.transmission) {
      filterStats.transmission[search.filters.transmission] =
        (filterStats.transmission[search.filters.transmission] || 0) + 1;
    }
    if (search.filters.price) {
      const priceKey = `${search.filters.price.min || 0}-${search.filters.price.max || "unlimited"}`;
      filterStats.priceRange[priceKey] = (filterStats.priceRange[priceKey] || 0) + 1;
    }
  });

  return filterStats;
};

// Get county search stats
searchAnalyticsSchema.statics.getCountySearchStats = async function (period = 7) {
  const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        lastSearchedAt: { $gte: startDate },
        "filters.county": { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$filters.county",
        searchCount: { $sum: 1 },
        noResultCount: {
          $sum: {
            $cond: [{ $eq: ["$hasResults", false] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: { searchCount: -1 },
    },
  ]);

  return stats.map((stat) => ({
    county: stat._id,
    searchCount: stat.searchCount,
    noResultCount: stat.noResultCount,
    successRate: ((stat.searchCount - stat.noResultCount) / stat.searchCount) * 100,
  }));
};

// Get price range search stats
searchAnalyticsSchema.statics.getPriceRangeSearchStats = async function (period = 7) {
  const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        lastSearchedAt: { $gte: startDate },
        "filters.price": { $exists: true },
      },
    },
    {
      $group: {
        _id: {
          min: "$filters.price.min",
          max: "$filters.price.max",
        },
        searchCount: { $sum: 1 },
        noResultCount: {
          $sum: {
            $cond: [{ $eq: ["$hasResults", false] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: { searchCount: -1 },
    },
  ]);

  return stats.map((stat) => ({
    priceRange: `${stat._id.min || 0}-${stat._id.max || "unlimited"}`,
    searchCount: stat.searchCount,
    noResultCount: stat.noResultCount,
    successRate: ((stat.searchCount - stat.noResultCount) / stat.searchCount) * 100,
  }));
};

// Get brand/model search stats
searchAnalyticsSchema.statics.getBrandModelSearchStats = async function (period = 7) {
  const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

  const stats = await this.aggregate([
    {
      $match: {
        lastSearchedAt: { $gte: startDate },
        $or: [{ "filters.brand": { $exists: true, $ne: null } }, { "filters.model": { $exists: true, $ne: null } }],
      },
    },
    {
      $group: {
        _id: {
          brand: "$filters.brand",
          model: "$filters.model",
        },
        searchCount: { $sum: 1 },
        noResultCount: {
          $sum: {
            $cond: [{ $eq: ["$hasResults", false] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: { searchCount: -1 },
    },
  ]);

  return stats.map((stat) => ({
    brand: stat._id.brand,
    model: stat._id.model,
    searchCount: stat.searchCount,
    noResultCount: stat.noResultCount,
    successRate: ((stat.searchCount - stat.noResultCount) / stat.searchCount) * 100,
  }));
};

// =============================
// 🧠 SAFE EXPORT
// =============================
const SearchAnalytics = mongoose.models.SearchAnalytics || mongoose.model("SearchAnalytics", searchAnalyticsSchema);

export default SearchAnalytics;
