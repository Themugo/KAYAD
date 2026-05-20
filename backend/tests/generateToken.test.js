import { describe, it, expect, beforeAll } from "@jest/globals";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  refreshAccessToken,
} from "../utils/generateToken.js";

const TEST_SECRET = "test-jwt-secret-at-least-32-chars!!";
beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

describe("generateAccessToken", () => {
  it("creates a valid JWT with id and role", () => {
    const user = { _id: "123abc", role: "admin" };
    const token = generateAccessToken(user);
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.id).toBe("123abc");
    expect(decoded.role).toBe("admin");
  });

  it("falls back to user.id when _id missing", () => {
    const user = { id: "456def", role: "user" };
    const token = generateAccessToken(user);
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.id).toBe("456def");
    expect(decoded.role).toBe("user");
  });

  it("defaults role to user", () => {
    const user = { _id: "789ghi" };
    const token = generateAccessToken(user);
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.role).toBe("user");
  });
});

describe("generateRefreshToken", () => {
  it("creates a longer-lived token", () => {
    const user = { _id: "abc123" };
    const token = generateRefreshToken(user);
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.id).toBe("abc123");
  });
});

describe("verifyToken", () => {
  it("returns decoded payload for valid token", () => {
    const token = jwt.sign({ id: "x" }, TEST_SECRET);
    const decoded = verifyToken(token);
    expect(decoded.id).toBe("x");
  });

  it("returns null for invalid token", () => {
    const decoded = verifyToken("bad-token");
    expect(decoded).toBeNull();
  });

  it("returns null for expired token", () => {
    const token = jwt.sign({ id: "x" }, TEST_SECRET, { expiresIn: "0s" });
    const decoded = verifyToken(token);
    expect(decoded).toBeNull();
  });
});

describe("refreshAccessToken", () => {
  it("returns a new access token from refresh token", () => {
    const refresh = jwt.sign({ id: "user1" }, TEST_SECRET, { expiresIn: "7d" });
    const newToken = refreshAccessToken(refresh);
    expect(typeof newToken).toBe("string");
    const decoded = jwt.verify(newToken, TEST_SECRET);
    expect(decoded.id).toBe("user1");
  });

  it("returns null for invalid refresh token", () => {
    expect(refreshAccessToken("bad")).toBeNull();
  });
});
