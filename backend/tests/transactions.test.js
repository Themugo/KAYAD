// backend/tests/transactions.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";

await startTestDB();

const { default: app } = await import("../server.js");

describe("Transaction Routes", () => {
  let token;

  beforeAll(async () => {
    const ts = Date.now();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Tx User", email: `tx-${ts}@test.ke`, password: "Test@12345" });
    token = res.body.token;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("GET /api/transactions — requires auth", async () => {
    await request(app).get("/api/transactions").expect(401);
  });

  it("GET /api/transactions — returns transaction list", async () => {
    const res = await request(app).get("/api/transactions").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.transactions ?? res.body.data ?? [])).toBe(true);
  });

  it("GET /api/transactions/summary — requires auth", async () => {
    await request(app).get("/api/transactions/summary").expect(401);
  });

  it("GET /api/transactions/summary — returns summary", async () => {
    const res = await request(app).get("/api/transactions/summary").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
  });
});
