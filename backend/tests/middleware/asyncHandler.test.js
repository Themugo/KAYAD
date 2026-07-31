import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import asyncHandler from "../../middleware/asyncHandler.js";

describe("asyncHandler", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      requestId: undefined,
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it("calls the wrapped function with req, res, next", async () => {
    const mockFn = jest.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
  });

  it("does not call next on success", async () => {
    const mockFn = jest.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it("calls next with error on failure", async () => {
    const testError = new Error("Test error");
    const mockFn = jest.fn().mockRejectedValue(testError);
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(testError);
  });

  it("sets requestId on error if not already set", async () => {
    const testError = new Error("Test error");
    const mockFn = jest.fn().mockRejectedValue(testError);
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(mockReq.requestId).toBeDefined();
    expect(mockNext).toHaveBeenCalledWith(testError);
  });

  it("preserves existing requestId on error", async () => {
    const existingId = "existing-request-id";
    mockReq.requestId = existingId;
    const testError = new Error("Test error");
    const mockFn = jest.fn().mockRejectedValue(testError);
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(mockReq.requestId).toBe(existingId);
  });

  it("sets statusCode 500 on error if not already set", async () => {
    const testError = new Error("Test error");
    const mockFn = jest.fn().mockRejectedValue(testError);
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(testError.statusCode).toBe(500);
  });

  it("preserves existing statusCode on error", async () => {
    const testError = new Error("Test error");
    testError.statusCode = 400;
    const mockFn = jest.fn().mockRejectedValue(testError);
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(testError.statusCode).toBe(400);
  });

  it("handles async function that returns a promise", async () => {
    const mockFn = jest.fn().mockImplementation(() => Promise.resolve("result"));
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(mockFn).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("handles synchronous function errors wrapped as rejected promise", async () => {
    const testError = new Error("Sync error");
    const mockFn = jest.fn().mockImplementation(() => {
      throw testError;
    });
    const handler = asyncHandler(mockFn);

    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(testError);
  });

  it("accepts optional label parameter", async () => {
    const testError = new Error("Test error");
    const mockFn = jest.fn().mockRejectedValue(testError);
    const handler = asyncHandler(mockFn, "MY_HANDLER");

    await handler(mockReq, mockRes, mockNext);

    expect(mockFn).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });
});
