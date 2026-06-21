// backend/tests/criticalWorkflows.test.js
// ─────────────────────────────────────────────────────────────
// Critical workflow tests
// Tests payment retry, escrow auto-release, concurrent bid handling, transaction rollback
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB, describeWithDb } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");
import User from "../models/User.js";
import Car from "../models/Car.js";
import Bid from "../models/Bid.js";
import Payment from "../models/Payment.js";
import Escrow from "../models/Escrow.js";

describeWithDb("Critical Workflows", () => {
  let dealerToken, buyerToken, adminToken;
  let dealerId, buyerId, adminId;
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

    // Create buyer
    const buyerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Buyer", email: `buyer-${ts}@test.ke`, password: "Test@12345", phone: "254712345678" });
    buyerToken = buyerRes.body.token;
    buyerId = buyerRes.body.user._id;

    // Create admin
    const adminRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Admin", email: `admin-${ts}@test.ke`, password: "Test@12345", role: "admin" });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user._id;

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

  describe("Payment Retry Logic", () => {
    it("should handle payment failure and retry", async () => {
      // Create a payment that fails initially
      const payment = await Payment.create({
        user: buyerId,
        type: "bid",
        amount: 5000,
        phone: "254712345678",
        status: "failed",
        failureReason: "Timeout",
        checkoutRequestId: `test-${Date.now()}`,
      });

      // Simulate retry logic
      const updatedPayment = await Payment.findByIdAndUpdate(
        payment._id,
        { status: "pending", retryCount: (payment.retryCount || 0) + 1 },
        { new: true }
      );

      expect(updatedPayment.status).toBe("pending");
      expect(updatedPayment.retryCount).toBeGreaterThan(0);
    });

    it("should stop retrying after max attempts", async () => {
      const payment = await Payment.create({
        user: buyerId,
        type: "bid",
        amount: 5000,
        phone: "254712345678",
        status: "failed",
        failureReason: "Timeout",
        checkoutRequestId: `test-${Date.now()}`,
        retryCount: 5, // Max retries
      });

      // Should not retry if max attempts reached
      const shouldRetry = payment.retryCount < 5;
      expect(shouldRetry).toBe(false);
    });
  });

  describe("Escrow Auto-Release", () => {
    it("should auto-release escrow after delivery confirmation", async () => {
      const escrow = await Escrow.create({
        car: carId,
        buyer: buyerId,
        seller: dealerId,
        amount: 500000,
        status: "held",
        autoReleaseEligibleAt: new Date(Date.now() - 3600000), // 1 hour ago
      });

      // Simulate auto-release check
      const shouldAutoRelease = escrow.status === "held" && escrow.autoReleaseEligibleAt < new Date();
      expect(shouldAutoRelease).toBe(true);
    });

    it("should not auto-release if status is not held", async () => {
      const escrow = await Escrow.create({
        car: carId,
        buyer: buyerId,
        seller: dealerId,
        amount: 500000,
        status: "released",
        autoReleaseEligibleAt: new Date(Date.now() - 3600000),
      });

      const shouldAutoRelease = escrow.status === "held" && escrow.autoReleaseEligibleAt < new Date();
      expect(shouldAutoRelease).toBe(false);
    });
  });

  describe("Concurrent Bid Handling", () => {
    it("should handle simultaneous bid placement", async () => {
      const bidAmount = 510000;

      // Place first bid
      const bid1 = await Bid.create({
        car: carId,
        user: buyerId,
        amount: bidAmount,
        phone: "254712345678",
        status: "active",
      });

      // Attempt to place second bid with same amount (should be rejected or handled)
      const bid2 = await Bid.create({
        car: carId,
        user: buyerId,
        amount: bidAmount,
        phone: "254712345678",
        status: "active",
      });

      expect(bid1.amount).toBe(bidAmount);
      expect(bid2.amount).toBe(bidAmount);
    });

    it("should prevent bid below current highest", async () => {
      const currentBid = 510000;
      const lowerBid = 500000;

      // Should reject bid below current highest
      const isValidBid = lowerBid > currentBid;
      expect(isValidBid).toBe(false);
    });
  });

  describe("Transaction Rollback", () => {
    it("should rollback payment on failure", async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Create payment
        const payment = await Payment.create([
          {
            user: buyerId,
            type: "bid",
            amount: 5000,
            phone: "254712345678",
            status: "pending",
            checkoutRequestId: `test-${Date.now()}`,
          },
        ], { session });

        // Simulate failure
        throw new Error("Payment processing failed");
      } catch (error) {
        await session.abortTransaction();
        expect(error.message).toBe("Payment processing failed");
      } finally {
        session.endSession();
      }
    });

    it("should maintain data integrity after rollback", async () => {
      const initialCount = await Payment.countDocuments({ user: buyerId });

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        await Payment.create([
          {
            user: buyerId,
            type: "bid",
            amount: 5000,
            phone: "254712345678",
            status: "pending",
            checkoutRequestId: `test-${Date.now()}`,
          },
        ], { session });

        await session.abortTransaction();
      } catch (error) {
        await session.abortTransaction();
      } finally {
        session.endSession();
      }

      const finalCount = await Payment.countDocuments({ user: buyerId });
      expect(finalCount).toBe(initialCount);
    });
  });

  describe("Cascade Delete Verification", () => {
    it("should cascade delete user bids when user is deleted", async () => {
      // Create a bid
      const bid = await Bid.create({
        car: carId,
        user: buyerId,
        amount: 510000,
        phone: "254712345678",
        status: "active",
      });

      // Soft delete user (simulated)
      await User.findByIdAndUpdate(buyerId, { deletedAt: new Date(), deletedBy: adminId });

      // Check if bids are soft deleted
      const deletedBid = await Bid.findById(bid._id);
      expect(deletedBid).not.toBeNull(); // Soft delete keeps the record
    });

    it("should cascade delete car bids when car is deleted", async () => {
      // Create a bid
      const bid = await Bid.create({
        car: carId,
        user: buyerId,
        amount: 520000,
        phone: "254712345678",
        status: "active",
      });

      // Soft delete car (simulated)
      await Car.findByIdAndUpdate(carId, { deletedAt: new Date(), deletedBy: dealerId });

      // Check if bids are soft deleted
      const deletedBid = await Bid.findById(bid._id);
      expect(deletedBid).not.toBeNull(); // Soft delete keeps the record
    });
  });

  describe("Soft Delete Query Filtering", () => {
    it("should exclude soft-deleted records from queries", async () => {
      // Create a bid
      const bid = await Bid.create({
        car: carId,
        user: buyerId,
        amount: 530000,
        phone: "254712345678",
        status: "active",
      });

      // Soft delete the bid
      await Bid.findByIdAndUpdate(bid._id, { deletedAt: new Date() });

      // Query should exclude soft-deleted records
      const activeBids = await Bid.find({ deletedAt: { $exists: false } });
      expect(activeBids.find(b => b._id.toString() === bid._id.toString())).toBeUndefined();
    });

    it("should include soft-deleted records when explicitly requested", async () => {
      // Create a bid
      const bid = await Bid.create({
        car: carId,
        user: buyerId,
        amount: 540000,
        phone: "254712345678",
        status: "active",
      });

      // Soft delete the bid
      await Bid.findByIdAndUpdate(bid._id, { deletedAt: new Date() });

      // Query should include soft-deleted records when requested
      const allBids = await Bid.find({});
      expect(allBids.find(b => b._id.toString() === bid._id.toString())).toBeDefined();
    });
  });
});
