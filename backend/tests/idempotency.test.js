// backend/tests/idempotency.test.js - Idempotency Tests
// ─────────────────────────────────────────────────────────────
// Unit and integration tests for idempotency implementation
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "@jest/globals";
import app from "../app.js";
import IdempotencyKey from "../models/IdempotencyKey.js";
import Payment from "../models/Payment.js";
import Escrow from "../models/Escrow.js";
import Bid from "../models/Bid.js";
import User from "../models/User.js";
import DealerVerification from "../models/DealerVerification.js";

// Test database connection
const TEST_DB_URI = process.env.TEST_DB_URI || "mongodb://localhost:27017/kayad_test";

describe("Idempotency Implementation Tests", () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(TEST_DB_URI);

    // Create test user
    testUser = await User.create({
      name: "Test User",
      email: "test@example.com",
      phone: "+254700000000",
      password: "password123",
    });

    // Generate auth token (simplified for testing)
    authToken = "Bearer test_token_" + testUser._id;
  });

  afterAll(async () => {
    // Clean up database
    await User.deleteMany({});
    await Payment.deleteMany({});
    await Escrow.deleteMany({});
    await Bid.deleteMany({});
    await DealerVerification.deleteMany({});
    await IdempotencyKey.deleteMany({});

    // Close database connection
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up idempotency keys before each test
    await IdempotencyKey.deleteMany({});
  });

  afterEach(async () => {
    // Clean up idempotency keys after each test
    await IdempotencyKey.deleteMany({});
  });

  // =============================
  // IdempotencyKey Model Tests
  // =============================
  describe("IdempotencyKey Model", () => {
    it("should create a new idempotency key", async () => {
      const idempotencyKey = await IdempotencyKey.create({
        key: "test_key_123",
        operationType: "payment",
        user: testUser._id,
        requestParams: { amount: 1000 },
        responseData: { success: true },
        responseStatus: 200,
        success: true,
        resourceIds: { paymentId: "payment123" },
      });

      expect(idempotencyKey).toBeDefined();
      expect(idempotencyKey.key).toBe("test_key_123");
      expect(idempotencyKey.operationType).toBe("payment");
      expect(idempotencyKey.success).toBe(true);
    });

    it("should retrieve cached response", async () => {
      await IdempotencyKey.create({
        key: "test_key_456",
        operationType: "payment",
        user: testUser._id,
        responseData: { success: true, message: "Payment processed" },
        responseStatus: 200,
        success: true,
      });

      const cached = await IdempotencyKey.getCachedResponse("test_key_456");

      expect(cached).toBeDefined();
      expect(cached.responseData).toEqual({ success: true, message: "Payment processed" });
      expect(cached.responseStatus).toBe(200);
      expect(cached.success).toBe(true);
    });

    it("should return null for non-existent key", async () => {
      const cached = await IdempotencyKey.getCachedResponse("non_existent_key");
      expect(cached).toBeNull();
    });

    it("should return null for expired key", async () => {
      await IdempotencyKey.create({
        key: "expired_key",
        operationType: "payment",
        user: testUser._id,
        responseData: { success: true },
        responseStatus: 200,
        success: true,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const cached = await IdempotencyKey.getCachedResponse("expired_key");
      expect(cached).toBeNull();
    });

    it("should check if key exists", async () => {
      await IdempotencyKey.create({
        key: "existing_key",
        operationType: "payment",
        user: testUser._id,
      });

      const exists = await IdempotencyKey.exists("existing_key");
      expect(exists).toBe(true);

      const notExists = await IdempotencyKey.exists("non_existing_key");
      expect(notExists).toBe(false);
    });

    it("should record idempotency key", async () => {
      const recorded = await IdempotencyKey.record({
        key: "record_key",
        operationType: "payment",
        user: testUser._id,
        requestParams: { amount: 1000 },
        responseData: { success: true },
        responseStatus: 200,
        success: true,
      });

      expect(recorded).toBeDefined();
      expect(recorded.key).toBe("record_key");
      expect(recorded.operationType).toBe("payment");
    });

    it("should clean expired keys", async () => {
      await IdempotencyKey.create({
        key: "expired_1",
        operationType: "payment",
        user: testUser._id,
        expiresAt: new Date(Date.now() - 1000),
      });

      await IdempotencyKey.create({
        key: "valid_key",
        operationType: "payment",
        user: testUser._id,
        expiresAt: new Date(Date.now() + 86400000),
      });

      const deletedCount = await IdempotencyKey.cleanExpired();
      expect(deletedCount).toBe(1);

      const remaining = await IdempotencyKey.countDocuments();
      expect(remaining).toBe(1);
    });
  });

  // =============================
  // Payment Idempotency Tests
  // =============================
  describe("Payment Idempotency", () => {
    it("should prevent duplicate payment initiation", async () => {
      const idempotencyKey = "payment_test_123";
      const paymentData = {
        phone: "+254700000000",
        amount: 1000,
        carId: "car123",
        type: "escrow",
      };

      // First request
      const response1 = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send(paymentData);

      expect(response1.status).toBe(200);

      // Second request with same key
      const response2 = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send(paymentData);

      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });

    it("should allow different idempotency keys", async () => {
      const paymentData = {
        phone: "+254700000000",
        amount: 1000,
        carId: "car123",
        type: "escrow",
      };

      const response1 = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", "payment_key_1")
        .send(paymentData);

      const response2 = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", "payment_key_2")
        .send(paymentData);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response2.body).not.toEqual(response1.body);
    });
  });

  // =============================
  // Escrow Idempotency Tests
  // =============================
  describe("Escrow Idempotency", () => {
    let testEscrow;

    beforeEach(async () => {
      testEscrow = await Escrow.create({
        buyer: testUser._id,
        seller: new mongoose.Types.ObjectId(),
        carId: new mongoose.Types.ObjectId(),
        amount: 100000,
        status: "held",
      });
    });

    it("should prevent duplicate escrow release", async () => {
      const idempotencyKey = "escrow_release_123";

      // First request
      const response1 = await request(app)
        .post(`/api/escrow/${testEscrow._id}/release`)
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send({ adminId: testUser._id });

      expect(response1.status).toBe(200);

      // Second request with same key
      const response2 = await request(app)
        .post(`/api/escrow/${testEscrow._id}/release`)
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send({ adminId: testUser._id });

      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });

    it("should prevent duplicate escrow refund", async () => {
      const idempotencyKey = "escrow_refund_123";

      const response1 = await request(app)
        .post(`/api/escrow/${testEscrow._id}/refund`)
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send({ adminId: testUser._id });

      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .post(`/api/escrow/${testEscrow._id}/refund`)
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send({ adminId: testUser._id });

      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });
  });

  // =============================
  // Bid Idempotency Tests
  // =============================
  describe("Bid Idempotency", () => {
    let testCarId;

    beforeEach(async () => {
      testCarId = new mongoose.Types.ObjectId();
    });

    it("should prevent duplicate bid placement", async () => {
      const idempotencyKey = "bid_test_123";
      const bidData = {
        amount: 50000,
        phone: "+254700000000",
        maxBid: 100000,
      };

      const response1 = await request(app)
        .post(`/api/bids/${testCarId}/bid`)
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send(bidData);

      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .post(`/api/bids/${testCarId}/bid`)
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send(bidData);

      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });
  });

  // =============================
  // Verification Idempotency Tests
  // =============================
  describe("Verification Idempotency", () => {
    let testVerification;

    beforeEach(async () => {
      testVerification = await DealerVerification.create({
        user: testUser._id,
        dealer: new mongoose.Types.ObjectId(),
        verificationStatus: "pending",
      });
    });

    it("should prevent duplicate verification approval", async () => {
      const idempotencyKey = "verification_approve_123";

      const response1 = await request(app)
        .post(`/api/verification/admin/${testVerification._id}/approve`)
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send({ adminNotes: "Approved" });

      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .post(`/api/verification/admin/${testVerification._id}/approve`)
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send({ adminNotes: "Approved" });

      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });

    it("should prevent duplicate verification rejection", async () => {
      const idempotencyKey = "verification_reject_123";

      const response1 = await request(app)
        .post(`/api/verification/admin/${testVerification._id}/reject`)
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send({ rejectionReason: "Invalid documents" });

      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .post(`/api/verification/admin/${testVerification._id}/reject`)
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", idempotencyKey)
        .send({ rejectionReason: "Invalid documents" });

      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });
  });

  // =============================
  // Middleware Tests
  // =============================
  describe("Idempotency Middleware", () => {
    it("should allow requests without idempotency key", async () => {
      const paymentData = {
        phone: "+254700000000",
        amount: 1000,
        carId: "car123",
        type: "escrow",
      };

      const response = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", authToken)
        .send(paymentData);

      expect(response.status).toBe(200);
    });

    it("should handle database errors gracefully", async () => {
      // Simulate database error by closing connection
      await mongoose.connection.close();

      const response = await request(app)
        .post("/api/payments/initiate")
        .set("Authorization", authToken)
        .set("X-Idempotency-Key", "error_test")
        .send({
          phone: "+254700000000",
          amount: 1000,
          carId: "car123",
          type: "escrow",
        });

      // Should fail open and allow request
      expect(response.status).not.toBe(500);

      // Reconnect for other tests
      await mongoose.connect(TEST_DB_URI);
    });
  });

  // =============================
  // Performance Tests
  // =============================
  describe("Idempotency Performance", () => {
    it("should handle high volume of idempotency checks", async () => {
      const keys = [];
      for (let i = 0; i < 100; i++) {
        keys.push(`perf_test_${i}`);
      }

      const startTime = Date.now();

      await Promise.all(
        keys.map((key) =>
          IdempotencyKey.create({
            key,
            operationType: "payment",
            user: testUser._id,
            responseData: { success: true },
            responseStatus: 200,
            success: true,
          }),
        ),
      );

      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(5000); // Should complete in under 5 seconds

      const retrievalStart = Date.now();
      await Promise.all(keys.map((key) => IdempotencyKey.getCachedResponse(key)));
      const retrievalTime = Date.now() - retrievalStart;
      expect(retrievalTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});
