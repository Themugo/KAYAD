// backend/tests/notFound.test.js
// ─────────────────────────────────────────────────────────────
// NotFound middleware tests
// Tests 404 route not found handler
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, jest } from "@jest/globals";
import notFound from "../middleware/notFound.js";

describe("NotFound Middleware", () => {
  it("should return 404 status with error message", () => {
    const req = { originalUrl: "/api/test", method: "GET", requestId: "test-123", user: { id: "user-123" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    notFound(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Route not found: /api/test",
      path: "/api/test",
      method: "GET",
    });
  });

  it("should handle request without user", () => {
    const req = { originalUrl: "/api/test", method: "POST", requestId: "test-123" };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    notFound(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Route not found: /api/test",
      path: "/api/test",
      method: "POST",
    });
  });

  it("should handle request without requestId", () => {
    const req = { originalUrl: "/api/test", method: "DELETE", user: { id: "user-123" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    notFound(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Route not found: /api/test",
      path: "/api/test",
      method: "DELETE",
    });
  });

  it("should hide path and method in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const req = { originalUrl: "/api/test", method: "GET", requestId: "test-123", user: { id: "user-123" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    notFound(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Route not found: /api/test",
    });

    process.env.NODE_ENV = originalEnv;
  });

  it("should not call next", () => {
    const req = { originalUrl: "/api/test", method: "GET", requestId: "test-123" };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    notFound(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});
