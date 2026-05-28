import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");

describe("Auction Admin Routes", () => {
  let adminToken, userToken, adminId, carId, bidId;

  beforeAll(async () => {
    const ts = Date.now();

    const adminRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Auct Admin", email: `auctadmin-${ts}@test.ke`, password: "Test@12345", role: "admin" });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user._id;

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Auct User", email: `auctuser-${ts}@test.ke`, password: "Test@12345" });
    userToken = userRes.body.token;

    const User = mongoose.model("User");
    const dealer = await User.create({
      name: "Auct Dealer",
      email: `auctdeal-${ts}@test.ke`,
      password: "Test@12345",
      role: "dealer",
      commissionBalance: 0,
      listingsLocked: false,
    });

    const Car = mongoose.model("Car");
    const car = await Car.create({
      title: "Auction Car",
      brand: "Subaru",
      price: 1000000,
      dealer: dealer._id,
      status: "active",
      allowBid: true,
      auctionStatus: "pending",
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  describe("POST /api/auction-admin/:carId/start", () => {
    it("requires admin", async () => {
      await request(app)
        .post(`/api/auction-admin/${carId}/start`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ durationMs: 3600000 })
        .expect(403);
    });

    it("rejects missing duration", async () => {
      const res = await request(app)
        .post(`/api/auction-admin/${carId}/start`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("starts the auction", async () => {
      const res = await request(app)
        .post(`/api/auction-admin/${carId}/start`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ startingBid: 500000, durationMs: 3600000 })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.endTime).toBeDefined();
    });

    it("returns 404 for non-existent car", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/auction-admin/${fakeId}/start`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ durationMs: 3600000 })
        .expect(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auction-admin/:carId/extend", () => {
    it("requires admin", async () => {
      await request(app)
        .post(`/api/auction-admin/${carId}/extend`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ extraMs: 120000 })
        .expect(403);
    });

    it("requires extraMs", async () => {
      const res = await request(app)
        .post(`/api/auction-admin/${carId}/extend`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("extends auction end time", async () => {
      const Car = mongoose.model("Car");
      const before = (await Car.findById(carId)).auctionEnd;

      const res = await request(app)
        .post(`/api/auction-admin/${carId}/extend`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ extraMs: 300000 })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(new Date(res.body.newEndTime).getTime()).toBeGreaterThan(new Date(before).getTime());
    });
  });

  describe("GET /api/auction-admin/:carId/bids", () => {
    it("requires admin", async () => {
      await request(app)
        .get(`/api/auction-admin/${carId}/bids`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });

    it("returns bid history", async () => {
      const res = await request(app)
        .get(`/api/auction-admin/${carId}/bids`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.dbBids)).toBe(true);
    });
  });

  describe("POST /api/auction-admin/:carId/set-winner", () => {
    beforeAll(async () => {
      const Bid = mongoose.model("Bid");
      const bid = await Bid.create({
        carId,
        user: new mongoose.Types.ObjectId(adminId),
        amount: 750000,
        status: "paid",
      });
      bidId = bid._id;
    });

    it("requires admin", async () => {
      await request(app)
        .post(`/api/auction-admin/${carId}/set-winner`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ bidId })
        .expect(403);
    });

    it("requires bidId", async () => {
      const res = await request(app)
        .post(`/api/auction-admin/${carId}/set-winner`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("sets winner manually", async () => {
      const res = await request(app)
        .post(`/api/auction-admin/${carId}/set-winner`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ bidId: bidId.toString() })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Winner manually set");
    });

    it("returns 404 for non-existent bid", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/auction-admin/${carId}/set-winner`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ bidId: fakeId })
        .expect(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auction-admin/:carId/end", () => {
    it("requires admin", async () => {
      await request(app)
        .post(`/api/auction-admin/${carId}/end`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });

    it("forces auction end", async () => {
      const res = await request(app)
        .post(`/api/auction-admin/${carId}/end`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });
});
