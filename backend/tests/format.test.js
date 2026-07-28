// backend/tests/format.test.js
// ─────────────────────────────────────────────────────────────
// Format utility tests
// Tests phone formatting, currency formatting, date formatting, time ago
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from "@jest/globals";
import { formatPhone, formatCurrency, formatDate, timeAgo } from "../utils/format.js";

describe("Format Utilities", () => {
  describe("formatPhone", () => {
    it("should format phone starting with 0", () => {
      expect(formatPhone("0712345678")).toBe("254712345678");
      expect(formatPhone("0112345678")).toBe("254112345678");
    });

    it("should format phone starting with +254", () => {
      expect(formatPhone("+254712345678")).toBe("254712345678");
      expect(formatPhone("+254112345678")).toBe("254112345678");
    });

    it("should return phone already in correct format", () => {
      expect(formatPhone("254712345678")).toBe("254712345678");
      expect(formatPhone("254112345678")).toBe("254112345678");
    });

    it("should remove spaces from phone", () => {
      expect(formatPhone("0712 345 678")).toBe("254712345678");
      expect(formatPhone("254 712 345 678")).toBe("254712345678");
    });

    it("should return null for invalid phone", () => {
      expect(formatPhone("123")).toBe(null);
      expect(formatPhone("invalid")).toBe(null);
      expect(formatPhone("")).toBe(null);
      expect(formatPhone(null)).toBe(null);
    });

    it("should reject phone with wrong prefix", () => {
      expect(formatPhone("123712345678")).toBe(null);
      expect(formatPhone("254812345678")).toBe(null);
    });

    it("should reject phone with wrong length", () => {
      expect(formatPhone("25471234567")).toBe(null);
      expect(formatPhone("2547123456789")).toBe(null);
    });
  });

  describe("formatCurrency", () => {
    it("should format valid amount", () => {
      expect(formatCurrency(5000)).toBe("KES 5,000.00");
      expect(formatCurrency(1000000)).toBe("KES 1,000,000.00");
    });

    it("should format decimal amounts", () => {
      expect(formatCurrency(5000.50)).toBe("KES 5,000.50");
      expect(formatCurrency(1000.25)).toBe("KES 1,000.25");
    });

    it("should handle zero", () => {
      expect(formatCurrency(0)).toBe("KES 0.00");
    });

    it("should handle negative amounts", () => {
      expect(formatCurrency(-100)).toBe("KES -100.00");
    });

    it("should handle NaN", () => {
      expect(formatCurrency(NaN)).toBe("KES 0.00");
    });

    it("should handle string numbers", () => {
      expect(formatCurrency("5000")).toBe("KES 5,000.00");
    });
  });

  describe("formatDate", () => {
    it("should format valid date", () => {
      const date = new Date("2024-01-15T10:30:00");
      const formatted = formatDate(date);
      expect(formatted).toBeDefined();
      expect(formatted).toContain("2024");
    });

    it("should return null for null date", () => {
      expect(formatDate(null)).toBe(null);
    });

    it("should return null for undefined date", () => {
      expect(formatDate(undefined)).toBe(null);
    });

    it("should handle date string", () => {
      const formatted = formatDate("2024-01-15T10:30:00");
      expect(formatted).toBeDefined();
    });
  });

  describe("timeAgo", () => {
    it("should return 'just now' for recent time", () => {
      const now = new Date();
      expect(timeAgo(now)).toBe("just now");
    });

    it("should return minutes ago for time less than hour", () => {
      const date = new Date(Date.now() - 30 * 60 * 1000);
      expect(timeAgo(date)).toBe("30 mins ago");
    });

    it("should return hours ago for time less than day", () => {
      const date = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(timeAgo(date)).toBe("2 hrs ago");
    });

    it("should return days ago for time more than day", () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(timeAgo(date)).toBe("2 days ago");
    });

    it("should handle date string", () => {
      const date = new Date(Date.now() - 30 * 60 * 1000);
      expect(timeAgo(date.toISOString())).toBe("30 mins ago");
    });
  });
});
