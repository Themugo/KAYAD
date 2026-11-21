import { describe, it, expect } from "@jest/globals";
import { paginate, buildPagination } from "../../utils/pagination.js";

describe("paginate", () => {
  it("returns default values when no query params", () => {
    const req = { query: {} };
    const result = paginate(req);
    expect(result).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("parses page from query", () => {
    const req = { query: { page: "3" } };
    const result = paginate(req);
    expect(result.page).toBe(3);
    expect(result.skip).toBe(20);
  });

  it("parses limit from query", () => {
    const req = { query: { limit: "25" } };
    const result = paginate(req);
    expect(result.limit).toBe(25);
  });

  it("caps limit at 100", () => {
    const req = { query: { limit: "500" } };
    const result = paginate(req);
    expect(result.limit).toBe(100);
  });

  it("enforces minimum page of 1", () => {
    const req = { query: { page: "0" } };
    const result = paginate(req);
    expect(result.page).toBe(1);
  });

  it("enforces minimum limit of 1", () => {
    const req = { query: { limit: "-5" } };
    const result = paginate(req);
    expect(result.limit).toBe(1);
  });

  it("handles non-numeric values gracefully", () => {
    const req = { query: { page: "abc", limit: "xyz" } };
    const result = paginate(req);
    expect(result).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it("calculates skip correctly for page 2", () => {
    const req = { query: { page: "2", limit: "20" } };
    const result = paginate(req);
    expect(result.skip).toBe(20);
  });
});

describe("buildPagination", () => {
  it("builds pagination object with total pages", () => {
    const result = buildPagination({ total: 100, page: 1, limit: 10 });
    expect(result.total).toBe(100);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.pages).toBe(10);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  it("marks hasPrev true when page > 1", () => {
    const result = buildPagination({ total: 100, page: 2, limit: 10 });
    expect(result.hasPrev).toBe(true);
    expect(result.hasNext).toBe(true);
  });

  it("marks hasNext false on last page", () => {
    const result = buildPagination({ total: 95, page: 10, limit: 10 });
    expect(result.hasNext).toBe(false);
  });

  it("handles zero total", () => {
    const result = buildPagination({ total: 0, page: 1, limit: 10 });
    expect(result.pages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(false);
  });

  it("rounds up partial pages", () => {
    const result = buildPagination({ total: 15, page: 1, limit: 10 });
    expect(result.pages).toBe(2);
  });
});
