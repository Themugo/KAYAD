// backend/tests/listingQuality.test.js
// ─────────────────────────────────────────────────────────────
// Listing Quality tests
// Tests listing quality model and service
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import ListingQuality from "../models/ListingQuality.js";

describe("ListingQuality Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new listing quality record", async () => {
    const carId = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    const quality = await ListingQuality.create({
      car: carId,
      dealer: dealerId,
      overallScore: 75,
      rating: "Good",
    });

    expect(quality).toHaveProperty("car", carId);
    expect(quality).toHaveProperty("dealer", dealerId);
    expect(quality).toHaveProperty("overallScore", 75);
    expect(quality).toHaveProperty("rating", "Good");
  });

  it("should enforce unique car field", async () => {
    const carId = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    await ListingQuality.create({
      car: carId,
      dealer: dealerId,
    });

    await expect(
      ListingQuality.create({
        car: carId,
        dealer: dealerId,
      }),
    ).rejects.toThrow();
  });

  it("should enforce rating enum", async () => {
    const carId = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    await expect(
      ListingQuality.create({
        car: carId,
        dealer: dealerId,
        rating: "invalid_rating",
      }),
    ).rejects.toThrow();
  });

  it("should enforce overall score range", async () => {
    const carId = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    await expect(
      ListingQuality.create({
        car: carId,
        dealer: dealerId,
        overallScore: 150,
      }),
    ).rejects.toThrow();
  });

  it("should get rating based on score", async () => {
    const quality = new ListingQuality({
      car: mongoose.Types.ObjectId(),
      dealer: mongoose.Types.ObjectId(),
    });

    expect(quality.getRating(95)).toBe("Excellent");
    expect(quality.getRating(80)).toBe("Good");
    expect(quality.getRating(60)).toBe("Average");
    expect(quality.getRating(30)).toBe("Poor");
  });

  it("should calculate image count score", async () => {
    const quality = new ListingQuality({
      car: mongoose.Types.ObjectId(),
      dealer: mongoose.Types.ObjectId(),
    });

    const car = {
      images: Array(5).fill({ url: "test" }),
    };

    const score = quality.calculateImageCountScore(car);
    expect(score.score).toBe(50);
    expect(score.details.imageCount).toBe(5);
  });

  it("should calculate description quality score", async () => {
    const quality = new ListingQuality({
      car: mongoose.Types.ObjectId(),
      dealer: mongoose.Types.ObjectId(),
    });

    const car = {
      description:
        "This is a test description with enough words to pass the minimum requirement. It includes details about condition, history, and features.",
    };

    const score = quality.calculateDescriptionQualityScore(car);
    expect(score.score).toBeGreaterThan(0);
    expect(score.details.wordCount).toBeGreaterThan(50);
  });

  it("should calculate missing attributes score", async () => {
    const quality = new ListingQuality({
      car: mongoose.Types.ObjectId(),
      dealer: mongoose.Types.ObjectId(),
    });

    const car = {
      brand: "Toyota",
      model: "Corolla",
      year: 2020,
      price: 1000000,
      mileage: 50000,
      fuel: "Petrol",
      transmission: "Automatic",
      bodyType: "Sedan",
      color: "White",
      condition: "Used",
    };

    const score = quality.calculateMissingAttributesScore(car);
    expect(score.score).toBe(100);
    expect(score.details.missingFields).toHaveLength(0);
  });

  it("should generate recommendations for missing images", async () => {
    const quality = new ListingQuality({
      car: mongoose.Types.ObjectId(),
      dealer: mongoose.Types.ObjectId(),
    });

    const car = {
      images: [],
    };

    const breakdown = {
      imageCount: {
        score: 0,
        weight: 0.25,
        details: {
          imageCount: 0,
          recommendedCount: 10,
        },
      },
    };

    const recommendations = quality.generateRecommendations(car, null);
    const imageRec = recommendations.find((r) => r.category === "images");
    expect(imageRec).toBeDefined();
    expect(imageRec.priority).toBe("high");
  });

  it("should get quality distribution", async () => {
    const carId1 = mongoose.Types.ObjectId();
    const carId2 = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    await ListingQuality.create({
      car: carId1,
      dealer: dealerId,
      overallScore: 85,
      rating: "Good",
    });

    await ListingQuality.create({
      car: carId2,
      dealer: dealerId,
      overallScore: 45,
      rating: "Poor",
    });

    const distribution = await ListingQuality.getQualityDistribution();
    expect(Array.isArray(distribution)).toBe(true);
    expect(distribution.length).toBeGreaterThan(0);
  });

  it("should get low quality listings", async () => {
    const carId1 = mongoose.Types.ObjectId();
    const carId2 = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    await ListingQuality.create({
      car: carId1,
      dealer: dealerId,
      overallScore: 30,
      rating: "Poor",
    });

    await ListingQuality.create({
      car: carId2,
      dealer: dealerId,
      overallScore: 80,
      rating: "Good",
    });

    const lowQuality = await ListingQuality.getLowQuality(50);
    expect(lowQuality.length).toBe(1);
    expect(lowQuality[0].overallScore).toBe(30);
  });
});

describe("ListingQuality Schema Validation", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should require car field", async () => {
    const quality = new ListingQuality({
      dealer: mongoose.Types.ObjectId(),
    });

    await expect(quality.save()).rejects.toThrow();
  });

  it("should store score breakdown", async () => {
    const carId = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    const quality = await ListingQuality.create({
      car: carId,
      dealer: dealerId,
      overallScore: 75,
      rating: "Good",
      scoreBreakdown: {
        imageCount: {
          score: 80,
          weight: 0.25,
          details: {
            imageCount: 8,
            recommendedCount: 10,
          },
        },
      },
    });

    expect(quality.scoreBreakdown.imageCount.score).toBe(80);
    expect(quality.scoreBreakdown.imageCount.weight).toBe(0.25);
  });

  it("should store recommendations array", async () => {
    const carId = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    const quality = await ListingQuality.create({
      car: carId,
      dealer: dealerId,
      recommendations: [
        {
          category: "images",
          priority: "high",
          message: "Add more images",
          action: "Upload 5 more images",
        },
      ],
    });

    expect(quality.recommendations).toHaveLength(1);
    expect(quality.recommendations[0].category).toBe("images");
  });

  it("should enforce recommendation category enum", async () => {
    const carId = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    await expect(
      ListingQuality.create({
        car: carId,
        dealer: dealerId,
        recommendations: [
          {
            category: "invalid_category",
            priority: "high",
            message: "Test",
            action: "Test",
          },
        ],
      }),
    ).rejects.toThrow();
  });

  it("should enforce recommendation priority enum", async () => {
    const carId = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    await expect(
      ListingQuality.create({
        car: carId,
        dealer: dealerId,
        recommendations: [
          {
            category: "images",
            priority: "invalid_priority",
            message: "Test",
            action: "Test",
          },
        ],
      }),
    ).rejects.toThrow();
  });

  it("should default lastCalculatedAt to current date", async () => {
    const carId = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    const quality = await ListingQuality.create({
      car: carId,
      dealer: dealerId,
    });

    expect(quality.lastCalculatedAt).toBeDefined();
    expect(quality.lastCalculatedAt).toBeInstanceOf(Date);
  });

  it("should default calculationVersion", async () => {
    const carId = mongoose.Types.ObjectId();
    const dealerId = mongoose.Types.ObjectId();

    const quality = await ListingQuality.create({
      car: carId,
      dealer: dealerId,
    });

    expect(quality.calculationVersion).toBe("1.0.0");
  });
});
