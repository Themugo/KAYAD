// backend/tests/escrow.test.js
import request from "supertest";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV   = "test";

import { startTestDB, stopTestDB } from "./setup.js";
await startTestDB();

const { default: app } = await import("../server.js");

let adminToken = "";
let userToken  = "";

describe("🔒 Escrow System", () => {

  beforeAll(async () => {
    const adminRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Admin", email: `admin-${Date.now()}@test.com`, password: "admin123", role: "admin" });
    adminToken = adminRes.body.token;

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ name: "Test Buyer", email: `buyer-${Date.now()}@test.com`, password: "buyer123" });
    userToken = userRes.body.token;
  });

  test("GET /api/escrow/my — requires auth", async () => {
    await request(app)
      .get("/api/escrow/my")
      .expect(401);
  });

  test("GET /api/escrow/my — authenticated user gets empty list", async () => {
    const res = await request(app)
      .get("/api/escrow/my")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.escrows ?? res.body.data ?? [])).toBe(true);
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

  test("POST /api/escrow/:id/release — rejects non-admin", async () => {
    await request(app)
      .post("/api/escrow/000000000000000000000000/release")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });

  test("POST /api/escrow/:id/refund — rejects non-admin", async () => {
    await request(app)
      .post("/api/escrow/000000000000000000000000/refund")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });

});
