// backend/tests/escrowVault.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";
process.env.ESCROW_ACCOUNT_NUMBER = "1234567890";
process.env.ESCROW_PLATFORM_NAME = "Test Escrow";
process.env.ESCROW_BANK_NAME = "Test Bank";

import { startTestDB, stopTestDB, clearTestDB, describeWithDb } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");
import User from "../models/User.js";

describeWithDb("Escrow Vault Routes", () => {
  let token, userId, carId;

  beforeAll(async () => {
    const ts = Date.now();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Vault User", email: `vault-${ts}@test.ke`, password: "Test@12345" });
    token = res.body.token;
    userId = res.body.user._id;

    const Car = mongoose.model("Car");
    const car = await Car.create({
      title: "Vault Car",
      brand: "BMW",
      price: 2000000,
      dealer: new mongoose.Types.ObjectId(userId),
      status: "active",
      winner: { user: new mongoose.Types.ObjectId(userId), amount: 2000000 },
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("POST /api/escrow-vault/:carId/init — requires auth", async () => {
    await request(app).post(`/api/escrow-vault/${carId}/init`).expect(401);
  });

  it("POST /api/escrow-vault/:carId/init — initiates vault (or returns existing)", async () => {
    const res = await request(app)
      .post(`/api/escrow-vault/${carId}/init`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/escrow-vault/my — returns user vaults", async () => {
    const res = await request(app).get("/api/escrow-vault/my").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.vaults ?? res.body.data ?? [])).toBe(true);
  });

  it("GET /api/escrow-vault/car/:carId — returns vault for car", async () => {
    const res = await request(app)
      .get(`/api/escrow-vault/car/${carId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});
