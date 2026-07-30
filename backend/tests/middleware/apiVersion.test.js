import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import apiVersionMiddleware from "../../middleware/apiVersion.js";

describe("apiVersionMiddleware", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      path: "",
      headers: {},
    };
    mockRes = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it("sets apiVersion to 1 for /api/ paths without version", () => {
    mockReq.path = "/api/users";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.apiVersion).toBe(1);
    expect(mockNext).toHaveBeenCalled();
  });

  it("sets apiVersion to 2 for /api/v2/ paths", () => {
    mockReq.path = "/api/v2/users";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.apiVersion).toBe(2);
    expect(mockNext).toHaveBeenCalled();
  });

  it("sets apiVersion to 3 for /api/v3/ paths", () => {
    mockReq.path = "/api/v3/products";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.apiVersion).toBe(3);
    expect(mockNext).toHaveBeenCalled();
  });

  it("does not set apiVersion for non-API paths", () => {
    mockReq.path = "/users";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.apiVersion).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it("does not set apiVersion for root path", () => {
    mockReq.path = "/";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.apiVersion).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it("sets X-API-Version header for versioned paths", () => {
    mockReq.path = "/api/v1/users";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockRes.setHeader).toHaveBeenCalledWith("X-API-Version", "1");
  });

  it("sets X-API-Version header for default API paths", () => {
    mockReq.path = "/api/cars";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockRes.setHeader).toHaveBeenCalledWith("X-API-Version", "1");
  });

  it("does not set header for non-API paths", () => {
    mockReq.path = "/static/file.js";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockRes.setHeader).not.toHaveBeenCalled();
  });

  it("always calls next()", () => {
    mockReq.path = "/api/v5/test";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("handles /api/ with trailing slash", () => {
    mockReq.path = "/api//users";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.apiVersion).toBe(1);
  });

  it("parses large version numbers", () => {
    mockReq.path = "/api/v100/users";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.apiVersion).toBe(100);
  });

  it("handles /api/v0 path (edge case)", () => {
    mockReq.path = "/api/v0/test";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.apiVersion).toBe(0);
  });

  it("does not match /api-x/ paths", () => {
    mockReq.path = "/api-x/v1/users";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.apiVersion).toBeUndefined();
  });

  it("handles deeply nested API paths", () => {
    mockReq.path = "/api/v2/users/123/profile";
    apiVersionMiddleware(mockReq, mockRes, mockNext);
    expect(mockReq.apiVersion).toBe(2);
    expect(mockRes.setHeader).toHaveBeenCalledWith("X-API-Version", "2");
  });
});
