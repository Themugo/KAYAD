import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { isValidId, requireValidId } from "../../utils/validateId.js";

describe("isValidId", () => {
  it("returns true for valid UUID v4", () => {
    expect(isValidId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("returns true for valid UUID (lowercase)", () => {
    expect(isValidId("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")).toBe(true);
  });

  it("returns true for valid UUID (uppercase)", () => {
    expect(isValidId("A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11")).toBe(true);
  });

  it("returns false for invalid UUID (too short)", () => {
    expect(isValidId("550e8400-e29b-41d4-a716")).toBe(false);
  });

  it("returns false for invalid UUID (no hyphens)", () => {
    expect(isValidId("550e8400e29b41d4a716446655440000")).toBe(false);
  });

  it("returns false for invalid UUID (wrong characters)", () => {
    expect(isValidId("550e8400-e29b-41d4-a716-44665544000g")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isValidId(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isValidId(undefined)).toBe(false);
  });

  it("returns false for number", () => {
    expect(isValidId(123456)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidId("")).toBe(false);
  });

  it("returns false for non-string input", () => {
    expect(isValidId({ id: "test" })).toBe(false);
  });

  it("returns false for array", () => {
    expect(isValidId(["test"])).toBe(false);
  });
});

describe("requireValidId", () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it("returns false and does not respond for valid ID", () => {
    const result = requireValidId(mockReq, mockRes, "550e8400-e29b-41d4-a716-446655440000");
    expect(result).toBe(false);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns true and responds with 400 for invalid ID", () => {
    const result = requireValidId(mockReq, mockRes, "invalid-id");
    expect(result).toBe(true);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid ID format",
    });
  });

  it("returns true and responds with 400 for null ID", () => {
    const result = requireValidId(mockReq, mockRes, null);
    expect(result).toBe(true);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("uses custom label in error message", () => {
    requireValidId(mockReq, mockRes, "invalid", "User");
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid User format",
    });
  });

  it("returns true and responds with 400 for undefined ID", () => {
    const result = requireValidId(mockReq, mockRes, undefined);
    expect(result).toBe(true);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("returns true and responds with 400 for empty string", () => {
    const result = requireValidId(mockReq, mockRes, "");
    expect(result).toBe(true);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it("returns false for valid UUID with default label", () => {
    const result = requireValidId(mockReq, mockRes, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    expect(result).toBe(false);
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
