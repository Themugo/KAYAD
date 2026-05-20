import { describe, it, expect, beforeAll } from "@jest/globals";
import request from "supertest";
import { io as ioc } from "socket.io-client";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB } from "./setup.js";
await startTestDB();

const { default: app, server } = await import("../server.js");

describe("Bid Flow", () => {
  let dealerToken;
  let carId;

  beforeAll(async () => {
    const dName = `dealer-${Date.now()}`;
    const dEmail = `dealer-${Date.now()}@test.ke`;
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name: dName, email: dEmail, password: "testpass12345", role: "dealer" });
    dealerToken = reg.body.token;
    const carRes = await request(app)
      .get("/api/cars?limit=1");
    carId = carRes.body.data?.[0]?._id;
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
