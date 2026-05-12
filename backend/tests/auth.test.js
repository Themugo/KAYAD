// backend/tests/auth.test.js
// Run: npm test
import request from "supertest";
import mongoose from "mongoose";
import dotenv  from "dotenv";
dotenv.config({ path: ".env.test" });

// Use a test database
process.env.MONGO_URI = process.env.TEST_MONGO_URI || "mongodb://localhost:27017/kayad-test";
process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV   = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

const { default: app } = await import("../server.js").catch(() => ({ default: null }));

const TEST_USER = {
  name:     "Test User",
  email:    `test-${Date.now()}@gari.test`,
  password: "testpass123",
  role:     "user",
};

let token = "";
let userId = "";

describe("🔑 Authentication", () => {

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("POST /api/auth/register — creates new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(TEST_USER)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user.password).toBeUndefined(); // password not returned

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
      .send({ currentPassword: TEST_USER.password, newPassword: "newpass456" })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

});
