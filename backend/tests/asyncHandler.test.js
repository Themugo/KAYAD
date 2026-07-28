// backend/tests/asyncHandler.test.js
// ─────────────────────────────────────────────────────────────
// AsyncHandler middleware tests
// Tests async error handling wrapper
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, jest } from "@jest/globals";
import asyncHandler from "../middleware/asyncHandler.js";

describe("AsyncHandler Middleware", () => {
  it("should call the handler function successfully", async () => {
    const handler = jest.fn().mockResolvedValue("success");
    const req = {};
    const res = {};
    const next = jest.fn();

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("should catch errors and pass to next", async () => {
    const error = new Error("Test error");
    const handler = jest.fn().mockRejectedValue(error);
    const req = {};
    const res = {};
    const next = jest.fn();

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it("should set default statusCode 500 on error", async () => {
    const error = new Error("Test error");
    const handler = jest.fn().mockRejectedValue(error);
    const req = {};
    const res = {};
    const next = jest.fn();

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(error.statusCode).toBe(500);
  });

  it("should preserve existing statusCode on error", async () => {
    const error = new Error("Test error");
    error.statusCode = 404;
    const handler = jest.fn().mockRejectedValue(error);
    const req = {};
    const res = {};
    const next = jest.fn();

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(error.statusCode).toBe(404);
  });

  it("should set requestId if not present", async () => {
    const error = new Error("Test error");
    const handler = jest.fn().mockRejectedValue(error);
    const req = {};
    const res = {};
    const next = jest.fn();

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(req.requestId).toBeDefined();
  });

  it("should preserve existing requestId", async () => {
    const error = new Error("Test error");
    const handler = jest.fn().mockRejectedValue(error);
    const req = { requestId: "existing-id" };
    const res = {};
    const next = jest.fn();

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(req.requestId).toBe("existing-id");
  });

  it("should use custom label", async () => {
    const handler = jest.fn().mockResolvedValue("success");
    const req = {};
    const res = {};
    const next = jest.fn();

    const wrapped = asyncHandler(handler, "CUSTOM_HANDLER");
    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
  });

  it("should handle synchronous functions", async () => {
    const handler = jest.fn().mockReturnValue("sync-success");
    const req = {};
    const res = {};
    const next = jest.fn();

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("should handle synchronous errors", async () => {
    const error = new Error("Sync error");
    const handler = jest.fn().mockImplementation(() => {
      throw error;
    });
    const req = {};
    const res = {};
    const next = jest.fn();

    const wrapped = asyncHandler(handler);
    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
