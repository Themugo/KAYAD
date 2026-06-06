import { describe, it, expect, beforeAll } from "@jest/globals";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../utils/generateToken.js";

const TEST_SECRET = "test-jwt-secret-at-least-32-chars!!";
beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.REFRESH_TOKEN_SECRET = TEST_SECRET;
});

describe("generateAccessToken", () => {
  it("creates a valid JWT with id, role, and tokenVersion", () => {
    const user = { _id: "123abc", role: "admin", tokenVersion: 1 };
    const token = generateAccessToken(user);
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.id).toBe("123abc");
    expect(decoded.role).toBe("admin");
    expect(decoded.tokenVersion).toBe(1);
  });

  it("falls back to user.id when _id missing", () => {
    const user = { id: "456def", role: "user", tokenVersion: 0 };
    const token = generateAccessToken(user);
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.id).toBe("456def");
  });

  it("defaults role and tokenVersion when missing", () => {
    const user = { _id: "789ghi" };
    const token = generateAccessToken(user);
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.role).toBe("user");
    expect(decoded.tokenVersion).toBe(0);
  });
});

describe("generateRefreshToken", () => {
  it("creates a longer-lived token with tokenVersion", () => {
    const user = { _id: "abc123", tokenVersion: 2 };
    const token = generateRefreshToken(user);
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.id).toBe("abc123");
    expect(decoded.tokenVersion).toBe(2);
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

  it("accepts custom secret", () => {
    const customSecret = "custom-secret";
    const token = jwt.sign({ id: "y" }, customSecret);
    const decoded = verifyToken(token, customSecret);
    expect(decoded.id).toBe("y");
  });
});
