import { describe, it, expect } from "@jest/globals";
import { AppError } from "../../utils/AppError.js";

describe("AppError", () => {
  it("creates error with message and default status 500", () => {
    const error = new AppError("Something went wrong");
    expect(error.message).toBe("Something went wrong");
    expect(error.statusCode).toBe(500);
    expect(error.isOperational).toBe(true);
  });

  it("creates error with custom status code", () => {
    const error = new AppError("Not found", 404);
    expect(error.statusCode).toBe(404);
  });

  it("includes details when provided", () => {
    const error = new AppError("Validation failed", 400, { field: "email" });
    expect(error.details).toEqual({ field: "email" });
  });

  it("is an instance of Error", () => {
    const error = new AppError("Test");
    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });

  it("has a stack trace", () => {
    const error = new AppError("Test");
    expect(error.stack).toBeDefined();
  });
});

describe("AppError static methods", () => {
  describe("badRequest", () => {
    it("creates 400 error", () => {
      const error = AppError.badRequest("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Invalid input");
    });

    it("accepts default message", () => {
      const error = AppError.badRequest();
      expect(error.message).toBe("Bad request");
    });

    it("accepts details", () => {
      const error = AppError.badRequest("Invalid", { field: "name" });
      expect(error.details).toEqual({ field: "name" });
    });
  });

  describe("unauthorized", () => {
    it("creates 401 error", () => {
      const error = AppError.unauthorized("Token expired");
      expect(error.statusCode).toBe(401);
    });
  });

  describe("forbidden", () => {
    it("creates 403 error", () => {
      const error = AppError.forbidden("Access denied");
      expect(error.statusCode).toBe(403);
    });
  });

  describe("notFound", () => {
    it("creates 404 error", () => {
      const error = AppError.notFound("Vehicle not found");
      expect(error.statusCode).toBe(404);
    });
  });

  describe("conflict", () => {
    it("creates 409 error", () => {
      const error = AppError.conflict("Duplicate entry");
      expect(error.statusCode).toBe(409);
    });
  });

  describe("tooMany", () => {
    it("creates 429 error", () => {
      const error = AppError.tooMany("Rate limit exceeded");
      expect(error.statusCode).toBe(429);
    });
  });

  describe("internal", () => {
    it("creates 500 error", () => {
      const error = AppError.internal("Database error");
      expect(error.statusCode).toBe(500);
    });
  });
});

describe("AppError toJSON", () => {
  it("serializes to JSON with success false", () => {
    const error = new AppError("Test error", 400);
    const json = error.toJSON();
    expect(json.success).toBe(false);
    expect(json.message).toBe("Test error");
  });

  it("includes details when present", () => {
    const error = new AppError("Test", 400, { key: "value" });
    const json = error.toJSON();
    expect(json.details).toEqual({ key: "value" });
  });

  it("excludes details when null", () => {
    const error = new AppError("Test", 400);
    const json = error.toJSON();
    expect(json.details).toBeUndefined();
  });

  it("includes stack in non-production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const error = new AppError("Test");
    const json = error.toJSON();
    expect(json.stack).toBeDefined();
    process.env.NODE_ENV = originalEnv;
  });
});
