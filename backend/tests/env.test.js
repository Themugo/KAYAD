import { describe, it, expect, jest } from "@jest/globals";
import { getEnv, validateEnv } from "../utils/env.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getEnv", () => {
  it("returns the value when key exists", () => {
    process.env.TEST_KEY = "hello";
    expect(getEnv("TEST_KEY")).toBe("hello");
  });

  it("throws for missing required key with no default", () => {
    expect(() => getEnv("MISSING_KEY")).toThrow("Missing env variable");
  });

  it("returns default when required is false", () => {
    expect(getEnv("MISSING_KEY", { required: false, defaultValue: "fallback" })).toBe("fallback");
  });

  it("returns null default when not required but no default given", () => {
    expect(getEnv("MISSING_KEY", { required: false })).toBeNull();
  });

  it("parses number type", () => {
    process.env.NUM_KEY = "42";
    expect(getEnv("NUM_KEY", { type: "number" })).toBe(42);
  });

  it("throws for invalid number", () => {
    process.env.NUM_KEY = "not-a-number";
    expect(() => getEnv("NUM_KEY", { type: "number" })).toThrow("must be a number");
  });

  it("parses boolean type (true string)", () => {
    process.env.BOOL_KEY = "true";
    expect(getEnv("BOOL_KEY", { type: "boolean" })).toBe(true);
  });

  it("parses boolean type (false string)", () => {
    process.env.BOOL_KEY = "false";
    expect(getEnv("BOOL_KEY", { type: "boolean" })).toBe(false);
  });
});

describe("validateEnv", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.MONGO_URI = "mongodb://localhost/test";
    process.env.NODE_ENV = "development";
  });

  it("passes when required vars are set", () => {
    expect(() => validateEnv({ silent: true })).not.toThrow();
  });

  it("throws when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET;
    expect(() => validateEnv({ silent: true })).toThrow("Environment validation failed");
  });

  it("throws when MONGO_URI is missing", () => {
    delete process.env.MONGO_URI;
    expect(() => validateEnv({ silent: true })).toThrow("Environment validation failed");
  });

  it("requires FRONTEND_URL in production", () => {
    process.env.NODE_ENV = "production";
    expect(() => validateEnv({ silent: true })).toThrow("Environment validation failed");
  });

  it("passes in production when FRONTEND_URL is set", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://www.kayad.space";
    expect(() => validateEnv({ silent: true })).not.toThrow();
  });
});
