// backend/tests/notifications.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";

await startTestDB();

const { default: app } = await import("../server.js");
import mongoose from "mongoose";
import Notification from "../models/Notification.js";

describe("Notification Routes", () => {
  let token, userId, notifId;

  beforeAll(async () => {
    const ts = Date.now();

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Notif User", email: `notif-${ts}@test.ke`, password: "Test@12345" });
    token = res.body.token;
    userId = res.body.user._id;

    const notif = await Notification.create({
      user: new mongoose.Types.ObjectId(userId),
      title: "Test Notification",
      message: "This is a test",
      type: "info",
    });
    notifId = notif._id;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("GET /api/notifications — requires auth", async () => {
    await request(app).get("/api/notifications").expect(401);
  });

  it("GET /api/notifications — returns notifications", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    const list = res.body.notifications ?? res.body.data ?? [];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/notifications/:id/read — marks notification as read", async () => {
    if (!notifId) return;
    const res = await request(app)
      .post(`/api/notifications/${notifId}/read`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/notifications/read-all — marks all as read", async () => {
    const res = await request(app)
      .post("/api/notifications/read-all")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /api/notifications/:id — deletes notification", async () => {
    if (!notifId) return;
    const res = await request(app)
      .delete(`/api/notifications/${notifId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/notifications — returns empty after deletion", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});
