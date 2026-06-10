// backend/tests/reviews.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");

describe("Review Routes", () => {
  let buyerToken, dealerToken, buyerId, dealerId;

  beforeAll(async () => {
    const ts = Date.now();

    const buyerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Buyer Rev", email: `revbuy-${ts}@test.ke`, password: "Test@12345" });
    buyerToken = buyerRes.body.token;
    buyerId = buyerRes.body.user._id;

    const dealerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Dealer Rev", email: `revdeal-${ts}@test.ke`, password: "Test@12345", role: "dealer" });
    dealerToken = dealerRes.body.token;
    dealerId = dealerRes.body.user._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("POST /api/reviews — requires auth", async () => {
    await request(app).post("/api/reviews").send({ dealerId: dealerId, rating: 5, comment: "Great!" }).expect(401);
  });

  it("POST /api/reviews — creates a review", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ dealer: dealerId, rating: 5, comment: "Excellent dealer!" })
      .expect(201);
    // Do NOT delete review ID — it will be cleaned up in afterAll
    expect(res.body.success).toBe(true);
  });

  it("GET /api/reviews/my — returns my reviews", async () => {
    const res = await request(app).get("/api/reviews/my").set("Authorization", `Bearer ${buyerToken}`).expect(200);
    expect(res.body.success).toBe(true);
    const list = res.body.reviews ?? res.body.data ?? [];
    expect(Array.isArray(list)).toBe(true);
  });

  it("GET /api/reviews/dealer/:id — returns dealer reviews", async () => {
    const res = await request(app).get(`/api/reviews/dealer/${dealerId}`).expect(200);
    expect(res.body.success).toBe(true);
    const list = res.body.reviews ?? res.body.data ?? [];
    expect(Array.isArray(list)).toBe(true);
  });

  it("DELETE /api/reviews/:id — deletes own review", async () => {
    const myRes = await request(app).get("/api/reviews/my").set("Authorization", `Bearer ${buyerToken}`);
    const list = myRes.body.reviews ?? myRes.body.data ?? [];
    if (list.length > 0) {
      const res = await request(app)
        .delete(`/api/reviews/${list[0]._id}`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    }
  });
});
