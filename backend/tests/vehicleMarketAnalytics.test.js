// backend/tests/vehicleMarketAnalytics.test.js
// ─────────────────────────────────────────────────────────────
// Vehicle Market Analytics tests
// Tests market analytics calculations and API endpoints
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import VehicleMarketAnalytics from "../models/VehicleMarketAnalytics.js";
import {
  calculateAverageSellingPrice,
  calculateAverageListingPrice,
  calculateDaysOnMarket,
  getMostViewedVehicles,
  getBrandTrends,
  getCountyTrends,
} from "../services/vehicleAnalyticsService.js";

describe("Vehicle Market Analytics Service", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("Average Price Calculations", () => {
    it("should return 0 when no data available", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const avgSellingPrice = await calculateAverageSellingPrice(startDate, endDate);
      const avgListingPrice = await calculateAverageListingPrice(startDate, endDate);

      expect(avgSellingPrice).toBe(0);
      expect(avgListingPrice).toBe(0);
    });
  });

  describe("Days on Market Calculation", () => {
    it("should return zeros when no sold cars", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const daysOnMarket = await calculateDaysOnMarket(startDate, endDate);

      expect(daysOnMarket).toEqual({
        average: 0,
        median: 0,
        fastest: 0,
      });
    });
  });

  describe("Brand Trends", () => {
    it("should return empty array when no data", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const brandTrends = await getBrandTrends(startDate, endDate);

      expect(Array.isArray(brandTrends)).toBe(true);
      expect(brandTrends.length).toBe(0);
    });
  });

  describe("County Trends", () => {
    it("should return empty array when no data", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const countyTrends = await getCountyTrends(startDate, endDate);

      expect(Array.isArray(countyTrends)).toBe(true);
      expect(countyTrends.length).toBe(0);
    });
  });

  describe("Most Viewed Vehicles", () => {
    it("should return empty array when no data", async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const mostViewed = await getMostViewedVehicles(10, startDate, endDate);

      expect(Array.isArray(mostViewed)).toBe(true);
      expect(mostViewed.length).toBe(0);
    });
  });
});

describe("VehicleMarketAnalytics Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new analytics record", async () => {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const analytics = await VehicleMarketAnalytics.create({
      period: "daily",
      startDate,
      endDate,
      averageSellingPrice: 1000000,
      averageListingPrice: 1200000,
      totalListings: 100,
      totalSales: 20,
      conversionRate: 20,
    });

    expect(analytics).toHaveProperty("period", "daily");
    expect(analytics).toHaveProperty("averageSellingPrice", 1000000);
    expect(analytics).toHaveProperty("totalListings", 100);
  });

  it("should enforce period enum", async () => {
    await expect(
      VehicleMarketAnalytics.create({
        period: "invalid_period",
        startDate: new Date(),
        endDate: new Date(),
      })
    ).rejects.toThrow();
  });

  it("should generate daily analytics", async () => {
    const date = new Date();
    const analytics = await VehicleMarketAnalytics.generateDailyAnalytics(date);

    expect(analytics).toBeNull(); // No data in memory server
  });

  it("should generate weekly analytics", async () => {
    const date = new Date();
    const analytics = await VehicleMarketAnalytics.generateWeeklyAnalytics(date);

    expect(analytics).toBeNull(); // No data in memory server
  });

  it("should generate monthly analytics", async () => {
    const date = new Date();
    const analytics = await VehicleMarketAnalytics.generateMonthlyAnalytics(date);

    expect(analytics).toBeNull(); // No data in memory server
  });
});

describe("VehicleMarketAnalytics Schema Validation", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should require period field", async () => {
    const analytics = new VehicleMarketAnalytics({
      startDate: new Date(),
      endDate: new Date(),
    });

    await expect(analytics.save()).rejects.toThrow();
  });

  it("should require startDate and endDate", async () => {
    const analytics = new VehicleMarketAnalytics({
      period: "daily",
    });

    await expect(analytics.save()).rejects.toThrow();
  });

  it("should accept valid period values", async () => {
    const validPeriods = ["daily", "weekly", "monthly", "quarterly", "yearly"];

    for (const period of validPeriods) {
      const analytics = new VehicleMarketAnalytics({
        period,
        startDate: new Date(),
        endDate: new Date(),
      });

      await expect(analytics.save()).resolves.toBeDefined();
    }
  });

  it("should store trend data arrays", async () => {
    const analytics = await VehicleMarketAnalytics.create({
      period: "daily",
      startDate: new Date(),
      endDate: new Date(),
      brandTrends: [
        {
          brand: "Toyota",
          averagePrice: 1000000,
          volume: 10,
          daysOnMarket: 30,
          marketShare: 20,
        },
      ],
      countyTrends: [
        {
          county: "Nairobi",
          averagePrice: 1200000,
          volume: 5,
          daysOnMarket: 25,
        },
      ],
    });

    expect(analytics.brandTrends).toHaveLength(1);
    expect(analytics.brandTrends[0].brand).toBe("Toyota");
    expect(analytics.countyTrends).toHaveLength(1);
    expect(analytics.countyTrends[0].county).toBe("Nairobi");
  });
});
