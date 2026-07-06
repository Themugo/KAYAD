// backend/tests/marketplaceHealth.test.js
// ─────────────────────────────────────────────────────────────
// Marketplace Health Monitoring tests
// Tests health score calculation, alert generation, and API endpoints
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import MarketplaceHealth from "../models/MarketplaceHealth.js";
import { startTestDB, stopTestDB, describeWithDb } from "./setup.js";

await startTestDB();
await stopTestDB();

describeWithDb("MarketplaceHealth Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new health record", async () => {
    const timestamp = new Date();
    const health = await MarketplaceHealth.create({
      period: "daily",
      timestamp,
      activeDealers: 100,
      activeBuyers: 500,
      vehiclesListed: 200,
      vehiclesSold: 50,
      overallConversionRate: 25,
      fraudIncidents: 2,
      fraudRate: 0.4,
      disputes: 5,
      disputeRate: 2.5,
      revenue: 1000000,
      paymentSuccessRate: 95,
      paymentFailures: 10,
    });

    expect(health).toHaveProperty("period", "daily");
    expect(health).toHaveProperty("activeDealers", 100);
    expect(health).toHaveProperty("healthScore");
  });

  it("should enforce period enum", async () => {
    await expect(
      MarketplaceHealth.create({
        period: "invalid_period",
        timestamp: new Date(),
      }),
    ).rejects.toThrow();
  });

  it("should calculate health score", async () => {
    const health = await MarketplaceHealth.create({
      period: "daily",
      timestamp: new Date(),
      activeDealers: 100,
      activeBuyers: 500,
      vehiclesListed: 200,
      vehiclesSold: 50,
      overallConversionRate: 25,
      fraudIncidents: 2,
      fraudRate: 0.4,
      disputes: 5,
      disputeRate: 2.5,
      revenue: 1000000,
      paymentSuccessRate: 95,
      paymentFailures: 10,
    });

    const score = health.calculateHealthScore();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(health.healthScoreBreakdown).toBeDefined();
  });

  it("should generate alerts for low inventory", async () => {
    const health = await MarketplaceHealth.create({
      period: "daily",
      timestamp: new Date(),
      vehiclesListed: 50, // Below threshold
      overallConversionRate: 25,
      fraudRate: 0.4,
      disputeRate: 2.5,
      paymentSuccessRate: 95,
    });

    const alerts = health.generateAlerts();
    const lowInventoryAlert = alerts.find((a) => a.type === "low_inventory");
    expect(lowInventoryAlert).toBeDefined();
    expect(lowInventoryAlert.severity).toBe("high");
  });

  it("should generate alerts for low conversion", async () => {
    const health = await MarketplaceHealth.create({
      period: "daily",
      timestamp: new Date(),
      vehiclesListed: 200,
      overallConversionRate: 10, // Below threshold
      fraudRate: 0.4,
      disputeRate: 2.5,
      paymentSuccessRate: 95,
    });

    const alerts = health.generateAlerts();
    const lowConversionAlert = alerts.find((a) => a.type === "low_conversion");
    expect(lowConversionAlert).toBeDefined();
    expect(lowConversionAlert.severity).toBe("high");
  });

  it("should generate alerts for high fraud rate", async () => {
    const health = await MarketplaceHealth.create({
      period: "daily",
      timestamp: new Date(),
      vehiclesListed: 200,
      overallConversionRate: 25,
      fraudRate: 6, // Above threshold
      disputeRate: 2.5,
      paymentSuccessRate: 95,
    });

    const alerts = health.generateAlerts();
    const highFraudAlert = alerts.find((a) => a.type === "high_fraud");
    expect(highFraudAlert).toBeDefined();
    expect(highFraudAlert.severity).toBe("critical");
  });

  it("should resolve alerts", async () => {
    const health = await MarketplaceHealth.create({
      period: "daily",
      timestamp: new Date(),
      vehiclesListed: 50,
      overallConversionRate: 25,
      fraudRate: 0.4,
      disputeRate: 2.5,
      paymentSuccessRate: 95,
    });

    health.generateAlerts();
    await health.save();

    await health.resolveAlert(0);
    await health.reload();

    expect(health.alerts[0].status).toBe("resolved");
    expect(health.alerts[0].resolvedAt).toBeDefined();
  });

  it("should calculate inventory health", async () => {
    const health = new MarketplaceHealth({
      period: "daily",
      timestamp: new Date(),
      vehiclesListed: 200,
      newListings: 60,
    });

    const inventoryHealth = health.calculateInventoryHealth(health);
    expect(inventoryHealth).toBeGreaterThanOrEqual(0);
    expect(inventoryHealth).toBeLessThanOrEqual(100);
  });

  it("should calculate conversion health", async () => {
    const health = new MarketplaceHealth({
      period: "daily",
      timestamp: new Date(),
      overallConversionRate: 25,
      escrowConversionRate: 60,
      auctionConversionRate: 40,
      leadConversionRate: 20,
    });

    const conversionHealth = health.calculateConversionHealth(health);
    expect(conversionHealth).toBeGreaterThanOrEqual(0);
    expect(conversionHealth).toBeLessThanOrEqual(100);
  });

  it("should calculate user activity", async () => {
    const health = new MarketplaceHealth({
      period: "daily",
      timestamp: new Date(),
      activeDealers: 150,
      activeBuyers: 600,
      newDealers: 15,
      newBuyers: 60,
    });

    const userActivity = health.calculateUserActivity(health);
    expect(userActivity).toBeGreaterThanOrEqual(0);
    expect(userActivity).toBeLessThanOrEqual(100);
  });

  it("should calculate financial health", async () => {
    const health = new MarketplaceHealth({
      period: "daily",
      timestamp: new Date(),
      revenue: 2000000,
      paymentSuccessRate: 92,
      paymentFailures: 15,
    });

    const financialHealth = health.calculateFinancialHealth(health);
    expect(financialHealth).toBeGreaterThanOrEqual(0);
    expect(financialHealth).toBeLessThanOrEqual(100);
  });

  it("should calculate trust & safety", async () => {
    const health = new MarketplaceHealth({
      period: "daily",
      timestamp: new Date(),
      fraudRate: 0.5,
      disputeRate: 1.5,
      fraudIncidents: 5,
      disputes: 10,
    });

    const trustSafety = health.calculateTrustSafety(health);
    expect(trustSafety).toBeGreaterThanOrEqual(0);
    expect(trustSafety).toBeLessThanOrEqual(100);
  });

  it("should generate hourly health", async () => {
    const date = new Date();
    const health = await MarketplaceHealth.generateHourlyHealth(date);

    expect(health).toBeNull(); // No data in memory server
  });

  it("should generate daily health", async () => {
    const date = new Date();
    const health = await MarketplaceHealth.generateDailyHealth(date);

    expect(health).toBeNull(); // No data in memory server
  });

  it("should get active alerts", async () => {
    const health = await MarketplaceHealth.create({
      period: "daily",
      timestamp: new Date(),
      vehiclesListed: 50,
      overallConversionRate: 25,
      fraudRate: 0.4,
      disputeRate: 2.5,
      paymentSuccessRate: 95,
    });

    health.generateAlerts();
    await health.save();

    const activeAlerts = await MarketplaceHealth.getActiveAlerts();
    expect(Array.isArray(activeAlerts)).toBe(true);
    expect(activeAlerts.length).toBeGreaterThan(0);
  });

  it("should get health trend", async () => {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const trend = await MarketplaceHealth.getHealthTrend(startDate, endDate);
    expect(Array.isArray(trend)).toBe(true);
  });
});

describeWithDb("MarketplaceHealth Schema Validation", () => {
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
    const health = new MarketplaceHealth({
      timestamp: new Date(),
    });

    await expect(health.save()).rejects.toThrow();
  });

  it("should require timestamp field", async () => {
    const health = new MarketplaceHealth({
      period: "daily",
    });

    await expect(health.save()).rejects.toThrow();
  });

  it("should accept valid period values", async () => {
    const validPeriods = ["hourly", "daily", "weekly", "monthly"];

    for (const period of validPeriods) {
      const health = new MarketplaceHealth({
        period,
        timestamp: new Date(),
      });

      await expect(health.save()).resolves.toBeDefined();
    }
  });

  it("should store alerts array", async () => {
    const health = await MarketplaceHealth.create({
      period: "daily",
      timestamp: new Date(),
      vehiclesListed: 50,
      overallConversionRate: 25,
      fraudRate: 0.4,
      disputeRate: 2.5,
      paymentSuccessRate: 95,
      alerts: [
        {
          type: "low_inventory",
          severity: "high",
          message: "Low inventory alert",
          value: 50,
          threshold: 100,
        },
      ],
    });

    expect(health.alerts).toHaveLength(1);
    expect(health.alerts[0].type).toBe("low_inventory");
  });

  it("should store health score breakdown", async () => {
    const health = await MarketplaceHealth.create({
      period: "daily",
      timestamp: new Date(),
      healthScore: 85,
      healthScoreBreakdown: {
        inventoryHealth: 90,
        conversionHealth: 80,
        userActivity: 85,
        financialHealth: 90,
        trustSafety: 85,
      },
    });

    expect(health.healthScore).toBe(85);
    expect(health.healthScoreBreakdown.inventoryHealth).toBe(90);
  });
});
