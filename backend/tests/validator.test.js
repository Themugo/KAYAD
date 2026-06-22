// backend/tests/validator.test.js
// ─────────────────────────────────────────────────────────────
// Validator utility tests
// Tests amount validation, phone validation
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from "@jest/globals";
import { isValidAmount, isValidPhone } from "../utils/validator.js";

describe("Validator Utilities", () => {
  describe("isValidAmount", () => {
    it("should accept valid positive amount", () => {
      expect(isValidAmount(5000)).toBe(true);
      expect(isValidAmount(100000)).toBe(true);
    });

    it("should reject negative amount", () => {
      expect(isValidAmount(-100)).toBe(false);
      expect(isValidAmount(-5000)).toBe(false);
    });

    it("should reject zero amount", () => {
      expect(isValidAmount(0)).toBe(false);
    });

    it("should reject amount above anti-fraud cap", () => {
      expect(isValidAmount(100_000_001)).toBe(false);
      expect(isValidAmount(1_000_000_000)).toBe(false);
    });

    it("should accept amount at anti-fraud cap", () => {
      expect(isValidAmount(100_000_000)).toBe(true);
    });

    it("should reject NaN", () => {
      expect(isValidAmount(NaN)).toBe(false);
    });

    it("should handle string numbers", () => {
      expect(isValidAmount("5000")).toBe(true);
      expect(isValidAmount("-100")).toBe(false);
    });

    it("should reject non-numeric strings", () => {
      expect(isValidAmount("invalid")).toBe(false);
      expect(isValidAmount("abc")).toBe(false);
    });
  });

  describe("isValidPhone", () => {
    it("should accept valid Kenya phone numbers", () => {
      expect(isValidPhone("254712345678")).toBe(true);
      expect(isValidPhone("+254712345678")).toBe(true);
      expect(isValidPhone("0712345678")).toBe(true);
    });

    it("should reject invalid phone numbers", () => {
      expect(isValidPhone("123")).toBe(false);
      expect(isValidPhone("invalid")).toBe(false);
      expect(isValidPhone("")).toBe(false);
    });

    it("should reject phone numbers with wrong format", () => {
      expect(isValidPhone("25471234567")).toBe(false); // Too short
      expect(isValidPhone("2547123456789")).toBe(false); // Too long
    });
  });
});
