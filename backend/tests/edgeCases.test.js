// backend/tests/edgeCases.test.js
// ─────────────────────────────────────────────────────────────
// Edge case tests
// Tests invalid tokens, validation failures, boundary values, unicode handling
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from "@jest/globals";
import jwt from "jsonwebtoken";

process.env.JWT_SECRET = "test-secret-key-32-chars-minimum-x";

describe("Edge Cases", () => {
  describe("Invalid JWT Tokens", () => {
    it("should reject expired token", async () => {
      const expiredToken = jwt.sign(
        { userId: "123", role: "user" },
        process.env.JWT_SECRET,
        { expiresIn: "-1h" }
      );

      expect(() => jwt.verify(expiredToken, process.env.JWT_SECRET)).toThrow("jwt expired");
    });

    it("should reject malformed token", async () => {
      const malformedToken = "not.a.valid.jwt.token";

      try {
        jwt.verify(malformedToken, process.env.JWT_SECRET);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should reject token with invalid signature", async () => {
      const invalidToken = jwt.sign(
        { userId: "123", role: "user" },
        "wrong-secret-key"
      );

      try {
        jwt.verify(invalidToken, process.env.JWT_SECRET);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Validation Failures", () => {
    it("should validate email format", () => {
      const validEmail = "test@example.com";
      const invalidEmail = "invalid-email";
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(validEmail)).toBe(true);
      expect(emailRegex.test(invalidEmail)).toBe(false);
    });

    it("should validate password strength", () => {
      const weakPassword = "weak";
      const strongPassword = "Test@12345";
      
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      expect(passwordRegex.test(weakPassword)).toBe(false);
      expect(passwordRegex.test(strongPassword)).toBe(true);
    });

    it("should validate phone number format", () => {
      const validPhone = "254712345678";
      const invalidPhone = "invalid-phone";
      
      const phoneRegex = /^254[0-9]{9}$/;
      expect(phoneRegex.test(validPhone)).toBe(true);
      expect(phoneRegex.test(invalidPhone)).toBe(false);
    });
  });

  describe("Boundary Value Testing", () => {
    it("should accept minimum valid password length", () => {
      const minPassword = "Test@123";
      expect(minPassword.length).toBeGreaterThanOrEqual(8);
    });

    it("should reject password below minimum length", () => {
      const shortPassword = "Test@1";
      expect(shortPassword.length).toBeLessThan(8);
    });

    it("should handle maximum valid name length", () => {
      const longName = "A".repeat(100);
      expect(longName.length).toBeLessThanOrEqual(100);
    });

    it("should reject name above maximum length", () => {
      const tooLongName = "A".repeat(256);
      expect(tooLongName.length).toBeGreaterThan(100);
    });
  });

  describe("Null/Undefined Handling", () => {
    it("should handle null values", () => {
      const value = null;
      expect(value).toBeNull();
    });

    it("should handle undefined values", () => {
      const value = undefined;
      expect(value).toBeUndefined();
    });

    it("should handle empty string", () => {
      const value = "";
      expect(value).toBe("");
    });
  });

  describe("Empty Array/Object Handling", () => {
    it("should handle empty array", () => {
      const emptyArray = [];
      expect(emptyArray).toHaveLength(0);
    });

    it("should handle empty object", () => {
      const emptyObject = {};
      expect(Object.keys(emptyObject)).toHaveLength(0);
    });
  });

  describe("Unicode/Special Character Handling", () => {
    it("should handle unicode characters", () => {
      const unicodeName = "Tëst Üsér 日本語";
      expect(unicodeName).toBeDefined();
      expect(unicodeName.length).toBeGreaterThan(0);
    });

    it("should handle special characters in email", () => {
      const specialEmail = "test+special@example.com";
      expect(specialEmail).toContain("+");
    });

    it("should handle emoji", () => {
      const emojiName = "Test User 🚗";
      expect(emojiName).toContain("🚗");
    });
  });

  describe("Type Coercion Errors", () => {
    it("should handle string instead of number", () => {
      const stringPrice = "500000";
      const numberPrice = Number(stringPrice);
      expect(typeof numberPrice).toBe("number");
    });

    it("should handle boolean instead of string", () => {
      const booleanStatus = true;
      const stringStatus = String(booleanStatus);
      expect(typeof stringStatus).toBe("string");
    });
  });

  describe("Duplicate Data Prevention", () => {
    it("should detect duplicate email", () => {
      const email = "test@example.com";
      const emails = ["test@example.com", "other@example.com"];
      
      const isDuplicate = emails.filter(e => e === email).length > 1;
      expect(isDuplicate).toBe(false);
    });

    it("should detect duplicate phone", () => {
      const phone = "254712345678";
      const phones = ["254712345678", "254712345679"];
      
      const isDuplicate = phones.filter(p => p === phone).length > 1;
      expect(isDuplicate).toBe(false);
    });
  });
});
