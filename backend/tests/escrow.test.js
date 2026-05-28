// backend/tests/escrow.test.js
import request from "supertest";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV   = "test";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");
import Escrow from "../models/Escrow.js";
import Payment from "../models/Payment.js";

describe("Escrow System", () => {
  let adminToken, userToken, adminId, userId, escrowId;

  beforeAll(async () => {
    const ts = Date.now();

    const adminRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Admin", email: `admin-${ts}@test.com`, password: "Test@12345", role: "admin" });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user._id;

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Buyer", email: `buyer-${ts}@test.com`, password: "Test@12345" });
    userToken = userRes.body.token;
    userId = userRes.body.user._id;

    const Car = mongoose.model("Car");
    const car = await Car.create({
      title: "Escrow Car",
      brand: "Mercedes",
      price: 1500000,
      dealer: new mongoose.Types.ObjectId(userId),
      status: "active",
    });

    const payment = await Payment.create({
      user: new mongoose.Types.ObjectId(userId),
      referenceId: car._id,
      referenceModel: "Car",
      type: "buy",
      amount: 1500000,
      phone: "254712345678",
      status: "success",
      mpesaReceipt: `TEST${ts}`,
    });

    const escrow = await Escrow.create({
      car: car._id,
      buyer: new mongoose.Types.ObjectId(userId),
      seller: new mongoose.Types.ObjectId(adminId),
      amount: 1500000,
      payment: payment._id,
      status: "held",
    });
    escrowId = escrow._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  test("GET /api/escrow/my — requires auth", async () => {
    await request(app)
      .get("/api/escrow/my")
      .expect(401);
  });

  test("GET /api/escrow/my — authenticated user gets list", async () => {
    const res = await request(app)
      .get("/api/escrow/my")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    const list = res.body.escrows ?? res.body.data ?? [];
    expect(Array.isArray(list)).toBe(true);
  });

  test("GET /api/escrow — admin only", async () => {
    await request(app)
      .get("/api/escrow")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });

  test("GET /api/escrow — admin can access all escrows", async () => {
    const res = await request(app)
      .get("/api/escrow")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test("GET /api/escrow/:id — fetches specific escrow", async () => {
    if (!escrowId) return;
    const res = await request(app)
      .get(`/api/escrow/${escrowId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test("POST /api/escrow/:id/release — rejects non-admin", async () => {
    await request(app)
      .post(`/api/escrow/${escrowId}/release`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });

  test("POST /api/escrow/:id/refund — rejects non-admin", async () => {
    await request(app)
      .post(`/api/escrow/${escrowId}/refund`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });

  test("POST /api/escrow/:id/dispute — requires auth", async () => {
    const res = await request(app)
      .post(`/api/escrow/${escrowId}/dispute`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ reason: "Item not as described" })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test("GET /api/escrow/:id — rejects non-existent", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/escrow/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
    expect(res.body.success).toBe(false);
  });
});
