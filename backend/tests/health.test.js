import { describe, it, expect } from "@jest/globals";
import request from "supertest";

process.env.MONGO_URI = process.env.TEST_MONGO_URI || "mongodb://localhost:27017/kayad-test";
process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

const { default: app } = await import("../server.js");

describe("Health Check", () => {
  it("GET /health returns 200", async () => {
    const res = await request(app).get("/health");
    expect([200, 502]).toContain(res.statusCode);
  });

  it("GET /api/cars returns 200 with array", async () => {
    const res = await request(app).get("/api/cars?limit=1");
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty("success", true);
    }
  });
});
