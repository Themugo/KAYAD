import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";
process.env.PAYMENT_MODE = "mock";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");

describe("Inspection Routes", () => {
  let buyerToken, adminToken, inspectorToken;
  let buyerId, inspectorId, carId, orderId;

  beforeAll(async () => {
    const ts = Date.now();

    const buyerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Insp Buyer", email: `inspbuy-${ts}@test.ke`, password: "Test@12345" });
    buyerToken = buyerRes.body.token;
    buyerId = buyerRes.body.user._id;

    const adminRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Insp Admin", email: `inspadm-${ts}@test.ke`, password: "Test@12345", role: "admin" });
    adminToken = adminRes.body.token;

    const inspectorRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ghost Checker", email: `ghost-${ts}@test.ke`, password: "Test@12345" });
    inspectorToken = inspectorRes.body.token;
    inspectorId = inspectorRes.body.user._id;

    // Promote to ghost_checker
    await mongoose.model("User").findByIdAndUpdate(inspectorId, { role: "ghost_checker", isInspector: true });

    const Car = mongoose.model("Car");
    const car = await Car.create({
      title: "Inspectable Car",
      brand: "Mazda",
      price: 1200000,
      dealer: new mongoose.Types.ObjectId(buyerId),
      status: "active",
      trustScore: 50,
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  describe("POST /api/inspections/order", () => {
    it("requires auth", async () => {
      await request(app).post("/api/inspections/order").send({ carId, phone: "254712345678" }).expect(401);
    });

    it("rejects missing carId or phone", async () => {
      const res = await request(app)
        .post("/api/inspections/order")
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({ carId })
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("creates an inspection order", async () => {
      const res = await request(app)
        .post("/api/inspections/order")
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({ carId: carId.toString(), phone: "254712345678" })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(["paid", "pending_payment"]).toContain(res.body.order.status);
      orderId = res.body.order._id;
    });

    it("rejects duplicate order for same car", async () => {
      const res = await request(app)
        .post("/api/inspections/order")
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({ carId: carId.toString(), phone: "254712345678" })
        .expect(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/inspections/my", () => {
    it("requires auth", async () => {
      await request(app).get("/api/inspections/my").expect(401);
    });

    it("returns buyer orders", async () => {
      const res = await request(app)
        .get("/api/inspections/my")
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.orders)).toBe(true);
      expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET /api/inspections/available-inspectors (admin)", () => {
    it("requires admin", async () => {
      await request(app)
        .get("/api/inspections/available-inspectors")
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(403);
    });

    it("lists available ghost_checkers", async () => {
      const res = await request(app)
        .get("/api/inspections/available-inspectors")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.inspectors)).toBe(true);
      expect(res.body.inspectors.some(i => i._id === inspectorId)).toBe(true);
    });
  });

  describe("POST /api/inspections/:id/assign (admin)", () => {
    it("requires admin", async () => {
      if (!orderId) return; // Skip if orderId not set
      await request(app)
        .post(`/api/inspections/${orderId}/assign`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({ inspectorId })
        .expect(403);
    });

    it("requires inspectorId", async () => {
      if (!orderId) return; // Skip if orderId not set
      const res = await request(app)
        .post(`/api/inspections/${orderId}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("assigns inspector to order", async () => {
      if (!orderId) return; // Skip if orderId not set
      const res = await request(app)
        .post(`/api/inspections/${orderId}/assign`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ inspectorId: inspectorId.toString() })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.status).toBe("assigned");
    });
  });

  describe("POST /api/inspections/:id/start", () => {
    it("requires auth", async () => {
      if (!orderId) return;
      await request(app).post(`/api/inspections/${orderId}/start`).expect(401);
    });

    it("rejects start by wrong user", async () => {
      if (!orderId) return;
      const res = await request(app)
        .post(`/api/inspections/${orderId}/start`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it("starts inspection as assigned inspector", async () => {
      if (!orderId) return;
      const res = await request(app)
        .post(`/api/inspections/${orderId}/start`)
        .set("Authorization", `Bearer ${inspectorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.status).toBe("in_progress");
    });
  });

  describe("POST /api/inspections/:id/submit", () => {
    it("requires auth", async () => {
      if (!orderId) return;
      await request(app).post(`/api/inspections/${orderId}/submit`).expect(401);
    });

    it("submits inspection report", async () => {
      if (!orderId) return;
      const res = await request(app)
        .post(`/api/inspections/${orderId}/submit`)
        .set("Authorization", `Bearer ${inspectorToken}`)
        .send({
          overallScore: 85,
          conditionRating: "good",
          inspectorNotes: "Well maintained vehicle",
          checklist: [{ category: "engine", item: "oil level", passed: true }],
        })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.order.status).toBe("completed");
      expect(res.body.order.overallScore).toBe(85);
    });

    it("increments car trustScore on good report", async () => {
      if (!orderId) return;
      const Car = mongoose.model("Car");
      const car = await Car.findById(carId);
      expect(car.trustScore).toBeGreaterThan(50);
    });
  });

  describe("GET /api/inspections/car/:carId", () => {
    it("returns completed inspection for car", async () => {
      if (!orderId) return;
      const res = await request(app)
        .get(`/api/inspections/car/${carId}`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.inspection).not.toBeNull();
      expect(res.body.inspection.status).toBe("completed");
    });

    it("returns null for non-existent car", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/inspections/car/${fakeId}`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);
      expect(res.body.inspection).toBeNull();
    });
  });

  describe("GET /api/inspections/:id", () => {
    it("requires auth", async () => {
      if (!orderId) return;
      await request(app).get(`/api/inspections/${orderId}`).expect(401);
    });

    it("returns order for buyer", async () => {
      if (!orderId) return;
      const res = await request(app)
        .get(`/api/inspections/${orderId}`)
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it("returns order for inspector", async () => {
      if (!orderId) return;
      const res = await request(app)
        .get(`/api/inspections/${orderId}`)
        .set("Authorization", `Bearer ${inspectorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it("denies access to unrelated user", async () => {
      if (!orderId) return;
      const otherRes = await request(app)
        .post("/api/auth/register")
        .send({ name: "Stranger", email: `stranger-${Date.now()}@test.ke`, password: "Test@12345" });
      const otherToken = otherRes.body.token;
      const res = await request(app)
        .get(`/api/inspections/${orderId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 for non-existent id", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .get(`/api/inspections/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe("GET /api/inspections/ (admin list)", () => {
    it("requires admin", async () => {
      await request(app)
        .get("/api/inspections/")
        .set("Authorization", `Bearer ${buyerToken}`)
        .expect(403);
    });

    it("lists all orders for admin", async () => {
      const res = await request(app)
        .get("/api/inspections/")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.orders)).toBe(true);
    });

    it("filters by status", async () => {
      const res = await request(app)
        .get("/api/inspections/?status=completed")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.orders.every(o => o.status === "completed")).toBe(true);
    });
  });

  describe("GET /api/inspections/my-tasks (inspector)", () => {
    it("returns inspector assigned tasks", async () => {
      const res = await request(app)
        .get("/api/inspections/my-tasks")
        .set("Authorization", `Bearer ${inspectorToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.orders)).toBe(true);
    });
  });
});
