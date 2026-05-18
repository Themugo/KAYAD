import { describe, it, expect, beforeAll } from "@jest/globals";
import request from "supertest";

process.env.MONGO_URI = process.env.TEST_MONGO_URI || "mongodb://localhost:27017/kayad-test";
process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

const { default: app } = await import("../server.js");

describe("Payments", () => {
  let buyerToken;
  let carId;

  beforeAll(async () => {
    const name = `buyer-${Date.now()}`;
    const email = `buyer-${Date.now()}@test.ke`;
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ name, email, password: "testpass12345", role: "user" });
    buyerToken = reg.body.token;
    const carRes = await request(app)
      .get("/api/cars?limit=1");
    carId = carRes.body.data?.[0]?._id;
  });

  it("POST /api/payments/initiate — rejects without phone or amount", async () => {
    const res = await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ type: "bid" })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/payments/initiate — rejects negative amount", async () => {
    const res = await request(app)
      .post("/api/payments/initiate")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ phone: "254712345678", amount: -100, type: "bid" })
      .expect(400);
    expect(res.body.success).toBe(false);
  });
});
