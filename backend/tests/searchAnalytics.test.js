// backend/tests/searchAnalytics.test.js
// ─────────────────────────────────────────────────────────────
// Search Analytics tests
// Tests search analytics model and service
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import SearchAnalytics from "../models/SearchAnalytics.js";
import { startTestDB, stopTestDB, describeWithDb } from "./setup.js";

await startTestDB();
await stopTestDB();

describeWithDb("SearchAnalytics Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new search analytics record", async () => {
    const search = await SearchAnalytics.create({
      searchTerm: "Toyota Corolla",
      normalizedTerm: "toyota corolla",
      filters: {
        brand: "Toyota",
        model: "Corolla",
      },
      resultCount: 10,
      hasResults: true,
    });

    expect(search).toHaveProperty("searchTerm", "Toyota Corolla");
    expect(search).toHaveProperty("normalizedTerm", "toyota corolla");
    expect(search).toHaveProperty("resultCount", 10);
    expect(search).toHaveProperty("hasResults", true);
  });

  it("should increment search count", async () => {
    const search = await SearchAnalytics.create({
      searchTerm: "Honda Civic",
      normalizedTerm: "honda civic",
      resultCount: 5,
    });

    expect(search.searchCount).toBe(1);

    await search.incrementCount();
    await search.reload();

    expect(search.searchCount).toBe(2);
  });

  it("should update result count", async () => {
    const search = await SearchAnalytics.create({
      searchTerm: "Nissan Note",
      normalizedTerm: "nissan note",
      resultCount: 0,
    });

    expect(search.resultCount).toBe(0);
    expect(search.hasResults).toBe(false);

    await search.updateResultCount(15);
    await search.reload();

    expect(search.resultCount).toBe(15);
    expect(search.hasResults).toBe(true);
  });

  it("should calculate trending score", async () => {
    const search = await SearchAnalytics.create({
      searchTerm: "Mazda Demio",
      normalizedTerm: "mazda demio",
      searchCount: 10,
      hasResults: true,
    });

    const score = search.calculateTrendingScore();
    expect(score).toBeGreaterThan(0);
    expect(search.trendingScore).toBe(score);
  });

  it("should identify no-result searches", async () => {
    const search = await SearchAnalytics.create({
      searchTerm: "No Results Test",
      normalizedTerm: "no results test",
      resultCount: 0,
    });

    expect(search.isNoResultSearch()).toBe(true);
  });

  it("should get search hash", async () => {
    const search = await SearchAnalytics.create({
      searchTerm: "Hash Test",
      normalizedTerm: "hash test",
      filters: { brand: "Toyota" },
    });

    const hash = search.getSearchHash();
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(32); // MD5 hash length
  });

  it("should track search event", async () => {
    const searchData = {
      searchTerm: "Subaru Impreza",
      filters: { brand: "Subaru", model: "Impreza" },
      resultCount: 8,
    };

    const search = await SearchAnalytics.trackSearch(searchData);
    expect(search).toBeDefined();
    expect(search.searchTerm).toBe("Subaru Impreza");
  });

  it("should update existing search on track", async () => {
    const searchData = {
      searchTerm: "Mitsubishi Lancer",
      filters: { brand: "Mitsubishi", model: "Lancer" },
      resultCount: 3,
    };

    await SearchAnalytics.trackSearch(searchData);
    await SearchAnalytics.trackSearch(searchData);

    const search = await SearchAnalytics.getByKey("Mitsubishi Lancer");
    expect(search.searchCount).toBe(2);
  });

  it("should get trending searches", async () => {
    await SearchAnalytics.create({
      searchTerm: "Trending Test 1",
      normalizedTerm: "trending test 1",
      searchCount: 50,
      hasResults: true,
    });

    await SearchAnalytics.create({
      searchTerm: "Trending Test 2",
      normalizedTerm: "trending test 2",
      searchCount: 30,
      hasResults: true,
    });

    const trending = await SearchAnalytics.getTrendingSearches(10, 7);
    expect(Array.isArray(trending)).toBe(true);
    expect(trending.length).toBeGreaterThan(0);
  });

  it("should get no-result searches", async () => {
    await SearchAnalytics.create({
      searchTerm: "No Result Test",
      normalizedTerm: "no result test",
      searchCount: 20,
      hasResults: false,
    });

    const noResults = await SearchAnalytics.getNoResultSearches(10, 7);
    expect(Array.isArray(noResults)).toBe(true);
    expect(noResults.length).toBeGreaterThan(0);
  });

  it("should get popular filters", async () => {
    await SearchAnalytics.create({
      searchTerm: "Filter Test 1",
      filters: { brand: "Toyota" },
      searchCount: 25,
    });

    await SearchAnalytics.create({
      searchTerm: "Filter Test 2",
      filters: { brand: "Toyota" },
      searchCount: 15,
    });

    await SearchAnalytics.create({
      searchTerm: "Filter Test 3",
      filters: { brand: "Honda" },
      searchCount: 10,
    });

    const filters = await SearchAnalytics.getPopularFilters(7);
    expect(filters.brand).toBeDefined();
    expect(filters.brand.Toyota).toBe(40);
    expect(filters.brand.Honda).toBe(10);
  });

  it("should get county search stats", async () => {
    await SearchAnalytics.create({
      searchTerm: "Nairobi Test",
      filters: { county: "Nairobi" },
      searchCount: 30,
      hasResults: true,
    });

    await SearchAnalytics.create({
      searchTerm: "Nairobi No Result",
      filters: { county: "Nairobi" },
      searchCount: 10,
      hasResults: false,
    });

    const stats = await SearchAnalytics.getCountySearchStats(7);
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBeGreaterThan(0);
  });

  it("should get price range search stats", async () => {
    await SearchAnalytics.create({
      searchTerm: "Price Test 1",
      filters: { price: { min: 0, max: 500000 } },
      searchCount: 20,
    });

    const stats = await SearchAnalytics.getPriceRangeSearchStats(7);
    expect(Array.isArray(stats)).toBe(true);
  });

  it("should get brand/model search stats", async () => {
    await SearchAnalytics.create({
      searchTerm: "Brand Model Test",
      filters: { brand: "Toyota", model: "Corolla" },
      searchCount: 25,
    });

    const stats = await SearchAnalytics.getBrandModelSearchStats(7);
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBeGreaterThan(0);
  });
});

describeWithDb("SearchAnalytics Schema Validation", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should store filters object", async () => {
    const search = await SearchAnalytics.create({
      searchTerm: "Filter Test",
      filters: {
        brand: "Toyota",
        model: "Corolla",
        year: { min: 2015, max: 2020 },
        price: { min: 500000, max: 2000000 },
        county: "Nairobi",
        bodyType: "Sedan",
      },
    });

    expect(search.filters.brand).toBe("Toyota");
    expect(search.filters.model).toBe("Corolla");
    expect(search.filters.year.min).toBe(2015);
    expect(search.filters.year.max).toBe(2020);
  });

  it("should store user context", async () => {
    const userId = mongoose.Types.ObjectId();
    const search = await SearchAnalytics.create({
      searchTerm: "User Test",
      userId,
      userRole: "buyer",
    });

    expect(search.userId.toString()).toBe(userId.toString());
    expect(search.userRole).toBe("buyer");
  });

  it("should validate search type enum", async () => {
    const validTypes = ["quick_search", "advanced_search", "saved_search"];

    for (const type of validTypes) {
      const search = new SearchAnalytics({
        searchTerm: `Test ${type}`,
        searchType: type,
      });

      await expect(search.save()).resolves.toBeDefined();
    }
  });

  it("should validate category enum", async () => {
    const validCategories = ["auctions", "listings", "all"];

    for (const category of validCategories) {
      const search = new SearchAnalytics({
        searchTerm: `Test ${category}`,
        category,
      });

      await expect(search.save()).resolves.toBeDefined();
    }
  });

  it("should store trending score", async () => {
    const search = await SearchAnalytics.create({
      searchTerm: "Trending Score Test",
      searchCount: 100,
      trendingScore: 500,
    });

    expect(search.trendingScore).toBe(500);
  });

  it("should default searchCount to 1", async () => {
    const search = await SearchAnalytics.create({
      searchTerm: "Default Count Test",
    });

    expect(search.searchCount).toBe(1);
  });

  it("should default hasResults to false", async () => {
    const search = await SearchAnalytics.create({
      searchTerm: "Default Result Test",
    });

    expect(search.hasResults).toBe(false);
  });
});
