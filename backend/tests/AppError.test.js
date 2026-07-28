import { describe, it, expect } from "@jest/globals";
import { AppError } from "../utils/AppError.js";

describe("AppError", () => {
  it("creates a basic error with defaults", () => {
    const err = new AppError("Something broke");
    expect(err.message).toBe("Something broke");
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
    expect(err.details).toBeNull();
  });

  it("creates error with custom status code and details", () => {
    const err = new AppError("Not found", 404, { resource: "car" });
    expect(err.message).toBe("Not found");
    expect(err.statusCode).toBe(404);
    expect(err.details).toEqual({ resource: "car" });
  });

  describe("static factories", () => {
    it("badRequest — 400", () => {
      const err = AppError.badRequest("Invalid input");
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe("Invalid input");
    });

    it("unauthorized — 401", () => {
      const err = AppError.unauthorized("Login required");
      expect(err.statusCode).toBe(401);
    });

    it("forbidden — 403", () => {
      const err = AppError.forbidden("No access");
      expect(err.statusCode).toBe(403);
    });

    it("notFound — 404", () => {
      const err = AppError.notFound("Car not found");
      expect(err.statusCode).toBe(404);
    });

    it("conflict — 409", () => {
      const err = AppError.conflict("Email exists");
      expect(err.statusCode).toBe(409);
    });

    it("tooMany — 429", () => {
      const err = AppError.tooMany("Slow down");
      expect(err.statusCode).toBe(429);
    });

    it("internal — 500", () => {
      const err = AppError.internal("DB error");
      expect(err.statusCode).toBe(500);
    });
  });

  describe("toJSON", () => {
    it("returns success false with message", () => {
      const err = AppError.badRequest("Bad");
      const json = err.toJSON();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Bad");
    });

    it("includes details when present", () => {
      const err = AppError.badRequest("Bad", { field: "email" });
      const json = err.toJSON();
      expect(json.details).toEqual({ field: "email" });
    });

    it("omits details when null", () => {
      const err = AppError.badRequest("Bad");
      const json = err.toJSON();
      expect(json.details).toBeUndefined();
    });
  });
});
