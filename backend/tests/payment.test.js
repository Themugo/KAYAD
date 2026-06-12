// backend/tests/payment.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");
import Payment from "../models/Payment.js";

describe("Payments", () => {
  let buyerToken;
  let carId;

  beforeAll(async () => {
    const ts = Date.now();
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: `buyer-${ts}`, email: `buyer-${ts}@test.ke`, password: "Test@12345", role: "user" });
    buyerToken = reg.body.token;
    const buyerId = reg.body.user._id;

    const Car = mongoose.model("Car");
    const car = await Car.create({
      title: "Payment Test Car",
      brand: "Toyota",
      price: 500000,
      dealer: new mongoose.Types.ObjectId(buyerId),
      status: "active",
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("POST /api/payments/initiate — requires auth", async () => {
    await request(app)
      .post("/api/payments/initiate")
      .send({ phone: "254712345678", amount: 1000, type: "bid" })
      .expect(401);
  });

  it("POST /api/payments/initiate — rejects without phone or amount", async () => {
    const res = await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ type: "bid" })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/payments/initiate — rejects negative amount", async () => {
    const res = await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ phone: "254712345678", amount: -100, type: "bid" })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/payments/initiate — rejects zero amount", async () => {
    const res = await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ phone: "254712345678", amount: 0, type: "bid" })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/payments/my — requires auth", async () => {
    await request(app).get("/api/payments/my").expect(401);
  });

  it("GET /api/payments/my — returns empty list", async () => {
    const res = await request(app).get("/api/payments/my").set("Authorization", `Bearer ${buyerToken}`).expect(200);
    expect(res.body.success).toBe(true);
    const list = res.body.payments ?? res.body.data ?? [];
    expect(Array.isArray(list)).toBe(true);
  });
});
