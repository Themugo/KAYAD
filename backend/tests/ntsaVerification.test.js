import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");

describe("NTSA Verification Routes", () => {
  let adminToken, ownerToken, userToken, ownerId, carId, requestId;

  beforeAll(async () => {
    const ts = Date.now();

    const adminRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "NTSA Admin", email: `ntsaadmin-${ts}@test.ke`, password: "admin123", role: "admin" });
    adminToken = adminRes.body.token;

    const ownerRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Car Owner", email: `ntsaowner-${ts}@test.ke`, password: "owner123" });
    ownerToken = ownerRes.body.token;
    ownerId = ownerRes.body.user._id;

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Random User", email: `ntsauser-${ts}@test.ke`, password: "user12345" });
    userToken = userRes.body.token;

    const Car = mongoose.model("Car");
    const car = await Car.create({
      title: "NTSA Car",
      brand: "Toyota",
      price: 800000,
      dealer: new mongoose.Types.ObjectId(ownerId),
      status: "active",
      ntsaVerified: false,
      dutyStatus: "unknown",
    });
    carId = car._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  describe("POST /api/ntsa-verification/", () => {
    it("requires auth", async () => {
      await request(app).post("/api/ntsa-verification/").send({ carId }).expect(401);
    });

    it("rejects missing carId", async () => {
      const res = await request(app)
        .post("/api/ntsa-verification/")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("allows owner to request verification", async () => {
      const res = await request(app)
        .post("/api/ntsa-verification/")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ carId: carId.toString() })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe("pending");
      requestId = res.body.request._id;
    });

    it("rejects duplicate pending request", async () => {
      const res = await request(app)
        .post("/api/ntsa-verification/")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ carId: carId.toString() })
        .expect(409);
      expect(res.body.success).toBe(false);
    });

    it("rejects non-owner non-admin user", async () => {
      const res = await request(app)
        .post("/api/ntsa-verification/")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ carId: carId.toString() })
        .expect(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/ntsa-verification/car/:carId/status", () => {
    it("requires auth", async () => {
      await request(app).get(`/api/ntsa-verification/car/${carId}/status`).expect(401);
    });

    it("returns verification status for car", async () => {
      const res = await request(app)
        .get(`/api/ntsa-verification/car/${carId}/status`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe("pending");
    });
  });

  describe("POST /api/ntsa-verification/:id/documents", () => {
    it("requires auth", async () => {
      await request(app).post(`/api/ntsa-verification/${requestId}/documents`).send({ url: "http://example.com/doc.pdf" }).expect(401);
    });

    it("rejects missing url", async () => {
      const res = await request(app)
        .post(`/api/ntsa-verification/${requestId}/documents`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("uploads document as requestor", async () => {
      const res = await request(app)
        .post(`/api/ntsa-verification/${requestId}/documents`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ url: "http://example.com/logbook.pdf", label: "Logbook" })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.documents.length).toBe(1);
      expect(res.body.request.documents[0].label).toBe("Logbook");
    });

    it("rejects document upload by unrelated user", async () => {
      const res = await request(app)
        .post(`/api/ntsa-verification/${requestId}/documents`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ url: "http://example.com/doc.pdf" })
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it("returns 404 for non-existent request", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .post(`/api/ntsa-verification/${fakeId}/documents`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ url: "http://example.com/doc.pdf" })
        .expect(404);
    });
  });

  describe("POST /api/ntsa-verification/:id/process (admin)", () => {
    it("requires admin", async () => {
      await request(app)
        .post(`/api/ntsa-verification/${requestId}/process`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ status: "passed" })
        .expect(403);
    });

    it("rejects invalid status", async () => {
      const res = await request(app)
        .post(`/api/ntsa-verification/${requestId}/process`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "invalid" })
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("processes and passes verification", async () => {
      const res = await request(app)
        .post(`/api/ntsa-verification/${requestId}/process`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "passed", dutyStatus: "duty_paid", chassisVerified: true, logbookVerified: true })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.status).toBe("passed");
    });

    it("updates car ntsaVerified on pass", async () => {
      const Car = mongoose.model("Car");
      const car = await Car.findById(carId);
      expect(car.ntsaVerified).toBe(true);
      expect(car.dutyStatus).toBe("duty_paid");
    });

    it("returns 404 for non-existent request", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .post(`/api/ntsa-verification/${fakeId}/process`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "passed" })
        .expect(404);
    });
  });

  describe("GET /api/ntsa-verification/ (admin list)", () => {
    it("requires admin", async () => {
      await request(app)
        .get("/api/ntsa-verification/")
        .set("Authorization", `Bearer ${ownerToken}`)
        .expect(403);
    });

    it("lists all requests for admin", async () => {
      const res = await request(app)
        .get("/api/ntsa-verification/")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.requests)).toBe(true);
    });

    it("filters by status", async () => {
      const res = await request(app)
        .get("/api/ntsa-verification/?status=passed")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.requests.every(r => r.status === "passed")).toBe(true);
    });
  });
});
