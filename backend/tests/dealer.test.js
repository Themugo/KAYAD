// backend/tests/dealer.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");
import User from "../models/User.js";
import Car from "../models/Car.js";

describe("Dealer Routes", () => {
  let dealerToken, userToken, dealerId;

  beforeAll(async () => {
    const ts = Date.now();

    const dealerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Dealer", email: `dealer-${ts}@test.ke`, password: "Test@12345", role: "dealer" });
    dealerToken = dealerRes.body.token;
    dealerId = dealerRes.body.user._id;

    await User.findByIdAndUpdate(dealerId, { approved: true });

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Regular User", email: `user-${ts}@test.ke`, password: "Test@12345" });
    userToken = userRes.body.token;

    await Car.create({
      title: "Dealer Car",
      brand: "Nissan",
      price: 800000,
      dealer: new mongoose.Types.ObjectId(dealerId),
      status: "active",
    });
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("GET /api/dealer/quick-stats — requires auth", async () => {
    await request(app).get("/api/dealer/quick-stats").expect(401);
  });

  it("GET /api/dealer/quick-stats — requires dealer role", async () => {
    await request(app).get("/api/dealer/quick-stats").set("Authorization", `Bearer ${userToken}`).expect(403);
  });

  it("GET /api/dealer/quick-stats — returns stats for dealer", async () => {
    const res = await request(app)
      .get("/api/dealer/quick-stats")
      .set("Authorization", `Bearer ${dealerToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/dealer/summary — returns dealer summary", async () => {
    const res = await request(app).get("/api/dealer/summary").set("Authorization", `Bearer ${dealerToken}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/dealer/cars — returns dealer's cars", async () => {
    const res = await request(app).get("/api/dealer/cars").set("Authorization", `Bearer ${dealerToken}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.cars ?? res.body.data ?? [])).toBe(true);
  });

  it("GET /api/dealer/bids — returns dealer bids", async () => {
    const res = await request(app).get("/api/dealer/bids").set("Authorization", `Bearer ${dealerToken}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/dealer/earnings — returns dealer earnings", async () => {
    const res = await request(app)
      .get("/api/dealer/earnings")
      .set("Authorization", `Bearer ${dealerToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/dealer/analytics — returns dealer analytics", async () => {
    const res = await request(app)
      .get("/api/dealer/analytics")
      .set("Authorization", `Bearer ${dealerToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/dealer/team — requires auth", async () => {
    await request(app).get("/api/dealer/team").expect(401);
  });

  it("GET /api/dealer/team — returns team list", async () => {
    const res = await request(app).get("/api/dealer/team").set("Authorization", `Bearer ${dealerToken}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/dealer/settlement — returns settlement config", async () => {
    const res = await request(app)
      .get("/api/dealer/settlement")
      .set("Authorization", `Bearer ${dealerToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});
