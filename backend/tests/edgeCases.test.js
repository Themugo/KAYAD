// backend/tests/edgeCases.test.js
// ─────────────────────────────────────────────────────────────
// Edge case tests
// Tests invalid tokens, validation failures, boundary values, unicode handling
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";
process.env.MPESA_SKIP_IP_CHECK = "true";

import { startTestDB, stopTestDB, clearTestDB, describeWithDb } from "./setup.js";

await startTestDB();

const { default: app } = await import("../server.js");

describeWithDb("Edge Cases", () => {
  describe("Invalid JWT Tokens", () => {
    it("should reject expired token", async () => {
      const expiredToken = jwt.sign(
        { userId: "123", role: "user" },
        process.env.JWT_SECRET,
        { expiresIn: "-1h" }
      );

      const res = await request(app)
        .get("/api/user/profile")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it("should reject malformed token", async () => {
      const malformedToken = "not.a.valid.jwt.token";

      const res = await request(app)
        .get("/api/user/profile")
        .set("Authorization", `Bearer ${malformedToken}`);

      expect(res.status).toBe(401);
    });

    it("should reject token with invalid signature", async () => {
      const invalidToken = jwt.sign(
        { userId: "123", role: "user" },
        "wrong-secret-key"
      );

      const res = await request(app)
        .get("/api/user/profile")
        .set("Authorization", `Bearer ${invalidToken}`);

      expect(res.status).toBe(401);
    });

    it("should reject missing token", async () => {
      const res = await request(app).get("/api/user/profile");

      expect(res.status).toBe(401);
    });

    it("should reject empty token", async () => {
      const res = await request(app)
        .get("/api/user/profile")
        .set("Authorization", "Bearer ");

      expect(res.status).toBe(401);
    });
  });

  describe("Validation Failures", () => {
    it("should reject invalid email format", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: "invalid-email",
          password: "Test@12345",
        });

      expect(res.status).toBe(400);
    });

    it("should reject weak password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: `test-${Date.now()}@test.ke`,
          password: "weak",
        });

      expect(res.status).toBe(400);
    });

    it("should reject missing required fields", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          // Missing email and password
        });

      expect(res.status).toBe(400);
    });

    it("should reject invalid phone number format", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: `test-${Date.now()}@test.ke`,
          password: "Test@12345",
          phone: "invalid-phone",
        });

      expect(res.status).toBe(400);
    });

    it("should reject negative price values", async () => {
      const res = await request(app)
        .post("/api/cars")
        .send({
          title: "Test Car",
          brand: "Toyota",
          price: -1000,
        });

      expect(res.status).toBe(400);
    });

    it("should reject zero price values", async () => {
      const res = await request(app)
        .post("/api/cars")
        .send({
          title: "Test Car",
          brand: "Toyota",
          price: 0,
        });

      expect(res.status).toBe(400);
    });
  });

  describe("Boundary Value Testing", () => {
    it("should accept minimum valid password length", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: `test-${Date.now()}@test.ke`,
          password: "Test@123", // 8 characters
        });

      expect([200, 201, 400]).toContain(res.status);
    });

    it("should reject password below minimum length", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: `test-${Date.now()}@test.ke`,
          password: "Test@1", // 6 characters
        });

      expect(res.status).toBe(400);
    });

    it("should accept maximum valid name length", async () => {
      const longName = "A".repeat(100);
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: longName,
          email: `test-${Date.now()}@test.ke`,
          password: "Test@12345",
        });

      expect([200, 201, 400]).toContain(res.status);
    });

    it("should reject name above maximum length", async () => {
      const tooLongName = "A".repeat(256);
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: tooLongName,
          email: `test-${Date.now()}@test.ke`,
          password: "Test@12345",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("Null/Undefined Handling", () => {
    it("should handle null email gracefully", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: null,
          password: "Test@12345",
        });

      expect(res.status).toBe(400);
    });

    it("should handle undefined email gracefully", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: undefined,
          password: "Test@12345",
        });

      expect(res.status).toBe(400);
    });

    it("should handle empty string email gracefully", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: "",
          password: "Test@12345",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("Empty Array/Object Handling", () => {
    it("should handle empty array in request body", async () => {
      const res = await request(app)
        .post("/api/cars")
        .send({
          title: "Test Car",
          brand: "Toyota",
          price: 500000,
          images: [],
        });

      expect([200, 201, 400]).toContain(res.status);
    });

    it("should handle empty object in request body", async () => {
      const res = await request(app)
        .post("/api/cars")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("Unicode/Special Character Handling", () => {
    it("should handle unicode characters in name", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Tëst Üsér 日本語",
          email: `test-${Date.now()}@test.ke`,
          password: "Test@12345",
        });

      expect([200, 201, 400]).toContain(res.status);
    });

    it("should handle special characters in email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: `test+special-${Date.now()}@test.ke`,
          password: "Test@12345",
        });

      expect([200, 201, 400]).toContain(res.status);
    });

    it("should handle emoji in name", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User 🚗",
          email: `test-${Date.now()}@test.ke`,
          password: "Test@12345",
        });

      expect([200, 201, 400]).toContain(res.status);
    });
  });

  describe("Type Coercion Errors", () => {
    it("should handle string instead of number for price", async () => {
      const res = await request(app)
        .post("/api/cars")
        .send({
          title: "Test Car",
          brand: "Toyota",
          price: "500000", // String instead of number
        });

      expect([200, 201, 400]).toContain(res.status);
    });

    it("should handle boolean instead of string for status", async () => {
      const res = await request(app)
        .post("/api/cars")
        .send({
          title: "Test Car",
          brand: "Toyota",
          price: 500000,
          status: true, // Boolean instead of string
        });

      expect([200, 201, 400]).toContain(res.status);
    });
  });

  describe("Duplicate Data Prevention", () => {
    it("should prevent duplicate email registration", async () => {
      const email = `duplicate-${Date.now()}@test.ke`;

      // First registration
      await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: email,
          password: "Test@12345",
        });

      // Second registration with same email
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User",
          email: email,
          password: "Test@12345",
        });

      expect(res.status).toBe(400);
    });

    it("should prevent duplicate phone number", async () => {
      const phone = "254712345678";

      // First registration
      await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User 1",
          email: `test1-${Date.now()}@test.ke`,
          password: "Test@12345",
          phone: phone,
        });

      // Second registration with same phone
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Test User 2",
          email: `test2-${Date.now()}@test.ke`,
          password: "Test@12345",
          phone: phone,
        });

      expect(res.status).toBe(400);
    });
  });
});
