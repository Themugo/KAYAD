// backend/tests/referral.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";

await startTestDB();

const { default: app } = await import("../server.js");

describe("Referral Routes", () => {
  let token;

  beforeAll(async () => {
    const ts = Date.now();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Ref User", email: `ref-${ts}@test.ke`, password: "Test@12345" });
    token = res.body.token;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("GET /api/referral/stats — requires auth", async () => {
    await request(app).get("/api/referral/stats").expect(401);
  });

  it("GET /api/referral/stats — returns referral stats", async () => {
    const res = await request(app).get("/api/referral/stats").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/referral/code — requires auth", async () => {
    await request(app).get("/api/referral/code").expect(401);
  });

  it("GET /api/referral/code — returns referral code", async () => {
    const res = await request(app).get("/api/referral/code").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.code ?? res.body.referralCode).toBeTruthy();
  });
});
