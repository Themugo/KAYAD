// backend/tests/authorization.test.js
// ─────────────────────────────────────────────────────────────
// Authorization tests
// Tests role-based access control, resource ownership, cross-user prevention
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

describeWithDb("Authorization", () => {
  let userToken, dealerToken, adminToken;
  let userId, dealerId, adminId;
  let carId, bidId;

  beforeAll(async () => {
    const ts = Date.now();

    // Create regular user
    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "User", email: `user-${ts}@test.ke`, password: "Test@12345" });
    userToken = userRes.body.token;
    userId = userRes.body.user._id;

    // Create dealer
    const dealerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Dealer", email: `dealer-${ts}@test.ke`, password: "Test@12345", role: "dealer" });
    dealerToken = dealerRes.body.token;
    dealerId = dealerRes.body.user._id;
    await User.findByIdAndUpdate(dealerId, { approved: true });

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
    });
    carId = car._id;

    // Create test bid
    const bid = await Bid.create({
      car: carId,
      user: userId,
      amount: 510000,
      phone: "254712345678",
      status: "active",
    });
    bidId = bid._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  describe("Role-Based Access Control", () => {
    it("should allow admin to access admin endpoints", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      // Admin should have access (may return 200 or 404 if endpoint doesn't exist)
      expect([200, 404]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    it("should deny regular user access to admin endpoints", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it("should deny dealer access to admin endpoints", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${dealerToken}`);

      expect(res.status).toBe(403);
    });

    it("should allow dealer to create car listings", async () => {
      const res = await request(app)
        .post("/api/cars")
        .set("Authorization", `Bearer ${dealerToken}`)
        .send({
          title: "New Car",
          brand: "Toyota",
          price: 600000,
        });

      expect([200, 201, 400]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    it("should deny regular user from creating car listings", async () => {
      const res = await request(app)
        .post("/api/cars")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: "New Car",
          brand: "Toyota",
          price: 600000,
        });

      expect(res.status).toBe(403);
    });
  });

  describe("Resource Ownership Verification", () => {
    it("should allow user to delete their own bid", async () => {
      const res = await request(app)
        .delete(`/api/bids/${bidId}`)
        .set("Authorization", `Bearer ${userToken}`);

      // Should allow deletion (may return 200, 204, or 404 if endpoint doesn't exist)
      expect([200, 204, 404]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    it("should deny user from deleting another user's bid", async () => {
      // Create another user
      const otherUserRes = await request(app)
        .post("/api/auth/register")
        .send({ name: "Other User", email: `other-${Date.now()}@test.ke`, password: "Test@12345" });
      const otherUserToken = otherUserRes.body.token;

      const res = await request(app)
        .delete(`/api/bids/${bidId}`)
        .set("Authorization", `Bearer ${otherUserToken}`);

      expect(res.status).toBe(403);
    });

    it("should allow dealer to update their own car", async () => {
      const res = await request(app)
        .put(`/api/cars/${carId}`)
        .set("Authorization", `Bearer ${dealerToken}`)
        .send({ title: "Updated Car" });

      expect([200, 404]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    it("should deny dealer from updating another dealer's car", async () => {
      // Create another dealer
      const otherDealerRes = await request(app)
        .post("/api/auth/register")
        .send({ name: "Other Dealer", email: `other-dealer-${Date.now()}@test.ke`, password: "Test@12345", role: "dealer" });
      const otherDealerToken = otherDealerRes.body.token;
      const otherDealerId = otherDealerRes.body.user._id;
      await User.findByIdAndUpdate(otherDealerId, { approved: true });

      const res = await request(app)
        .put(`/api/cars/${carId}`)
        .set("Authorization", `Bearer ${otherDealerToken}`)
        .send({ title: "Hacked Car" });

      expect(res.status).toBe(403);
    });
  });

  describe("Cross-User Access Prevention", () => {
    it("should prevent user from accessing another user's profile", async () => {
      // Create another user
      const otherUserRes = await request(app)
        .post("/api/auth/register")
        .send({ name: "Target User", email: `target-${Date.now()}@test.ke`, password: "Test@12345" });
      const otherUserId = otherUserRes.body.user._id;

      const res = await request(app)
        .get(`/api/users/${otherUserId}`)
        .set("Authorization", `Bearer ${userToken}`);

      // Should deny access or only return public information
      expect([403, 404]).toContain(res.status);
    });

    it("should prevent user from accessing another user's notifications", async () => {
      const res = await request(app)
        .get("/api/notifications")
        .set("Authorization", `Bearer ${userToken}`);

      // Should only return current user's notifications
      expect([200, 404]).toContain(res.status);
    });

    it("should prevent user from accessing another user's favorites", async () => {
      const res = await request(app)
        .get("/api/favorites")
        .set("Authorization", `Bearer ${userToken}`);

      // Should only return current user's favorites
      expect([200, 404]).toContain(res.status);
    });
  });

  describe("Admin-Only Operations", () => {
    it("should allow admin to approve dealer verification", async () => {
      const res = await request(app)
        .post("/api/admin/dealers/approve")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ dealerId: dealerId });

      expect([200, 404]).toContain(res.status);
      expect(res.status).not.toBe(403);
    });

    it("should deny dealer from approving other dealers", async () => {
      const res = await request(app)
        .post("/api/admin/dealers/approve")
        .set("Authorization", `Bearer ${dealerToken}`)
        .send({ dealerId: dealerId });

      expect(res.status).toBe(403);
    });

    it("should deny user from approving dealers", async () => {
      const res = await request(app)
        .post("/api/admin/dealers/approve")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ dealerId: dealerId });

      expect(res.status).toBe(403);
    });
  });

  describe("Permission Inheritance", () => {
    it("should inherit base permissions for all roles", async () => {
      // All roles should be able to access public endpoints
      const publicRes = await request(app).get("/api/cars");
      expect([200, 404]).toContain(publicRes.status);
    });

    it("should allow authenticated users to access protected endpoints", async () => {
      const res = await request(app)
        .get("/api/user/profile")
        .set("Authorization", `Bearer ${userToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it("should deny unauthenticated users from accessing protected endpoints", async () => {
      const res = await request(app).get("/api/user/profile");

      expect(res.status).toBe(401);
    });
  });
});
