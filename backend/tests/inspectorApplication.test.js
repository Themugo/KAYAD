import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";
import mongoose from "mongoose";

await startTestDB();

const { default: app } = await import("../server.js");

describe("Inspector Application Routes", () => {
  let adminToken, userToken, adminId, applicationId;

  beforeAll(async () => {
    const ts = Date.now();

    const adminRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Insp Admin", email: `inspadmin-${ts}@test.ke`, password: "admin123", role: "admin" });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user._id;

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Insp User", email: `inspuser-${ts}@test.ke`, password: "user12345" });
    userToken = userRes.body.token;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  const validApp = {
    fullName: "John Inspector",
    email: `john-insp-${Date.now()}@test.ke`,
    phone: "254712345678",
    idNumber: "12345678",
    location: "Nairobi",
    yearsOfExperience: 5,
    specialties: ["mechanical", "body"],
    certifications: ["ASE Certified"],
  };

  describe("POST /api/inspector-applications/apply", () => {
    it("rejects missing required fields", async () => {
      const res = await request(app)
        .post("/api/inspector-applications/apply")
        .send({ fullName: "Incomplete" })
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("creates a new application", async () => {
      const res = await request(app)
        .post("/api/inspector-applications/apply")
        .send(validApp)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.status).toBe("pending");
      applicationId = res.body.application._id;
    });

    it("rejects duplicate pending application for same email", async () => {
      const res = await request(app)
        .post("/api/inspector-applications/apply")
        .send(validApp)
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it("allows application from unrelated email", async () => {
      const res = await request(app)
        .post("/api/inspector-applications/apply")
        .send({ ...validApp, email: `other-${Date.now()}@test.ke` })
        .expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/inspector-applications/my", () => {
    it("requires auth", async () => {
      await request(app).get("/api/inspector-applications/my").expect(401);
    });

    it("returns user applications", async () => {
      const res = await request(app)
        .get("/api/inspector-applications/my")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.applications)).toBe(true);
    });
  });

  describe("GET /api/inspector-applications/ (admin)", () => {
    it("requires admin", async () => {
      await request(app)
        .get("/api/inspector-applications/")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });

    it("lists all applications for admin", async () => {
      const res = await request(app)
        .get("/api/inspector-applications/")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.applications)).toBe(true);
    });

    it("filters by status", async () => {
      const res = await request(app)
        .get("/api/inspector-applications/?status=pending")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.applications.every(a => a.status === "pending")).toBe(true);
    });
  });

  describe("GET /api/inspector-applications/:id", () => {
    it("requires admin", async () => {
      await request(app)
        .get(`/api/inspector-applications/${applicationId}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });

    it("returns single application for admin", async () => {
      const res = await request(app)
        .get(`/api/inspector-applications/${applicationId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application._id).toBe(applicationId);
    });

    it("returns 404 for non-existent id", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/inspector-applications/${fakeId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/inspector-applications/:id/approve", () => {
    let pendingAppId;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/inspector-applications/apply")
        .send({
          fullName: "Approve Me",
          email: `approve-${Date.now()}@test.ke`,
          phone: "254700000001",
          idNumber: "87654321",
          location: "Mombasa",
          yearsOfExperience: 8,
        });
      pendingAppId = res.body.application._id;
    });

    it("requires admin", async () => {
      await request(app)
        .post(`/api/inspector-applications/${pendingAppId}/approve`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });

    it("approves application and creates ghost_checker user", async () => {
      const res = await request(app)
        .post(`/api/inspector-applications/${pendingAppId}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.status).toBe("approved");
      expect(res.body.user.role).toBe("ghost_checker");
    });

    it("rejects approving already-approved application", async () => {
      const res = await request(app)
        .post(`/api/inspector-applications/${pendingAppId}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/inspector-applications/:id/reject", () => {
    let rejectableId;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/inspector-applications/apply")
        .send({
          fullName: "Reject Me",
          email: `reject-${Date.now()}@test.ke`,
          phone: "254700000002",
          idNumber: "11223344",
          location: "Kisumu",
          yearsOfExperience: 2,
        });
      rejectableId = res.body.application._id;
    });

    it("requires admin", async () => {
      await request(app)
        .post(`/api/inspector-applications/${rejectableId}/reject`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403);
    });

    it("rejects application", async () => {
      const res = await request(app)
        .post(`/api/inspector-applications/${rejectableId}/reject`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reviewNotes: "Insufficient experience" })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.status).toBe("rejected");
      expect(res.body.application.reviewNotes).toBe("Insufficient experience");
    });

    it("returns 404 for non-existent id", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .post(`/api/inspector-applications/${fakeId}/reject`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
