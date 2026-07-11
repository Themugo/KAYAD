import { describe, it, expect } from "@jest/globals";
import { success, error, validationError, notFound, unauthorized } from "../../utils/response.js";

// Helper to capture the response object
const captureResponse = () => {
  let captured = {};
  const mockRes = {
    status: (code) => {
      captured.statusCode = code;
      return mockRes;
    },
    json: (data) => {
      captured.jsonData = data;
      return mockRes;
    },
  };
  return { mockRes, getCaptured: () => captured };
};

describe("success", () => {
  it("returns 200 with data", () => {
    const { mockRes, getCaptured } = captureResponse();
    success(mockRes, { id: 1 });
    const captured = getCaptured();
    expect(captured.statusCode).toBe(200);
    expect(captured.jsonData).toEqual({
      success: true,
      message: "Success",
      data: { id: 1 },
    });
  });

  it("includes custom message", () => {
    const { mockRes, getCaptured } = captureResponse();
    success(mockRes, null, "Created successfully");
    expect(getCaptured().jsonData.message).toBe("Created successfully");
  });

  it("includes meta when provided", () => {
    const { mockRes, getCaptured } = captureResponse();
    success(mockRes, [1, 2], "Success", { total: 2 });
    expect(getCaptured().jsonData).toEqual({
      success: true,
      message: "Success",
      data: [1, 2],
      meta: { total: 2 },
    });
  });

  it("excludes meta when empty", () => {
    const { mockRes, getCaptured } = captureResponse();
    success(mockRes, [1, 2], "Success", {});
    expect(getCaptured().jsonData.meta).toBeUndefined();
  });
});

describe("error", () => {
  it("returns 500 with default message", () => {
    const { mockRes, getCaptured } = captureResponse();
    error(mockRes);
    const captured = getCaptured();
    expect(captured.statusCode).toBe(500);
    expect(captured.jsonData).toEqual({
      success: false,
      message: "Error",
    });
  });

  it("returns custom status code", () => {
    const { mockRes, getCaptured } = captureResponse();
    error(mockRes, "Bad request", 400);
    expect(getCaptured().statusCode).toBe(400);
  });

  it("includes details when provided", () => {
    const { mockRes, getCaptured } = captureResponse();
    error(mockRes, "Validation failed", 400, { field: "email" });
    expect(getCaptured().jsonData).toEqual({
      success: false,
      message: "Validation failed",
      details: { field: "email" },
    });
  });
});

describe("validationError", () => {
  it("returns 400 with errors array", () => {
    const { mockRes, getCaptured } = captureResponse();
    const errors = [{ field: "email", message: "Invalid email" }];
    validationError(mockRes, errors);
    const captured = getCaptured();
    expect(captured.statusCode).toBe(400);
    expect(captured.jsonData).toEqual({
      success: false,
      message: "Validation failed",
      errors,
    });
  });
});

describe("notFound", () => {
  it("returns 404 with default message", () => {
    const { mockRes, getCaptured } = captureResponse();
    notFound(mockRes);
    const captured = getCaptured();
    expect(captured.statusCode).toBe(404);
    expect(captured.jsonData).toEqual({
      success: false,
      message: "Resource not found",
    });
  });

  it("accepts custom message", () => {
    const { mockRes, getCaptured } = captureResponse();
    notFound(mockRes, "Vehicle not found");
    expect(getCaptured().jsonData).toEqual({
      success: false,
      message: "Vehicle not found",
    });
  });
});

describe("unauthorized", () => {
  it("returns 401 with default message", () => {
    const { mockRes, getCaptured } = captureResponse();
    unauthorized(mockRes);
    const captured = getCaptured();
    expect(captured.statusCode).toBe(401);
    expect(captured.jsonData).toEqual({
      success: false,
      message: "Unauthorized",
    });
  });

  it("accepts custom message", () => {
    const { mockRes, getCaptured } = captureResponse();
    unauthorized(mockRes, "Token expired");
    expect(getCaptured().jsonData).toEqual({
      success: false,
      message: "Token expired",
    });
  });
});
