// backend/tests/auth.test.js
import request from "supertest";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV   = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB } from "./setup.js";
await startTestDB();

const { default: app } = await import("../server.js");

const TEST_USER = {
  name:     "Test User",
  email:    `test-${Date.now()}@gari.test`,
  password: "Test@12345",
  role:     "user",
};

let token = "";
let userId = "";

describe("🔑 Authentication", () => {

  test("POST /api/auth/register — creates new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(TEST_USER)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user.password).toBeUndefined();

    token  = res.body.token;
    userId = res.body.user._id;
  });

  test("POST /api/auth/register — rejects duplicate email", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(TEST_USER)
      .expect(400);
  });

  test("POST /api/auth/login — valid credentials return token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
  });

  test("POST /api/auth/login — wrong password returns 401", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "wrongpassword" })
      .expect(401);
  });

  test("GET /api/auth/me — returns user from token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  test("GET /api/auth/me — rejects missing token", async () => {
    await request(app)
      .get("/api/auth/me")
      .expect(401);
  });

  test("PUT /api/auth/profile — updates name and phone", async () => {
    const res = await request(app)
      .put("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name", phone: "254712000000" })
      .expect(200);

    expect(res.body.user.name).toBe("Updated Name");
    expect(res.body.user.phone).toBe("254712000000");
  });

  test("PUT /api/auth/change-password — changes password", async () => {
    const res = await request(app)
      .put("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: TEST_USER.password, newPassword: "New@Pass456" })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test("POST /api/auth/forgot-password — sends reset email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: TEST_USER.email })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test("POST /api/auth/reset-password — rejects without token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "invalid", password: "New@Pass123" })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/auth/register — rejects short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Bad User", email: `bad-${Date.now()}@test.ke`, password: "short" })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  test("PUT /api/auth/profile — rejects without auth", async () => {
    await request(app)
      .put("/api/auth/profile")
      .send({ name: "Hacker" })
      .expect(401);
  });

  test("GET /api/auth/profile — returns user profile", async () => {
    const res = await request(app)
      .get("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  test("POST /api/auth/logout — logs out user", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test("POST /api/auth/refresh — returns new token after login", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "New@Pass456" });
    const freshToken = loginRes.body.token;
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Authorization", `Bearer ${freshToken}`)
      .set("X-Requested-By", "kayad-app")
      .expect(200);
    expect(res.body.token).toBeTruthy();
  });

});
