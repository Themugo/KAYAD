import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");

describe("SMS Bidding Routes", () => {
  let userToken, dealerToken, userId, dealerId, carId;

  beforeAll(async () => {
    const ts = Date.now();

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "SMS User", email: `smsuser-${ts}@test.ke`, password: "Test@12345" });
    userToken = userRes.body.token;
    userId = userRes.body.user._id;

    const dealerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "SMS Dealer", email: `smsdeal-${ts}@test.ke`, password: "Test@12345" });
    dealerToken = dealerRes.body.token;
    dealerId = dealerRes.body.user._id;

    const Car = mongoose.model("Car");
    const car = await Car.create({
      title: "SMS Auction Car",
      brand: "Nissan",
      price: 800000,
      dealer: new mongoose.Types.ObjectId(dealerId),
      status: "active",
      allowBid: true,
      auctionStatus: "live",
      auctionEnd: new Date(Date.now() + 3600000),
      currentBid: 500000,
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  describe("POST /api/sms-bidding/register", () => {
    it("requires auth", async () => {
      await request(app).post("/api/sms-bidding/register").send({ phone: "254712345678" }).expect(401);
    });

    it("rejects missing phone", async () => {
      const res = await request(app)
        .post("/api/sms-bidding/register")
        .set("Authorization", `Bearer ${userToken}`)
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("registers phone for SMS bidding", async () => {
      const res = await request(app)
        .post("/api/sms-bidding/register")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ phone: "254712345678" })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.smsBidder.phone).toBe("254712345678");
    });

    it("updates existing registration on re-register", async () => {
      const res = await request(app)
        .post("/api/sms-bidding/register")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ phone: "254798765432" })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.smsBidder.phone).toBe("254798765432");
    });
  });

  describe("GET /api/sms-bidding/my", () => {
    it("requires auth", async () => {
      await request(app).get("/api/sms-bidding/my").expect(401);
    });

    it("returns SMS bidding profile", async () => {
      const res = await request(app)
        .get("/api/sms-bidding/my")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.smsBidder).toBeDefined();
    });
  });

  describe("POST /api/sms-bidding/subscribe", () => {
    it("requires auth", async () => {
      await request(app).post("/api/sms-bidding/subscribe").send({ carId }).expect(401);
    });

    it("subscribes to a car auction", async () => {
      const res = await request(app)
        .post("/api/sms-bidding/subscribe")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ carId: carId.toString(), notifyOnOutbid: true })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.subscriptions)).toBe(true);
    });

    it("rejects invalid carId", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post("/api/sms-bidding/subscribe")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ carId: fakeId })
        .expect(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("DELETE /api/sms-bidding/unsubscribe/:carId", () => {
    it("requires auth", async () => {
      await request(app).delete(`/api/sms-bidding/unsubscribe/${carId}`).expect(401);
    });

    it("unsubscribes from a car", async () => {
      const res = await request(app)
        .delete(`/api/sms-bidding/unsubscribe/${carId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /api/sms-bidding/webhook/inbound", () => {
    it("rejects missing from or text", async () => {
      await request(app).post("/api/sms-bidding/webhook/inbound").send({}).expect(400);
    });

    it("rejects invalid from phone", async () => {
      const res = await request(app)
        .post("/api/sms-bidding/webhook/inbound")
        .send({ from: "123", text: "BID 600K" })
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("handles invalid bid format gracefully", async () => {
      const res = await request(app)
        .post("/api/sms-bidding/webhook/inbound")
        .send({ from: "254700000001", text: "HELLO" })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Invalid format");
    });

    it("handles unregistered sender gracefully", async () => {
      const res = await request(app)
        .post("/api/sms-bidding/webhook/inbound")
        .send({ from: "254700000002", text: "BID 600K" })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Unregistered");
    });
  });
});
