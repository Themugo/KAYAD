// backend/tests/validateId.test.js
// ─────────────────────────────────────────────────────────────
// Validate ID utility tests
// Tests ObjectId validation for controllers
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, jest } from "@jest/globals";
import { isValidId, requireValidId } from "../utils/validateId.js";

describe("Validate ID Utilities", () => {
  describe("isValidId", () => {
    it("should accept valid ObjectId", () => {
      const validId = "507f1f77bcf86cd799439011";
      expect(isValidId(validId)).toBe(true);
    });

    it("should accept valid ObjectId with lowercase", () => {
      const validId = "507f1f77bcf86cd799439011";
      expect(isValidId(validId)).toBe(true);
    });

    it("should accept valid ObjectId with uppercase", () => {
      const validId = "507F1F77BCF86CD799439011";
      expect(isValidId(validId)).toBe(true);
    });

    it("should accept valid ObjectId with mixed case", () => {
      const validId = "507f1F77BcF86Cd799439011";
      expect(isValidId(validId)).toBe(true);
    });

    it("should reject invalid ObjectId (wrong length)", () => {
      const invalidId = "507f1f77bcf86cd7994390";
      expect(isValidId(invalidId)).toBe(false);
    });

    it("should reject invalid ObjectId (too long)", () => {
      const invalidId = "507f1f77bcf86cd7994390111";
      expect(isValidId(invalidId)).toBe(false);
    });

    it("should reject invalid ObjectId (non-hex characters)", () => {
      const invalidId = "507f1f77bcf86cd7994390g1";
      expect(isValidId(invalidId)).toBe(false);
    });

    it("should reject non-string values", () => {
      expect(isValidId(123)).toBe(false);
      expect(isValidId(null)).toBe(false);
      expect(isValidId(undefined)).toBe(false);
      expect(isValidId({})).toBe(false);
      expect(isValidId([])).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidId("")).toBe(false);
    });

    it("should reject random string", () => {
      expect(isValidId("random-string")).toBe(false);
    });
  });

  describe("requireValidId", () => {
    it("should return false for valid ID", () => {
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const validId = "507f1f77bcf86cd799439011";
      
      const result = requireValidId(req, res, validId);
      
      expect(result).toBe(false);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("should return true and send 400 for invalid ID", () => {
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const invalidId = "invalid-id";
      
      const result = requireValidId(req, res, invalidId);
      
      expect(result).toBe(true);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid ID format" });
    });

    it("should use custom label in error message", () => {
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const invalidId = "invalid-id";
      
      const result = requireValidId(req, res, invalidId, "Car ID");
      
      expect(result).toBe(true);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid Car ID format" });
    });

    it("should handle null ID", () => {
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      
      const result = requireValidId(req, res, null);
      
      expect(result).toBe(true);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid ID format" });
    });

    it("should handle undefined ID", () => {
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      
      const result = requireValidId(req, res, undefined);
      
      expect(result).toBe(true);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid ID format" });
    });
  });
});
