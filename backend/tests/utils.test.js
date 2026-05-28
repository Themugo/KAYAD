import { describe, it, expect } from "@jest/globals";
import { formatPhone, formatCurrency, timeAgo } from "../utils/format.js";
import { buildPagination } from "../utils/pagination.js";

describe("Utils", () => {
  describe("formatPhone", () => {
    it("converts 07xx to 2547xx", () => {
      expect(formatPhone("0712345678")).toBe("254712345678");
    });

    it("strips +254 to 254", () => {
      expect(formatPhone("+254712345678")).toBe("254712345678");
    });

    it("keeps 254 as-is", () => {
      expect(formatPhone("254712345678")).toBe("254712345678");
    });

    it("rejects invalid short number", () => {
      expect(formatPhone("07123")).toBeNull();
    });

    it("returns null for null input", () => {
      expect(formatPhone(null)).toBeNull();
    });
  });

  describe("formatCurrency", () => {
    it("formats number as KES", () => {
      expect(formatCurrency(1500)).toMatch(/KES/);
      expect(formatCurrency(1500)).toMatch(/1,500/);
    });

    it("handles NaN gracefully", () => {
      expect(formatCurrency("abc")).toBe("KES 0.00");
    });
  });

  describe("timeAgo", () => {
    it('returns "just now" for recent dates', () => {
      expect(timeAgo(new Date())).toBe("just now");
    });
  });

  describe("buildPagination", () => {
    it("returns correct pagination metadata", () => {
      const result = buildPagination({ total: 100, page: 1, limit: 20 });
      expect(result).toMatchObject({
        page: 1, limit: 20, total: 100, pages: 5,
        hasNext: true, hasPrev: false,
      });
    });

    it("marks hasNext false on last page", () => {
      const result = buildPagination({ total: 20, page: 1, limit: 20 });
      expect(result.hasNext).toBe(false);
    });
  });
});
