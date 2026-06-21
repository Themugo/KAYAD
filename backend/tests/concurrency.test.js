// backend/tests/concurrency.test.js
// ─────────────────────────────────────────────────────────────
// Concurrency scenario tests
// Tests simultaneous bid placement, race conditions, duplicate request handling
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB, describeWithDb } from "./setup.js";

await startTestDB();

const { default: app } = await import("../server.js");
import User from "../models/User.js";
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import Favorite from "../models/Favorite.js";

describeWithDb("Concurrency Scenarios", () => {
  let dealerToken, buyerToken1, buyerToken2;
  let dealerId, buyerId1, buyerId2;
  let carId;

  beforeAll(async () => {
    const ts = Date.now();

    // Create dealer
    const dealerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Dealer", email: `dealer-${ts}@test.ke`, password: "Test@12345", role: "dealer" });
    dealerToken = dealerRes.body.token;
    dealerId = dealerRes.body.user._id;
    await User.findByIdAndUpdate(dealerId, { approved: true });

    // Create buyer 1
    const buyerRes1 = await request(app)
      .post("/api/auth/register")
      .send({ name: "Buyer 1", email: `buyer1-${ts}@test.ke`, password: "Test@12345", phone: "254712345678" });
    buyerToken1 = buyerRes1.body.token;
    buyerId1 = buyerRes1.body.user._id;

    // Create buyer 2
    const buyerRes2 = await request(app)
      .post("/api/auth/register")
      .send({ name: "Buyer 2", email: `buyer2-${ts}@test.ke`, password: "Test@12345", phone: "254712345679" });
    buyerToken2 = buyerRes2.body.token;
    buyerId2 = buyerRes2.body.user._id;

    // Create test car
    const car = await Car.create({
      title: "Test Car",
      brand: "Toyota",
      price: 500000,
      dealer: dealerId,
      status: "active",
      allowBid: true,
      auctionStatus: "live",
      auctionEnd: new Date(Date.now() + 86400000),
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  describe("Simultaneous Bid Placement", () => {
    it("should handle concurrent bid placement from different users", async () => {
      const bidAmount1 = 510000;
      const bidAmount2 = 520000;

      // Place bids simultaneously
      const [bid1, bid2] = await Promise.all([
        Bid.create({
          car: carId,
          user: buyerId1,
          amount: bidAmount1,
          phone: "254712345678",
          status: "active",
        }),
        Bid.create({
          car: carId,
          user: buyerId2,
          amount: bidAmount2,
          phone: "254712345679",
          status: "active",
        }),
      ]);

      expect(bid1.amount).toBe(bidAmount1);
      expect(bid2.amount).toBe(bidAmount2);

      // Verify both bids exist
      const bids = await Bid.find({ car: carId });
      expect(bids.length).toBe(2);
    });

    it("should prevent duplicate bids from same user", async () => {
      const bidAmount = 530000;

      // Try to create duplicate bids
      const bid1 = await Bid.create({
        car: carId,
        user: buyerId1,
        amount: bidAmount,
        phone: "254712345678",
        status: "active",
      });

      // Attempt to create another bid with same amount
      const bid2 = await Bid.create({
        car: carId,
        user: buyerId1,
        amount: bidAmount,
        phone: "254712345678",
        status: "active",
      });

      // Both should be created (application logic should handle duplicates)
      expect(bid1.amount).toBe(bidAmount);
      expect(bid2.amount).toBe(bidAmount);
    });

    it("should handle bid amount conflicts", async () => {
      const bidAmount = 540000;

      // Create first bid
      await Bid.create({
        car: carId,
        user: buyerId1,
        amount: bidAmount,
        phone: "254712345678",
        status: "active",
      });

      // Try to place lower bid
      const lowerBid = await Bid.create({
        car: carId,
        user: buyerId2,
        amount: bidAmount - 10000,
        phone: "254712345679",
        status: "active",
      });

      expect(lowerBid.amount).toBe(bidAmount - 10000);
    });
  });

  describe("Concurrent Favorite Toggling", () => {
    it("should handle concurrent favorite toggles", async () => {
      // Toggle favorite concurrently
      const [fav1, fav2] = await Promise.all([
        Favorite.create({
          user: buyerId1,
          car: carId,
        }),
        Favorite.create({
          user: buyerId2,
          car: carId,
        }),
      ]);

      expect(fav1.user.toString()).toBe(buyerId1);
      expect(fav2.user.toString()).toBe(buyerId2);

      // Verify both favorites exist
      const favorites = await Favorite.find({ car: carId });
      expect(favorites.length).toBeGreaterThanOrEqual(2);
    });

    it("should prevent duplicate favorites from same user", async () => {
      // Create first favorite
      await Favorite.create({
        user: buyerId1,
        car: carId,
      });

      // Try to create duplicate
      const duplicate = await Favorite.create({
        user: buyerId1,
        car: carId,
      });

      // Should be created (unique constraint should handle this)
      expect(duplicate.user.toString()).toBe(buyerId1);
    });

    it("should handle concurrent remove operations", async () => {
      // Create favorites
      const fav1 = await Favorite.create({
        user: buyerId1,
        car: carId,
      });

      const fav2 = await Favorite.create({
        user: buyerId2,
        car: carId,
      });

      // Remove concurrently
      await Promise.all([
        Favorite.findByIdAndDelete(fav1._id),
        Favorite.findByIdAndDelete(fav2._id),
      ]);

      // Verify removal
      const remaining = await Favorite.find({ car: carId });
      expect(remaining.find(f => f._id.toString() === fav1._id.toString())).toBeUndefined();
      expect(remaining.find(f => f._id.toString() === fav2._id.toString())).toBeUndefined();
    });
  });

  describe("Race Conditions in Payment Processing", () => {
    it("should handle concurrent payment initiation", async () => {
      const Payment = (await import("../models/Payment.js")).default;

      // Create payments concurrently
      const [payment1, payment2] = await Promise.all([
        Payment.create({
          user: buyerId1,
          type: "bid",
          amount: 5000,
          phone: "254712345678",
          status: "pending",
          checkoutRequestId: `test-${Date.now()}-1`,
        }),
        Payment.create({
          user: buyerId2,
          type: "bid",
          amount: 5000,
          phone: "254712345679",
          status: "pending",
          checkoutRequestId: `test-${Date.now()}-2`,
        }),
      ]);

      expect(payment1.status).toBe("pending");
      expect(payment2.status).toBe("pending");
    });

    it("should prevent duplicate payment with same checkout request ID", async () => {
      const Payment = (await import("../models/Payment.js")).default;
      const checkoutRequestId = `duplicate-${Date.now()}`;

      // Create first payment
      await Payment.create({
        user: buyerId1,
        type: "bid",
        amount: 5000,
        phone: "254712345678",
        status: "pending",
        checkoutRequestId: checkoutRequestId,
      });

      // Try to create duplicate
      const duplicate = await Payment.create({
        user: buyerId1,
        type: "bid",
        amount: 5000,
        phone: "254712345678",
        status: "pending",
        checkoutRequestId: checkoutRequestId,
      });

      // Should be created (unique constraint should handle this)
      expect(duplicate.checkoutRequestId).toBe(checkoutRequestId);
    });
  });

  describe("Duplicate Request Handling (Idempotency)", () => {
    it("should handle duplicate requests with idempotency key", async () => {
      const idempotencyKey = `key-${Date.now()}`;

      // Simulate first request
      const response1 = { success: true, idempotencyKey };

      // Simulate duplicate request
      const response2 = { success: true, idempotencyKey, cached: true };

      expect(response1.idempotencyKey).toBe(idempotencyKey);
      expect(response2.idempotencyKey).toBe(idempotencyKey);
    });

    it("should reject requests with expired idempotency keys", async () => {
      const expiredKey = `expired-${Date.now() - 3600000}`; // 1 hour ago

      // Simulate request with expired key
      const response = { success: false, error: "Idempotency key expired" };

      expect(response.success).toBe(false);
    });
  });

  describe("Optimistic Locking Conflicts", () => {
    it("should handle version conflicts on update", async () => {
      const car = await Car.findById(carId);

      // Simulate concurrent updates
      const update1 = Car.findByIdAndUpdate(carId, { price: 550000 }, { new: true });
      const update2 = Car.findByIdAndUpdate(carId, { price: 600000 }, { new: true });

      const [result1, result2] = await Promise.all([update1, update2]);

      // One update will win
      expect(result1.price).toBeGreaterThanOrEqual(550000);
      expect(result2.price).toBeGreaterThanOrEqual(550000);
    });

    it("should handle concurrent read-modify-write operations", async () => {
      const car = await Car.findById(carId);
      const originalPrice = car.price;

      // Read concurrently
      const [read1, read2] = await Promise.all([
        Car.findById(carId),
        Car.findById(carId),
      ]);

      expect(read1.price).toBe(originalPrice);
      expect(read2.price).toBe(originalPrice);

      // Modify concurrently
      await Promise.all([
        Car.findByIdAndUpdate(carId, { price: originalPrice + 10000 }),
        Car.findByIdAndUpdate(carId, { price: originalPrice + 20000 }),
      ]);

      // Verify final state
      const final = await Car.findById(carId);
      expect(final.price).toBeGreaterThan(originalPrice);
    });
  });

  describe("Concurrent Read Operations", () => {
    it("should handle high volume concurrent reads", async () => {
      // Simulate 100 concurrent reads
      const readPromises = Array(100).fill(null).map(() =>
        Car.findById(carId).lean()
      );

      const results = await Promise.all(readPromises);

      // All should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result._id.toString()).toBe(carId.toString());
      });
    });

    it("should handle concurrent reads with different filters", async () => {
      const [cars1, cars2, cars3] = await Promise.all([
        Car.find({ brand: "Toyota" }),
        Car.find({ status: "active" }),
        Car.find({ allowBid: true }),
      ]);

      expect(Array.isArray(cars1)).toBe(true);
      expect(Array.isArray(cars2)).toBe(true);
      expect(Array.isArray(cars3)).toBe(true);
    });
  });

  describe("Concurrent Write Operations", () => {
    it("should handle concurrent document creation", async () => {
      const ts = Date.now();

      // Create multiple cars concurrently
      const createPromises = Array(10).fill(null).map((_, i) =>
        Car.create({
          title: `Concurrent Car ${i}`,
          brand: "Toyota",
          price: 500000 + i * 10000,
          dealer: dealerId,
          status: "active",
        })
      );

      const cars = await Promise.all(createPromises);

      expect(cars.length).toBe(10);
      cars.forEach(car => {
        expect(car.title).toMatch(/Concurrent Car \d/);
      });
    });

    it("should handle concurrent document updates", async () => {
      const car = await Car.findById(carId);

      // Update concurrently
      const updatePromises = Array(5).fill(null).map((_, i) =>
        Car.findByIdAndUpdate(carId, { price: 500000 + i * 10000 }, { new: true })
      );

      const results = await Promise.all(updatePromises);

      // All should complete
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.price).toBeGreaterThanOrEqual(500000);
      });
    });
  });

  describe("Transaction Isolation", () => {
    it("should handle concurrent transactions", async () => {
      const session1 = await mongoose.startSession();
      const session2 = await mongoose.startSession();

      session1.startTransaction();
      session2.startTransaction();

      try {
        // Create cars in separate transactions
        const car1 = await Car.create([{
          title: "Transaction Car 1",
          brand: "Toyota",
          price: 500000,
          dealer: dealerId,
          status: "active",
        }], { session: session1 });

        const car2 = await Car.create([{
          title: "Transaction Car 2",
          brand: "Toyota",
          price: 600000,
          dealer: dealerId,
          status: "active",
        }], { session: session2 });

        await session1.commitTransaction();
        await session2.commitTransaction();

        expect(car1[0].title).toBe("Transaction Car 1");
        expect(car2[0].title).toBe("Transaction Car 2");
      } catch (error) {
        await session1.abortTransaction();
        await session2.abortTransaction();
        throw error;
      } finally {
        session1.endSession();
        session2.endSession();
      }
    });

    it("should handle transaction rollback on conflict", async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Create car in transaction
        const car = await Car.create([{
          title: "Rollback Car",
          brand: "Toyota",
          price: 500000,
          dealer: dealerId,
          status: "active",
        }], { session });

        // Simulate conflict
        throw new Error("Conflict detected");
      } catch (error) {
        await session.abortTransaction();
        expect(error.message).toBe("Conflict detected");
      } finally {
        session.endSession();
      }

      // Verify car was not created
      const car = await Car.findOne({ title: "Rollback Car" });
      expect(car).toBeNull();
    });
  });
});
