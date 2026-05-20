// backend/tests/bid.test.js
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
import Bid from "../models/Bid.js";

describe("Bidding System", () => {
  let dealerToken, buyerToken, adminToken, carId;
  let buyerId, dealerId, adminId;

  beforeAll(async () => {
    const ts = Date.now();

    const dealerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Dealer", email: `dealer-bid-${ts}@test.ke`, password: "pass12345", role: "dealer" });
    dealerToken = dealerRes.body.token;
    dealerId = dealerRes.body.user._id;

    await User.findByIdAndUpdate(dealerId, { approved: true });

    const buyerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Buyer", email: `buyer-bid-${ts}@test.ke`, password: "pass12345" });
    buyerToken = buyerRes.body.token;
    buyerId = buyerRes.body.user._id;

    const adminRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Admin", email: `admin-bid-${ts}@test.ke`, password: "pass12345", role: "admin" });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user._id;

    const car = await Car.create({
      title: "Test Auction Car",
      brand: "Toyota",
      price: 500000,
      allowBid: true,
      auctionStatus: "live",
      auctionEnd: new Date(Date.now() + 86400000),
      dealer: new mongoose.Types.ObjectId(dealerId),
      status: "active",
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("GET /api/bids/:id/bids — returns empty list for car with no bids", async () => {
    const res = await request(app)
      .get(`/api/bids/${carId}/bids`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.bids)).toBe(true);
  });

  it("POST /api/bids/:id/bid — requires auth", async () => {
    await request(app)
      .post(`/api/bids/${carId}/bid`)
      .send({ amount: 510000, phone: "254712345678" })
      .expect(401);
  });

  it("POST /api/bids/:id/bid — rejects zero amount", async () => {
    const res = await request(app)
      .post(`/api/bids/${carId}/bid`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ amount: 0, phone: "254712345678" })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/bids/:id/bid — rejects negative amount", async () => {
    const res = await request(app)
      .post(`/api/bids/${carId}/bid`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ amount: -100, phone: "254712345678" })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/bids/:id/bid — accepts valid bid (mock mode)", async () => {
    const res = await request(app)
      .post(`/api/bids/${carId}/bid`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ amount: 510000, phone: "254712345678" })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/bids/:id/bid — rejects non-existent car", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/bids/${fakeId}/bid`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ amount: 50000, phone: "254712345678" })
      .expect(404);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/bids/:id/bids — returns bid after placement", async () => {
    const res = await request(app)
      .get(`/api/bids/${carId}/bids`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bids.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/bids/:id/end — requires admin", async () => {
    await request(app)
      .post(`/api/bids/${carId}/end`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .expect(403);
  });

  it("POST /api/bids/:id/end — admin can end auction", async () => {
    const res = await request(app)
      .post(`/api/bids/${carId}/end`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/bids/admin/all — requires admin", async () => {
    await request(app)
      .get("/api/bids/admin/all")
      .set("Authorization", `Bearer ${buyerToken}`)
      .expect(403);
  });

  it("GET /api/bids/admin/all — admin can list all bids", async () => {
    const res = await request(app)
      .get("/api/bids/admin/all")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.bids)).toBe(true);
  });

  it("GET /api/bids/admin/suspicious — admin can list suspicious bids", async () => {
    const res = await request(app)
      .get("/api/bids/admin/suspicious")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.bids)).toBe(true);
  });

  it("POST /api/bids/admin/:bidId/set-winner — rejects non-existent bid", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/bids/admin/${fakeId}/set-winner`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
    expect(res.body.success).toBe(false);
  });
});
