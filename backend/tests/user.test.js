import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");

describe("User Routes", () => {
  let userToken, userId;

  beforeAll(async () => {
    const ts = Date.now();

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test User", email: `usr-${ts}@test.ke`, password: "Test@12345" });
    userToken = res.body.token;
    userId = res.body.user._id;

    // Create some extra users for search tests
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Alpha Dealer", email: `alpha-${ts}@test.ke`, password: "Test@12345", role: "dealer" });

    await request(app)
      .post("/api/auth/register")
      .send({ name: "Beta Buyer", email: `beta-${ts}@test.ke`, password: "Test@12345" });
  });

  afterAll(async () => {
    await clearTestDB();
  });

  describe("GET /api/users/search", () => {
    it("searches users by name", async () => {
      const res = await request(app)
        .get("/api/users/search?q=Test")
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it("filters by role", async () => {
      const res = await request(app)
        .get("/api/users/search?role=dealer")
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users.every(u => u.role === "dealer")).toBe(true);
    });

    it("paginates results", async () => {
      const res = await request(app)
        .get("/api/users/search?limit=1")
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users.length).toBeLessThanOrEqual(1);
    });

    it("returns empty when no match", async () => {
      const res = await request(app)
        .get("/api/users/search?q=zzzzzzzzzz")
        .expect(200);
      expect(res.body.users.length).toBe(0);
      expect(res.body.total).toBe(0);
    });
  });

  describe("GET /api/users/me", () => {
    it("requires auth", async () => {
      await request(app).get("/api/users/me").expect(401);
    });

    it("returns current user profile", async () => {
      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toMatch("@test.ke");
      expect(res.body.user.password).toBeUndefined();
    });
  });

  describe("PUT /api/users/settings", () => {
    it("requires auth", async () => {
      await request(app).put("/api/users/settings").send({ language: "fr" }).expect(401);
    });

    it("updates allowed settings", async () => {
      const res = await request(app)
        .put("/api/users/settings")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ language: "fr", currency: "EUR", timezone: "Europe/Paris" })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.language).toBe("fr");
    });

    it("rejects invalid setting keys", async () => {
      const res = await request(app)
        .put("/api/users/settings")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ invalidKey: "value" })
        .expect(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/users/:id", () => {
    it("returns public user profile", async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe("Test User");
    });

    it("returns 404 for non-existent id", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/users/${fakeId}`)
        .expect(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/users/bank-pre-approval", () => {
    it("requires auth", async () => {
      await request(app).post("/api/users/bank-pre-approval").send({
        documentUrl: "http://example.com/approval.pdf",
        bankName: "KCB",
        approvedAmount: 5000000,
      }).expect(401);
    });

    it("rejects missing fields", async () => {
      const res = await request(app)
        .post("/api/users/bank-pre-approval")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ bankName: "KCB" })
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("submits bank pre-approval", async () => {
      const res = await request(app)
        .post("/api/users/bank-pre-approval")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          documentUrl: "http://example.com/approval.pdf",
          bankName: "KCB",
          approvedAmount: 5000000,
        })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.verifiedBuyer).toBe(true);
      expect(res.body.user.bankPreApproval.bankName).toBe("KCB");
    });
  });

  describe("DELETE /api/users/bank-pre-approval", () => {
    it("requires auth", async () => {
      await request(app).delete("/api/users/bank-pre-approval").expect(401);
    });

    it("removes bank pre-approval", async () => {
      const res = await request(app)
        .delete("/api/users/bank-pre-approval")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.verifiedBuyer).toBe(false);
    });
  });

  describe("404 fallback", () => {
    it("returns 404 for unknown user routes", async () => {
      const res = await request(app)
        .get("/api/users/nonexistent-route")
        .expect(400);
      expect(res.body.success).toBe(false);
    });
  });
});
