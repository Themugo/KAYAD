// backend/tests/dealerHealthScore.test.js
// ─────────────────────────────────────────────────────────────
// Dealer Health Score tests
// Tests health score calculation and management
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import DealerHealthScore from "../models/DealerHealthScore.js";
import { startTestDB, stopTestDB, describeWithDb } from "./setup.js";

await startTestDB();
await stopTestDB();
import {
  calculateVerificationScore,
  calculateAccountAgeScore,
  calculateTransactionScore,
  calculateEscrowScore,
  calculateReviewScore,
  calculateFraudScore,
  calculateResponseScore,
  calculateListingQualityScore,
  calculateAuctionScore,
} from "../services/dealerHealthScoreService.js";

describeWithDb("Dealer Health Score Service", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describeWithDb("Verification Score Calculation", () => {
    it("should calculate verification score with all documents verified", async () => {
      const result = await calculateVerificationScore("dealer123");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("details");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should return 0 score when verification not found", async () => {
      const result = await calculateVerificationScore("nonexistent");
      expect(result.score).toBe(0);
    });
  });

  describeWithDb("Account Age Score Calculation", () => {
    it("should calculate account age score based on account age", async () => {
      const result = await calculateAccountAgeScore("dealer123");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("details");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should return 0 score for new accounts", async () => {
      const result = await calculateAccountAgeScore("nonexistent");
      expect(result.score).toBe(0);
    });
  });

  describeWithDb("Transaction Score Calculation", () => {
    it("should calculate transaction score based on success rate", async () => {
      const result = await calculateTransactionScore("dealer123");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("details");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should return default score when no transactions", async () => {
      const result = await calculateTransactionScore("nonexistent");
      expect(result.score).toBe(50);
    });
  });

  describeWithDb("Escrow Score Calculation", () => {
    it("should calculate escrow score based on completion rate", async () => {
      const result = await calculateEscrowScore("dealer123");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("details");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should return default score when no escrows", async () => {
      const result = await calculateEscrowScore("nonexistent");
      expect(result.score).toBe(75);
    });
  });

  describeWithDb("Review Score Calculation", () => {
    it("should calculate review score based on ratings", async () => {
      const result = await calculateReviewScore("dealer123");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("details");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should return default score when no reviews", async () => {
      const result = await calculateReviewScore("nonexistent");
      expect(result.score).toBe(70);
    });
  });

  describeWithDb("Fraud Score Calculation", () => {
    it("should calculate fraud score based on flags", async () => {
      const result = await calculateFraudScore("dealer123");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("details");
      expect(result.score).toBeGreaterThanOrEqual(-100);
      expect(result.score).toBeLessThanOrEqual(0);
    });

    it("should return 0 score when no fraud flags", async () => {
      const result = await calculateFraudScore("nonexistent");
      expect(result.score).toBe(0);
    });
  });

  describeWithDb("Response Score Calculation", () => {
    it("should calculate response score based on response time", async () => {
      const result = await calculateResponseScore("dealer123");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("details");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should return default score when no response data", async () => {
      const result = await calculateResponseScore("nonexistent");
      expect(result.score).toBe(70);
    });
  });

  describeWithDb("Listing Quality Score Calculation", () => {
    it("should calculate listing quality score based on listing data", async () => {
      const result = await calculateListingQualityScore("dealer123");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("details");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should return default score when no listings", async () => {
      const result = await calculateListingQualityScore("nonexistent");
      expect(result.score).toBe(70);
    });
  });

  describeWithDb("Auction Score Calculation", () => {
    it("should calculate auction score based on auction performance", async () => {
      const result = await calculateAuctionScore("dealer123");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("details");
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should return default score when no auctions", async () => {
      const result = await calculateAuctionScore("nonexistent");
      expect(result.score).toBe(70);
    });
  });
});

describeWithDb("DealerHealthScore Model", () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new health score record", async () => {
    const healthScore = await DealerHealthScore.create({
      dealer: new mongoose.Types.ObjectId(),
      healthScore: 85,
      scoreCategory: "gold",
      verificationScore: 80,
      accountAgeScore: 75,
      transactionScore: 90,
      escrowScore: 85,
      reviewScore: 88,
      fraudScore: 0,
      responseScore: 70,
      listingQualityScore: 80,
      auctionScore: 75,
    });

    expect(healthScore).toHaveProperty("healthScore", 85);
    expect(healthScore).toHaveProperty("scoreCategory", "gold");
  });

  it("should determine score category correctly", async () => {
    expect(DealerHealthScore.determineScoreCategory(95)).toBe("platinum");
    expect(DealerHealthScore.determineScoreCategory(80)).toBe("gold");
    expect(DealerHealthScore.determineScoreCategory(65)).toBe("silver");
    expect(DealerHealthScore.determineScoreCategory(50)).toBe("warning");
    expect(DealerHealthScore.determineScoreCategory(25)).toBe("high_risk");
  });

  it("should enforce score range constraints", async () => {
    const healthScore = await DealerHealthScore.create({
      dealer: new mongoose.Types.ObjectId(),
      healthScore: 150, // Should be clamped to 100
    });

    expect(healthScore.healthScore).toBeLessThanOrEqual(100);
  });
});

describeWithDb("Score Category Determination", () => {
  it("should correctly categorize platinum scores", () => {
    expect(DealerHealthScore.determineScoreCategory(90)).toBe("platinum");
    expect(DealerHealthScore.determineScoreCategory(100)).toBe("platinum");
  });

  it("should correctly categorize gold scores", () => {
    expect(DealerHealthScore.determineScoreCategory(75)).toBe("gold");
    expect(DealerHealthScore.determineScoreCategory(89)).toBe("gold");
  });

  it("should correctly categorize silver scores", () => {
    expect(DealerHealthScore.determineScoreCategory(60)).toBe("silver");
    expect(DealerHealthScore.determineScoreCategory(74)).toBe("silver");
  });

  it("should correctly categorize warning scores", () => {
    expect(DealerHealthScore.determineScoreCategory(40)).toBe("warning");
    expect(DealerHealthScore.determineScoreCategory(59)).toBe("warning");
  });

  it("should correctly categorize high risk scores", () => {
    expect(DealerHealthScore.determineScoreCategory(0)).toBe("high_risk");
    expect(DealerHealthScore.determineScoreCategory(39)).toBe("high_risk");
  });
});
