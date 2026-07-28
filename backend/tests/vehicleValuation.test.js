// backend/tests/vehicleValuation.test.js
// ─────────────────────────────────────────────────────────────
// Vehicle Valuation tests
// Tests vehicle valuation models and services
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import VehicleValuation from "../models/VehicleValuation.js";
import MarketPricing from "../models/MarketPricing.js";
import BrandDepreciation from "../models/BrandDepreciation.js";
import MileageImpact from "../models/MileageImpact.js";
import DemandSignals from "../models/DemandSignals.js";
import { startTestDB, stopTestDB, describeWithDb } from "./setup.js";

await startTestDB();
await stopTestDB();

describeWithDb("VehicleValuation Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new vehicle valuation", async () => {
    const carId = mongoose.Types.ObjectId();

    const valuation = await VehicleValuation.create({
      car: carId,
      vehicle: {
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        mileage: 50000,
      },
      location: {
        city: "Nairobi",
        county: "Nairobi",
      },
      pricing: {
        listingPrice: 1500000,
      },
      source: "listing",
    });

    expect(valuation).toHaveProperty("car", carId);
    expect(valuation.vehicle.brand).toBe("Toyota");
    expect(valuation.pricing.listingPrice).toBe(1500000);
    expect(valuation.source).toBe("listing");
  });

  it("should calculate price difference", async () => {
    const carId = mongoose.Types.ObjectId();

    const valuation = await VehicleValuation.create({
      car: carId,
      vehicle: {
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
      },
      location: {
        city: "Nairobi",
        county: "Nairobi",
      },
      pricing: {
        listingPrice: 1500000,
        salePrice: 1400000,
      },
      source: "listing",
    });

    await valuation.calculatePriceDifference();
    await valuation.reload();

    expect(valuation.pricing.priceDifference).toBe(-100000);
    expect(valuation.pricing.priceChangePercent).toBeCloseTo(-6.67, 1);
  });

  it("should update market position", async () => {
    const carId = mongoose.Types.ObjectId();

    const valuation = await VehicleValuation.create({
      car: carId,
      vehicle: {
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
      },
      location: {
        city: "Nairobi",
        county: "Nairobi",
      },
      pricing: {
        listingPrice: 1500000,
      },
      source: "listing",
    });

    await valuation.updateMarketPosition(1400000);
    await valuation.reload();

    expect(valuation.valuation.marketPosition.type).toBe("above_market");
    expect(valuation.valuation.marketPosition.percent).toBeCloseTo(7.14, 1);
  });

  it("should add historical price", async () => {
    const carId = mongoose.Types.ObjectId();

    const valuation = await VehicleValuation.create({
      car: carId,
      vehicle: {
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
      },
      location: {
        city: "Nairobi",
        county: "Nairobi",
      },
      pricing: {
        listingPrice: 1500000,
      },
      source: "listing",
    });

    await valuation.addHistoricalPrice(1450000, "listing");
    await valuation.reload();

    expect(valuation.historical.previousPrices).toHaveLength(1);
    expect(valuation.historical.previousPrices[0].price).toBe(1450000);
  });

  it("should calculate confidence", async () => {
    const carId = mongoose.Types.ObjectId();

    const valuation = await VehicleValuation.create({
      car: carId,
      vehicle: {
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        mileage: 50000,
      },
      location: {
        city: "Nairobi",
        county: "Nairobi",
      },
      pricing: {
        listingPrice: 1500000,
        salePrice: 1400000,
      },
      market: {
        demandScore: 0.75,
        competitionLevel: 0.5,
      },
      source: "listing",
    });

    await valuation.calculateConfidence();
    await valuation.reload();

    expect(valuation.valuation.confidence).toBeGreaterThan(0);
    expect(valuation.valuation.confidence).toBeLessThanOrEqual(1);
  });

  it("should get valuations by vehicle", async () => {
    const carId = mongoose.Types.ObjectId();

    await VehicleValuation.create({
      car: carId,
      vehicle: {
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
      },
      location: {
        city: "Nairobi",
        county: "Nairobi",
      },
      pricing: {
        listingPrice: 1500000,
      },
      source: "listing",
    });

    const valuations = await VehicleValuation.getByVehicle(carId);

    expect(valuations).toHaveLength(1);
  });

  it("should get valuations by county", async () => {
    await VehicleValuation.create({
      vehicle: {
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
      },
      location: {
        city: "Nairobi",
        county: "Nairobi",
      },
      pricing: {
        listingPrice: 1500000,
      },
      source: "listing",
    });

    const valuations = await VehicleValuation.getByCounty("Nairobi");

    expect(valuations).toHaveLength(1);
  });
});

describeWithDb("MarketPricing Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new market pricing", async () => {
    const marketPricing = await MarketPricing.create({
      county: "Nairobi",
      vehicle: {
        brand: "Toyota",
        bodyType: "Sedan",
      },
      pricing: {
        averagePrice: 1500000,
        medianPrice: 1400000,
        priceRange: {
          low: 1200000,
          high: 1800000,
        },
      },
      metrics: {
        totalListings: 100,
        totalSales: 50,
        demandScore: 0.75,
      },
    });

    expect(marketPricing.county).toBe("Nairobi");
    expect(marketPricing.pricing.averagePrice).toBe(1500000);
  });

  it("should calculate average price", async () => {
    const marketPricing = await MarketPricing.create({
      county: "Nairobi",
    });

    const prices = [1500000, 1400000, 1600000];
    await marketPricing.calculateAveragePrice(prices);
    await marketPricing.reload();

    expect(marketPricing.pricing.averagePrice).toBe(1500000);
  });

  it("should calculate price range", async () => {
    const marketPricing = await MarketPricing.create({
      county: "Nairobi",
    });

    const prices = [1200000, 1400000, 1600000, 1800000];
    await marketPricing.calculatePriceRange(prices);
    await marketPricing.reload();

    expect(marketPricing.pricing.priceRange.low).toBe(1400000);
    expect(marketPricing.pricing.priceRange.high).toBe(1600000);
  });

  it("should update trend", async () => {
    const marketPricing = await MarketPricing.create({
      county: "Nairobi",
      pricing: {
        averagePrice: 1500000,
      },
    });

    await marketPricing.updateTrend(1400000);
    await marketPricing.reload();

    expect(marketPricing.trend.direction).toBe("increasing");
    expect(marketPricing.trend.percentChange).toBeCloseTo(7.14, 1);
  });

  it("should get market pricing by county", async () => {
    await MarketPricing.create({
      county: "Nairobi",
      pricing: {
        averagePrice: 1500000,
      },
    });

    const marketPricing = await MarketPricing.getByCounty("Nairobi");

    expect(marketPricing).toHaveLength(1);
  });
});

describeWithDb("BrandDepreciation Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new brand depreciation", async () => {
    const brandDepreciation = await BrandDepreciation.create({
      brand: "Toyota",
      depreciation: {
        annualRate: 0.15,
        fiveYearRate: 0.75,
        tenYearRate: 1.5,
        resaleValue: {
          after1Year: 0.85,
          after3Years: 0.55,
          after5Years: 0.25,
          after10Years: 0.1,
        },
      },
      market: {
        reliabilityScore: 8,
        popularityScore: 9,
        maintenanceCost: 6,
      },
    });

    expect(brandDepreciation.brand).toBe("Toyota");
    expect(brandDepreciation.depreciation.annualRate).toBe(0.15);
  });

  it("should calculate depreciation rate", async () => {
    const brandDepreciation = await BrandDepreciation.create({
      brand: "Toyota",
    });

    const prices = [1500000, 1275000, 1050000];
    await brandDepreciation.calculateDepreciationRate(prices);
    await brandDepreciation.reload();

    expect(brandDepreciation.depreciation.annualRate).toBeCloseTo(0.15, 2);
  });

  it("should predict resale value", async () => {
    const brandDepreciation = await BrandDepreciation.create({
      brand: "Toyota",
      depreciation: {
        annualRate: 0.15,
      },
    });

    const resaleValue = brandDepreciation.predictResaleValue(1500000, 3);

    expect(resaleValue).toBeCloseTo(918375, 0);
  });

  it("should add historical data", async () => {
    const brandDepreciation = await BrandDepreciation.create({
      brand: "Toyota",
    });

    await brandDepreciation.updateHistoricalData(2020, 1500000, 0.15, 100);
    await brandDepreciation.reload();

    expect(brandDepreciation.historical).toHaveLength(1);
    expect(brandDepreciation.historical[0].year).toBe(2020);
  });

  it("should get brand depreciation by brand", async () => {
    await BrandDepreciation.create({
      brand: "Toyota",
      depreciation: {
        annualRate: 0.15,
      },
    });

    const brandDepreciation = await BrandDepreciation.getByBrand("Toyota");

    expect(brandDepreciation).not.toBeNull();
    expect(brandDepreciation.brand).toBe("Toyota");
  });
});

describeWithDb("MileageImpact Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new mileage impact", async () => {
    const mileageImpact = await MileageImpact.create({
      vehicle: {
        brand: "Toyota",
        bodyType: "Sedan",
      },
      mileageRanges: [
        {
          minMileage: 0,
          maxMileage: 50000,
          averagePrice: 1500000,
          pricePerMile: 30,
          depreciationFactor: 0.02,
          sampleSize: 100,
        },
      ],
      impact: {
        pricePer1000Miles: 30000,
        criticalMileage: 100000,
        severeDepreciationThreshold: 150000,
      },
    });

    expect(mileageImpact.vehicle.brand).toBe("Toyota");
    expect(mileageImpact.mileageRanges).toHaveLength(1);
  });

  it("should calculate mileage impact", async () => {
    const mileageImpact = await MileageImpact.create({
      vehicle: {
        brand: "Toyota",
      },
    });

    await mileageImpact.calculateMileageImpact(50000, 1500000);
    await mileageImpact.reload();

    expect(mileageImpact.impact.pricePer1000Miles).toBe(30000);
  });

  it("should get price per mile", async () => {
    const mileageImpact = await MileageImpact.create({
      vehicle: {
        brand: "Toyota",
      },
      mileageRanges: [
        {
          minMileage: 0,
          maxMileage: 50000,
          pricePerMile: 30,
        },
      ],
    });

    const pricePerMile = mileageImpact.getPricePerMile(25000);

    expect(pricePerMile).toBe(30);
  });

  it("should predict mileage depreciation", async () => {
    const mileageImpact = await MileageImpact.create({
      vehicle: {
        brand: "Toyota",
      },
      mileageRanges: [
        {
          minMileage: 0,
          maxMileage: 50000,
          pricePerMile: 30,
        },
      ],
    });

    const depreciation = mileageImpact.predictMileageDepreciation(50000, 1500000);

    expect(depreciation).toBe(1500000);
  });

  it("should add mileage range", async () => {
    const mileageImpact = await MileageImpact.create({
      vehicle: {
        brand: "Toyota",
      },
    });

    await mileageImpact.addMileageRange(0, 50000, 1500000, 30, 0.02, 100);
    await mileageImpact.reload();

    expect(mileageImpact.mileageRanges).toHaveLength(1);
  });
});

describeWithDb("DemandSignals Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new demand signal", async () => {
    const demandSignal = await DemandSignals.create({
      search: {
        searchTerm: "Toyota Corolla",
        normalizedTerm: "toyota corolla",
        filters: {
          brand: "Toyota",
          model: "Corolla",
          county: "Nairobi",
        },
      },
      demand: {
        searchVolume: 100,
        trend: "increasing",
        trendPercent: 15,
        competitionLevel: 0.5,
        urgencyScore: 0.75,
      },
      priceImpact: {
        averagePrice: 1500000,
        pricePremium: 150000,
        demandMultiplier: 1.1,
      },
    });

    expect(demandSignal.search.searchTerm).toBe("Toyota Corolla");
    expect(demandSignal.demand.searchVolume).toBe(100);
  });

  it("should calculate demand score", async () => {
    const demandSignal = await DemandSignals.create({
      search: {
        searchTerm: "Toyota Corolla",
      },
    });

    await demandSignal.calculateDemandScore(500, 0.5);
    await demandSignal.reload();

    expect(demandSignal.demand.urgencyScore).toBeGreaterThan(0);
    expect(demandSignal.demand.urgencyScore).toBeLessThanOrEqual(1);
  });

  it("should update trend", async () => {
    const demandSignal = await DemandSignals.create({
      search: {
        searchTerm: "Toyota Corolla",
      },
      demand: {
        searchVolume: 100,
      },
    });

    await demandSignal.updateTrend(80);
    await demandSignal.reload();

    expect(demandSignal.demand.trend).toBe("increasing");
    expect(demandSignal.demand.trendPercent).toBe(25);
  });

  it("should calculate price impact", async () => {
    const demandSignal = await DemandSignals.create({
      search: {
        searchTerm: "Toyota Corolla",
      },
      demand: {
        urgencyScore: 0.8,
      },
    });

    await demandSignal.calculatePriceImpact(1500000);
    await demandSignal.reload();

    expect(demandSignal.priceImpact.demandMultiplier).toBe(1.1);
    expect(demandSignal.priceImpact.pricePremium).toBe(150000);
  });

  it("should add historical data", async () => {
    const demandSignal = await DemandSignals.create({
      search: {
        searchTerm: "Toyota Corolla",
      },
      demand: {
        searchVolume: 100,
      },
      priceImpact: {
        averagePrice: 1500000,
        demandMultiplier: 1.0,
      },
    });

    await demandSignal.addHistoricalData();
    await demandSignal.reload();

    expect(demandSignal.historical).toHaveLength(1);
  });

  it("should get demand signals by search term", async () => {
    await DemandSignals.create({
      search: {
        searchTerm: "Toyota Corolla",
      },
      demand: {
        searchVolume: 100,
      },
    });

    const demandSignals = await DemandSignals.getBySearchTerm("Toyota Corolla");

    expect(demandSignals).toHaveLength(1);
  });

  it("should get demand signals by county", async () => {
    await DemandSignals.create({
      search: {
        searchTerm: "Toyota Corolla",
        filters: {
          county: "Nairobi",
        },
      },
      demand: {
        searchVolume: 100,
      },
    });

    const demandSignals = await DemandSignals.getByCounty("Nairobi");

    expect(demandSignals).toHaveLength(1);
  });
});
