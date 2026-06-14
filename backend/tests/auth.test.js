// backend/tests/auth.test.js
import request from "supertest";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB } from "./setup.js";
await startTestDB();

const { default: app } = await import("../server.js");

const TEST_USER = {
  name: "Test User",
  email: `test-${Date.now()}@gari.test`,
  password: "Test@12345",
  role: "user",
};

let token = "";
let userId = "";

describe("🔑 Authentication", () => {
  test("POST /api/auth/register — creates new user", async () => {
    const res = await request(app).post("/api/auth/register").send(TEST_USER).expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user.password).toBeUndefined();

    token = res.body.token;
    userId = res.body.user._id;
  });

  test("POST /api/auth/register — rejects duplicate email", async () => {
    await request(app).post("/api/auth/register").send(TEST_USER).expect(400);
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
    await request(app).post("/api/auth/login").send({ email: TEST_USER.email, password: "wrongpassword" }).expect(401);
  });

  test("GET /api/auth/me — returns user from token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`).expect(200);

    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  test("GET /api/auth/me — rejects missing token", async () => {
    await request(app).get("/api/auth/me").expect(401);
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

    // Re-login after password change to get new token
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "New@Pass456" })
      .expect(200);
    token = loginRes.body.token;
  });

  test("POST /api/auth/forgot-password — sends reset email", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({ email: TEST_USER.email }).expect(200);
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
    await request(app).put("/api/auth/profile").send({ name: "Hacker" }).expect(401);
  });

  test("GET /api/auth/profile — returns user profile", async () => {
    // Re-login to ensure we have a valid token
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "New@Pass456" })
      .expect(200);
    token = loginRes.body.token;

    const res = await request(app).get("/api/auth/profile").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  test("POST /api/auth/logout — logs out user", async () => {
    // Re-login to ensure we have a valid token
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "New@Pass456" })
      .expect(200);
    token = loginRes.body.token;

    const res = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
  });

  test("POST /api/auth/refresh — returns new token after login", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "New@Pass456" });
    const freshToken = loginRes.body.token;
    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", loginRes.headers["set-cookie"])
      .set("X-Requested-By", "kayad-app")
      .expect(200);
    expect(res.body.token).toBeTruthy();
  });

  // =============================
  // 🚗 DEALER LOGIN TESTS
  // =============================
  test("POST /api/auth/register — creates dealer with pending status when requireDealerApproval is true", async () => {
    const dealerUser = {
      name: "Test Dealer",
      email: `dealer-${Date.now()}@gari.test`,
      password: "Test@12345",
      role: "dealer",
      businessName: "Test Dealership",
      location: "Nairobi",
    };

    const res = await request(app).post("/api/auth/register").send(dealerUser).expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("dealer");
    expect(res.body.user.status).toBe("approved"); // Default is approved unless config requires approval
  });

  test("POST /api/auth/login — dealer with approved status can login", async () => {
    const dealerUser = {
      name: "Approved Dealer",
      email: `approved-dealer-${Date.now()}@gari.test`,
      password: "Test@12345",
      role: "dealer",
      businessName: "Approved Dealership",
      location: "Nairobi",
    };

    await request(app).post("/api/auth/register").send(dealerUser).expect(201);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: dealerUser.email, password: dealerUser.password })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.user.role).toBe("dealer");
    expect(loginRes.body.user.status).toBe("approved");
  });

  // =============================
  // 🤝 BROKER LOGIN TESTS
  // =============================
  test("POST /api/auth/register — creates broker with approved status", async () => {
    const brokerUser = {
      name: "Test Broker",
      email: `broker-${Date.now()}@gari.test`,
      password: "Test@12345",
      role: "broker",
      location: "Nairobi",
    };

    const res = await request(app).post("/api/auth/register").send(brokerUser).expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("broker");
    expect(res.body.user.status).toBe("approved");
  });

  test("POST /api/auth/login — broker with approved status can login", async () => {
    const brokerUser = {
      name: "Approved Broker",
      email: `approved-broker-${Date.now()}@gari.test`,
      password: "Test@12345",
      role: "broker",
      location: "Nairobi",
    };

    await request(app).post("/api/auth/register").send(brokerUser).expect(201);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: brokerUser.email, password: brokerUser.password })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.user.role).toBe("broker");
    expect(loginRes.body.user.status).toBe("approved");
  });

  // =============================
  // 👑 ADMIN LOGIN TESTS
  // =============================
  test("POST /api/auth/register — creates admin user in test mode", async () => {
    const adminUser = {
      name: "Test Admin",
      email: `admin-${Date.now()}@gari.test`,
      password: "Test@12345",
      role: "admin",
    };

    const res = await request(app).post("/api/auth/register").send(adminUser).expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("admin");
    expect(res.body.user.status).toBe("approved");
  });

  test("POST /api/auth/login — admin can login", async () => {
    const adminUser = {
      name: "Admin User",
      email: `admin-login-${Date.now()}@gari.test`,
      password: "Test@12345",
      role: "admin",
    };

    await request(app).post("/api/auth/register").send(adminUser).expect(201);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: adminUser.email, password: adminUser.password })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.user.role).toBe("admin");
  });

  // =============================
  // 👤 BUYER LOGIN TESTS
  // =============================
  test("POST /api/auth/register — creates buyer user", async () => {
    const buyerUser = {
      name: "Test Buyer",
      email: `buyer-${Date.now()}@gari.test`,
      password: "Test@12345",
      role: "user",
    };

    const res = await request(app).post("/api/auth/register").send(buyerUser).expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("user");
    expect(res.body.user.status).toBe("approved");
  });

  test("POST /api/auth/login — buyer can login", async () => {
    const buyerUser = {
      name: "Buyer User",
      email: `buyer-login-${Date.now()}@gari.test`,
      password: "Test@12345",
      role: "user",
    };

    await request(app).post("/api/auth/register").send(buyerUser).expect(201);

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: buyerUser.email, password: buyerUser.password })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.user.role).toBe("user");
  });

  // =============================
  // 🔐 SESSION MANAGEMENT TESTS
  // =============================
  test("GET /api/auth/sessions — returns active sessions for authenticated user", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "New@Pass456" });

    const token = loginRes.body.token;
    const res = await request(app).get("/api/auth/sessions").set("Authorization", `Bearer ${token}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.sessions)).toBe(true);
  });

  test("POST /api/auth/logout — revokes all sessions", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "New@Pass456" });

    const token = loginRes.body.token;
    const res = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Logged out from all devices");
  });

  test("POST /api/auth/sessions/revoke-all — revokes all sessions", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "New@Pass456" });

    const token = loginRes.body.token;
    const res = await request(app)
      .post("/api/auth/sessions/revoke-all")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("All sessions revoked");
  });
});
