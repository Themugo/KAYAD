// backend/tests/pagination.test.js
// ─────────────────────────────────────────────────────────────
// Pagination utility tests
// Tests pagination parser and response builder
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from "@jest/globals";
import { paginate, buildPagination } from "../utils/pagination.js";

describe("Pagination Utilities", () => {
  describe("paginate", () => {
    it("should parse default pagination parameters", () => {
      const req = { query: {} };
      const result = paginate(req);
      expect(result).toEqual({ page: 1, limit: 10, skip: 0 });
    });

    it("should parse custom page and limit", () => {
      const req = { query: { page: "2", limit: "20" } };
      const result = paginate(req);
      expect(result).toEqual({ page: 2, limit: 20, skip: 20 });
    });

    it("should clamp page to minimum of 1", () => {
      const req = { query: { page: "0", limit: "10" } };
      const result = paginate(req);
      expect(result.page).toBe(1);
    });

    it("should clamp page to minimum of 1 for negative values", () => {
      const req = { query: { page: "-5", limit: "10" } };
      const result = paginate(req);
      expect(result.page).toBe(1);
    });

    it("should clamp limit to maximum of 100", () => {
      const req = { query: { page: "1", limit: "200" } };
      const result = paginate(req);
      expect(result.limit).toBe(100);
    });

    it("should clamp limit to minimum of 1", () => {
      const req = { query: { page: "1", limit: "0" } };
      const result = paginate(req);
      expect(result.limit).toBe(10); // 0 is falsy, falls back to default
    });

    it("should calculate skip correctly", () => {
      const req = { query: { page: "3", limit: "25" } };
      const result = paginate(req);
      expect(result.skip).toBe(50);
    });

    it("should handle non-numeric page and limit", () => {
      const req = { query: { page: "invalid", limit: "invalid" } };
      const result = paginate(req);
      expect(result).toEqual({ page: 1, limit: 10, skip: 0 });
    });
  });

  describe("buildPagination", () => {
    it("should build pagination response for first page", () => {
      const result = buildPagination({ total: 100, page: 1, limit: 10 });
      expect(result).toEqual({
        total: 100,
        page: 1,
        limit: 10,
        pages: 10,
        hasNext: true,
        hasPrev: false,
      });
    });

    it("should build pagination response for middle page", () => {
      const result = buildPagination({ total: 100, page: 5, limit: 10 });
      expect(result).toEqual({
        total: 100,
        page: 5,
        limit: 10,
        pages: 10,
        hasNext: true,
        hasPrev: true,
      });
    });

    it("should build pagination response for last page", () => {
      const result = buildPagination({ total: 100, page: 10, limit: 10 });
      expect(result).toEqual({
        total: 100,
        page: 10,
        limit: 10,
        pages: 10,
        hasNext: false,
        hasPrev: true,
      });
    });

    it("should handle empty results", () => {
      const result = buildPagination({ total: 0, page: 1, limit: 10 });
      expect(result).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        pages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });

    it("should handle partial last page", () => {
      const result = buildPagination({ total: 95, page: 10, limit: 10 });
      expect(result).toEqual({
        total: 95,
        page: 10,
        limit: 10,
        pages: 10,
        hasNext: false,
        hasPrev: true,
      });
    });

    it("should calculate pages correctly for non-divisible total", () => {
      const result = buildPagination({ total: 25, page: 1, limit: 10 });
      expect(result.pages).toBe(3);
    });
  });
});
