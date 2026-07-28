import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { io as ioc } from "socket.io-client";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB, describeWithDb } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app, server } = await import("../server.js");
import Car from "../models/Car.js";

describeWithDb("Bid Flow", () => {
  let dealerToken;
  let carId;
  let dealerId;

  beforeAll(async () => {
    const ts = Date.now();
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: `dealer-${ts}`, email: `dealer-${ts}@test.ke`, password: "Test@12345", role: "dealer" });
    dealerToken = reg.body.token;
    dealerId = reg.body.user._id;

    // Create a test car
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

  it("GET /api/cars — returns car list", async () => {
    const res = await request(app).get("/api/cars?limit=1");
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /api/health — returns health status", async () => {
    const res = await request(app).get("/health");
    expect([200, 502]).toContain(res.statusCode);
  });
});
