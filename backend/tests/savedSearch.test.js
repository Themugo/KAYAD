// backend/tests/savedSearch.test.js
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB } from "./setup.js";

await startTestDB();

const { default: app } = await import("../server.js");

describe("Saved Search Routes", () => {
  let token, searchId;

  beforeAll(async () => {
    const ts = Date.now();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Search User", email: `search-${ts}@test.ke`, password: "Test@12345" });
    token = res.body.token;
  });

  afterAll(async () => {
    await clearTestDB();
  });

  it("POST /api/saved-searches — requires auth", async () => {
    await request(app)
      .post("/api/saved-searches")
      .send({ name: "My Search", filters: { brand: "Toyota" } })
      .expect(401);
  });

  it("POST /api/saved-searches — creates a saved search", async () => {
    const res = await request(app)
      .post("/api/saved-searches")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Toyota Search", filters: { brand: "Toyota", maxPrice: 1000000 } })
      .expect(200);
    expect(res.body.success).toBe(true);
    searchId = res.body.search?._id ?? res.body.data?._id;
    expect(searchId).toBeTruthy();
  });

  it("GET /api/saved-searches — lists saved searches", async () => {
    const res = await request(app).get("/api/saved-searches").set("Authorization", `Bearer ${token}`).expect(200);
    expect(res.body.success).toBe(true);
    const list = res.body.searches ?? res.body.data ?? [];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("PUT /api/saved-searches/:id — updates saved search", async () => {
    if (!searchId) return;
    const res = await request(app)
      .put(`/api/saved-searches/${searchId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Search", filters: { brand: "Nissan" } })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /api/saved-searches/:id — deletes saved search", async () => {
    if (!searchId) return;
    const res = await request(app)
      .delete(`/api/saved-searches/${searchId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});
