import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { createTimeoutMiddleware, fastTimeout, mediumTimeout, slowTimeout, externalTimeout, uploadTimeout } from "../../middleware/timeout.js";

describe("createTimeoutMiddleware", () => {
  it("creates a middleware function", () => {
    const middleware = createTimeoutMiddleware(5000);
    expect(typeof middleware).toBe("function");
  });

  it("sets request and response timeout", () => {
    const mockReq = { setTimeout: jest.fn() };
    const mockRes = { setTimeout: jest.fn() };
    const mockNext = jest.fn();

    const middleware = createTimeoutMiddleware(5000);
    middleware(mockReq, mockRes, mockNext);

    expect(mockReq.setTimeout).toHaveBeenCalledWith(5000);
    expect(mockRes.setTimeout).toHaveBeenCalledWith(5000);
    expect(mockNext).toHaveBeenCalled();
  });

  it("uses different timeout values", () => {
    const mockReq = { setTimeout: jest.fn() };
    const mockRes = { setTimeout: jest.fn() };
    const mockNext = jest.fn();

    const middleware = createTimeoutMiddleware(10000);
    middleware(mockReq, mockRes, mockNext);

    expect(mockReq.setTimeout).toHaveBeenCalledWith(10000);
  });

  it("handles zero timeout", () => {
    const mockReq = { setTimeout: jest.fn() };
    const mockRes = { setTimeout: jest.fn() };
    const mockNext = jest.fn();

    const middleware = createTimeoutMiddleware(0);
    middleware(mockReq, mockRes, mockNext);

    expect(mockReq.setTimeout).toHaveBeenCalledWith(0);
    expect(mockNext).toHaveBeenCalled();
  });

  it("handles large timeout values", () => {
    const mockReq = { setTimeout: jest.fn() };
    const mockRes = { setTimeout: jest.fn() };
    const mockNext = jest.fn();

    const middleware = createTimeoutMiddleware(300000); // 5 minutes
    middleware(mockReq, mockRes, mockNext);

    expect(mockReq.setTimeout).toHaveBeenCalledWith(300000);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("pre-configured timeout middleware", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = { setTimeout: jest.fn() };
    mockRes = { setTimeout: jest.fn() };
    mockNext = jest.fn();
  });

  it("fastTimeout is 5 seconds", () => {
    fastTimeout(mockReq, mockRes, mockNext);
    expect(mockReq.setTimeout).toHaveBeenCalledWith(5000);
    expect(mockNext).toHaveBeenCalled();
  });

  it("mediumTimeout is 10 seconds", () => {
    mediumTimeout(mockReq, mockRes, mockNext);
    expect(mockReq.setTimeout).toHaveBeenCalledWith(10000);
    expect(mockNext).toHaveBeenCalled();
  });

  it("slowTimeout is 30 seconds", () => {
    slowTimeout(mockReq, mockRes, mockNext);
    expect(mockReq.setTimeout).toHaveBeenCalledWith(30000);
    expect(mockNext).toHaveBeenCalled();
  });

  it("externalTimeout is 15 seconds", () => {
    externalTimeout(mockReq, mockRes, mockNext);
    expect(mockReq.setTimeout).toHaveBeenCalledWith(15000);
    expect(mockNext).toHaveBeenCalled();
  });

  it("uploadTimeout is 2 minutes", () => {
    uploadTimeout(mockReq, mockRes, mockNext);
    expect(mockReq.setTimeout).toHaveBeenCalledWith(120000);
    expect(mockNext).toHaveBeenCalled();
  });

  it("each middleware sets both request and response timeouts", () => {
    uploadTimeout(mockReq, mockRes, mockNext);
    expect(mockReq.setTimeout).toHaveBeenCalledWith(120000);
    expect(mockRes.setTimeout).toHaveBeenCalledWith(120000);
  });
});
