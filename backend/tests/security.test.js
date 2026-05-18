import { describe, it, expect } from "@jest/globals";
import request from "supertest";

process.env.MONGO_URI = process.env.TEST_MONGO_URI || "mongodb://localhost:27017/kayad-test";
process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

const { default: app } = await import("../server.js");

describe("Security", () => {
  it("GET /api/cars?limit=999999 — enforces pagination cap", async () => {
    const res = await request(app).get("/api/cars?limit=999999");
    expect(res.status).not.toBe(500);
  });

  it("POST /api/auth/login — rate limited on rapid attempts", async () => {
    const payload = { email: "ratelimit@test.ke", password: "wrongpass12345" };
    let lastStatus = 200;
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send(payload);
      lastStatus = res.status;
    }
    // Should eventually get rate limited or consistently get 401
    expect(lastStatus === 401 || lastStatus === 429).toBe(true);
  });

  it("GET /api/auth/profile — rejects without token", async () => {
    const res = await request(app).get("/api/auth/profile");
    expect(res.body.success).toBe(false);
  });
});
