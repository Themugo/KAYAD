// backend/tests/admin.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB, describeWithDb } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");
import User from "../models/User.js";
import Car from "../models/Car.js";

describeWithDb("Admin Routes", () => {
  let adminToken, userToken, adminId, targetUserId, carId;

  beforeAll(async () => {
    const ts = Date.now();

    const adminRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Admin", email: `admin-${ts}@test.ke`, password: "Test@12345", role: "admin" });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user._id;

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Target User", email: `target-${ts}@test.ke`, password: "Test@12345" });
    userToken = userRes.body.token;
    targetUserId = userRes.body.user._id;

    const dealerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Dealer", email: `dealer-adm-${ts}@test.ke`, password: "Test@12345", role: "dealer" });
    const dealerId = dealerRes.body.user._id;
    await User.findByIdAndUpdate(dealerId, { approved: true });

    const car = await Car.create({
      title: "Admin Test Car",
      brand: "Mazda",
      price: 600000,
      dealer: new mongoose.Types.ObjectId(dealerId),
      status: "active",
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("GET /api/admin/stats — requires admin", async () => {
    await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${userToken}`).expect(403);
  });

  it("GET /api/admin/stats — admin can access stats", async () => {
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/admin/users — admin can list users", async () => {
    const res = await request(app).get("/api/admin/users").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/admin/users/:id/toggle-ban — admin can toggle ban", async () => {
    const res = await request(app)
      .post(`/api/admin/users/${targetUserId}/toggle-ban`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/admin/cars — admin can list all cars", async () => {
    const res = await request(app).get("/api/admin/cars").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.cars ?? res.body.data ?? [])).toBe(true);
  });

  it("GET /api/admin/config — admin can get config", async () => {
    const res = await request(app).get("/api/admin/config").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("PUT /api/admin/config — admin can update config", async () => {
    const res = await request(app)
      .put("/api/admin/config")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ siteName: "Kayad Test" })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/admin/audit-log — admin can view audit log", async () => {
    const res = await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${adminToken}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/admin/demo/status — admin can check demo status", async () => {
    const res = await request(app)
      .get("/api/admin/demo/status")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/admin/audit-log — rejects non-admin", async () => {
    await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${userToken}`).expect(403);
  });

  it("GET /api/admin/cars — rejects non-admin", async () => {
    await request(app).get("/api/admin/cars").set("Authorization", `Bearer ${userToken}`).expect(403);
  });

  it("GET /api/escrow — rejects non-admin", async () => {
    await request(app).get("/api/escrow").set("Authorization", `Bearer ${userToken}`).expect(403);
  });

  it("GET /api/admin/stats — rejects no auth", async () => {
    await request(app).get("/api/admin/stats").expect(401);
  });
});
