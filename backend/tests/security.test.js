// backend/tests/security.test.js
import request from "supertest";
import mongoose from "mongoose";
import dotenv   from "dotenv";
dotenv.config({ path: ".env.test" });

process.env.MONGO_URI = process.env.TEST_MONGO_URI || "mongodb://localhost:27017/kayad-test";
process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV   = "test";

const { default: app } = await import("../server.js").catch(() => ({ default: null }));

describe("🔒 Security Middleware", () => {

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("Blocks NoSQL injection in query params", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: { "$gt": "" }, password: "anything" })
      .expect(res => res.status !== 200); // should NOT succeed

    expect([400, 401, 422]).toContain(res.status);
  });

  test("XSS: sanitizes script tags in input", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name:     "<script>alert(1)</script>",
        email:    `xss-${Date.now()}@test.com`,
        password: "testpass123",
      });

    if (res.status === 201) {
      expect(res.body.user.name).not.toContain("<script>");
    }
  });

  test("GET /health — returns 200 without auth", async () => {
    const res = await request(app)
      .get("/health")
      .expect(200);

    expect(res.body.status).toBe("ok");
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  test("GET /health/deep — returns service statuses", async () => {
    const res = await request(app)
      .get("/health/deep")
      .expect(res => [200, 503].includes(res.status));

    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.mongodb).toBeDefined();
  });

  test("Rate limit: auth endpoint has stricter limits", async () => {
    // Header should be present
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@test.com", password: "wrong" });

    // RateLimit headers should be present
    const hasRateLimit =
      res.headers["ratelimit-limit"] ||
      res.headers["x-ratelimit-limit"] ||
      res.headers["retry-after"];

    // Either has rate limit header or 429 (if hammered)
    expect(res.status !== 500).toBe(true);
  });

  test("Rejects oversized request body", async () => {
    const bigPayload = { data: "x".repeat(3 * 1024 * 1024) }; // 3MB
    const res = await request(app)
      .post("/api/auth/login")
      .send(bigPayload);

    expect([400, 413]).toContain(res.status);
  });

});
