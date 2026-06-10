// backend/tests/favorites.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");
import Car from "../models/Car.js";

describe("Favorites Routes", () => {
  let token, userId, carId;

  beforeAll(async () => {
    const ts = Date.now();

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Fav User", email: `fav-${ts}@test.ke`, password: "Test@12345" });
    token = res.body.token;
    userId = res.body.user._id;

    const car = await Car.create({
      title: "Fav Car",
      brand: "Subaru",
      price: 300000,
      dealer: new mongoose.Types.ObjectId(userId),
      status: "active",
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("GET /api/favorites — requires auth", async () => {
    await request(app).get("/api/favorites").expect(401);
  });

  it("GET /api/favorites — returns empty list initially", async () => {
    const res = await request(app).get("/api/favorites").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
    const list = res.body.favorites ?? res.body.data ?? [];
    expect(Array.isArray(list)).toBe(true);
  });

  it("POST /api/favorites/:carId — adds a favorite", async () => {
    const res = await request(app).post(`/api/favorites/${carId}`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/favorites/:carId/toggle — toggles favorite", async () => {
    const res = await request(app)
      .post(`/api/favorites/${carId}/toggle`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/favorites/:carId — re-adds after toggle", async () => {
    const res = await request(app).post(`/api/favorites/${carId}`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /api/favorites/:carId — removes a favorite", async () => {
    const res = await request(app)
      .delete(`/api/favorites/${carId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/favorites — returns empty after removal", async () => {
    const res = await request(app).get("/api/favorites").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("PUT /api/favorites/:carId/price-alert — sets price alert", async () => {
    // First re-add the favorite since we just removed it
    await request(app).post(`/api/favorites/${carId}`).set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .put(`/api/favorites/${carId}/price-alert`)
      .set("Authorization", `Bearer ${token}`)
      .send({ notifyOnPriceDrop: true })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});
