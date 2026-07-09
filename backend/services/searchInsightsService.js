import { logInfo, logError } from "../utils/logger.js";
import { findAll, count } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

export const trackSearch = async (searchData) => {
  try {
    const search = await getSupabase().from("search_analytics").insert({
      searchTerm: searchData.searchTerm,
      normalizedTerm: (searchData.searchTerm || "").toLowerCase().trim(),
      filters: searchData.filters || {},
      resultCount: searchData.resultCount || 0,
      hasResults: (searchData.resultCount || 0) > 0,
      userId: searchData.userId,
      lastSearchedAt: new Date().toISOString(),
    }).select().single();
    logInfo("Search tracked", { searchTerm: searchData.searchTerm, resultCount: searchData.resultCount });
    return search.data;
  } catch (err) {
    logError("Failed to track search", err);
    return null;
  }
};

export const getTrendingSearches = async (limit = 10, period = 7) => {
  try {
    const since = new Date(Date.now() - period * 86400000).toISOString();
    const { data } = await getSupabase().from("search_analytics")
      .select("normalizedTerm, searchCount:count")
      .gte("lastSearchedAt", since)
      .order("searchCount", { ascending: false })
      .limit(limit);
    return data || [];
  } catch (err) {
    logError("Failed to get trending searches", err);
    throw err;
  }
};

export const getNoResultSearches = async (limit = 10, period = 7) => {
  try {
    const since = new Date(Date.now() - period * 86400000).toISOString();
    const { data } = await getSupabase().from("search_analytics")
      .select("*")
      .eq("hasResults", false)
      .gte("lastSearchedAt", since)
      .order("searchCount", { ascending: false })
      .limit(limit);
    return data || [];
  } catch (err) {
    logError("Failed to get no-result searches", err);
    throw err;
  }
};

export const getPopularFilters = async (period = 7) => {
  try {
    const since = new Date(Date.now() - period * 86400000).toISOString();
    const { data } = await getSupabase().from("search_analytics")
      .select("filters")
      .gte("lastSearchedAt", since);
    const filterCounts = {};
    for (const row of (data || [])) {
      const key = JSON.stringify(row.filters || {});
      filterCounts[key] = (filterCounts[key] || 0) + 1;
    }
    return Object.entries(filterCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([filters, count]) => ({ filters: JSON.parse(filters), count }));
  } catch (err) {
    logError("Failed to get popular filters", err);
    throw err;
  }
};

export const getCountySearchStats = async (period = 7) => {
  try {
    const since = new Date(Date.now() - period * 86400000).toISOString();
    const { data } = await getSupabase().from("search_analytics")
      .select("filters")
      .gte("lastSearchedAt", since);
    const countyCounts = {};
    for (const row of (data || [])) {
      const county = row.filters?.county || row.filters?.location;
      if (county) countyCounts[county] = (countyCounts[county] || 0) + 1;
    }
    return Object.entries(countyCounts).map(([county, count]) => ({ county, count }));
  } catch (err) {
    logError("Failed to get county search stats", err);
    throw err;
  }
};

export const getPriceRangeSearchStats = async (period = 7) => {
  try {
    const since = new Date(Date.now() - period * 86400000).toISOString();
    const { data } = await getSupabase().from("search_analytics")
      .select("filters")
      .gte("lastSearchedAt", since);
    const ranges = {};
    for (const row of (data || [])) {
      const pMin = row.filters?.priceMin || row.filters?.price?.min;
      const pMax = row.filters?.priceMax || row.filters?.price?.max;
      const key = `${pMin || 0}-${pMax || "any"}`;
      ranges[key] = (ranges[key] || 0) + 1;
    }
    return Object.entries(ranges).map(([range, count]) => ({ range, count }));
  } catch (err) {
    logError("Failed to get price range stats", err);
    throw err;
  }
};

export const getBrandModelSearchStats = async (period = 7) => {
  try {
    const since = new Date(Date.now() - period * 86400000).toISOString();
    const { data } = await getSupabase().from("search_analytics")
      .select("filters, searchCount")
      .gte("lastSearchedAt", since);
    const stats = {};
    for (const row of (data || [])) {
      const brand = row.filters?.brand;
      const model = row.filters?.model;
      if (brand) {
        const key = `${brand}-${model || "any"}`;
        stats[key] = { brand, model: model || null, searchCount: (stats[key]?.searchCount || 0) + (row.searchCount || 1) };
      }
    }
    return Object.values(stats).sort((a, b) => b.searchCount - a.searchCount);
  } catch (err) {
    logError("Failed to get brand/model stats", err);
    throw err;
  }
};

export const getMissingInventoryReport = async () => {
  try {
    const noResultSearches = await getNoResultSearches(50, 30);
    const inventory = await findAll("cars", { filters: { status: "active" } });
    const missingInventory = [];

    for (const search of noResultSearches) {
      const filters = search.filters || {};
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
      if (matchingInventory.length === 0) {
        missingInventory.push({ searchTerm: search.searchTerm, filters, searchCount: search.searchCount, lastSearchedAt: search.lastSearchedAt, demandScore: (search.searchCount || 1) * 10 });
      }
    }
    missingInventory.sort((a, b) => b.demandScore - a.demandScore);
    return missingInventory.slice(0, 20);
  } catch (err) {
    logError("Failed to get missing inventory report", err);
    throw err;
  }
};

export const getSearchDemandReport = async (period = 30) => {
  try {
    const brandModelStats = await getBrandModelSearchStats(period);
    const priceRangeStats = await getPriceRangeSearchStats(period);
    const countyStats = await getCountySearchStats(period);
    return { brandModel: brandModelStats, priceRange: priceRangeStats, county: countyStats, period, generatedAt: new Date() };
  } catch (err) {
    logError("Failed to get search demand report", err);
    throw err;
  }
};

export const getSearchInsights = async (period = 7) => {
  try {
    const [trending, noResults, filters, countyStats, priceStats, brandModelStats] = await Promise.all([
      getTrendingSearches(10, period), getNoResultSearches(10, period), getPopularFilters(period),
      getCountySearchStats(period), getPriceRangeSearchStats(period), getBrandModelSearchStats(period),
    ]);
    return { trending, noResults, popularFilters: filters, countyStats, priceRangeStats: priceStats, brandModelStats, period, generatedAt: new Date() };
  } catch (err) {
    logError("Failed to get search insights", err);
    throw err;
  }
};

export const getSearchSummary = async (period = 7) => {
  try {
    const startDate = new Date(Date.now() - period * 86400000).toISOString();
    const totalSearches = await count("search_analytics", { lastSearchedAt: { $gte: startDate } });
    const { data: uniqueData } = await getSupabase().from("search_analytics").select("normalizedTerm");
    const uniqueSearches = new Set((uniqueData || []).map(r => r.normalizedTerm)).size;
    const noResultCount = await count("search_analytics", { lastSearchedAt: { $gte: startDate }, hasResults: false });
    const { data: resultData } = await getSupabase().from("search_analytics").select("resultCount").gte("lastSearchedAt", startDate);
    const avgResultCount = (resultData || []).length > 0 ? (resultData.reduce((s, r) => s + (r.resultCount || 0), 0) / resultData.length) : 0;

    return { totalSearches, uniqueSearches, noResultCount, noResultRate: totalSearches > 0 ? (noResultCount / totalSearches) * 100 : 0, avgResultCount, period, generatedAt: new Date() };
  } catch (err) {
    logError("Failed to get search summary", err);
    throw err;
  }
};

export const getDealerDemandInsights = async (period = 30) => {
  try {
    const brandModelStats = await getBrandModelSearchStats(period);
    const priceRangeStats = await getPriceRangeSearchStats(period);
    const missingInventory = await getMissingInventoryReport();
    const inventory = await findAll("cars", { filters: { status: "active" } });

    const inventoryByBrand = {};
    inventory.forEach((car) => { if (car.brand) inventoryByBrand[car.brand] = (inventoryByBrand[car.brand] || 0) + 1; });

    const demandGaps = brandModelStats.map((stat) => {
      const inventoryCount = inventoryByBrand[stat.brand] || 0;
      const demandScore = stat.searchCount;
      const gap = demandScore - inventoryCount;
      return { brand: stat.brand, model: stat.model, demandScore, inventoryCount, gap, recommendation: gap > 0 ? "Increase inventory" : gap < -10 ? "Reduce inventory" : "Maintain inventory" };
    });
    demandGaps.sort((a, b) => b.gap - a.gap);

    return { demandGaps: demandGaps.slice(0, 20), priceRangeDemand: priceRangeStats.slice(0, 10), missingInventory: missingInventory.slice(0, 10), period, generatedAt: new Date() };
  } catch (err) {
    logError("Failed to get dealer demand insights", err);
    throw err;
  }
};

export default {
  trackSearch, getTrendingSearches, getNoResultSearches, getPopularFilters,
  getCountySearchStats, getPriceRangeSearchStats, getBrandModelSearchStats,
  getMissingInventoryReport, getSearchDemandReport, getSearchInsights, getSearchSummary, getDealerDemandInsights,
};
