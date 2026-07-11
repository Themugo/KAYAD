import { describe, it, expect } from "@jest/globals";
import { formatPhone, formatCurrency, formatDate, timeAgo } from "../../utils/format.js";

describe("formatPhone", () => {
  it("converts 07XX... to 2547XX...", () => {
    expect(formatPhone("0712345678")).toBe("254712345678");
  });

  it("converts 01XX... to 2541XX...", () => {
    expect(formatPhone("0112345678")).toBe("254112345678");
  });

  it("passes through 2547XX...", () => {
    expect(formatPhone("254712345678")).toBe("254712345678");
  });

  it("handles phone with + prefix", () => {
    expect(formatPhone("+254712345678")).toBe("254712345678");
  });

  it("strips whitespace", () => {
    expect(formatPhone("0712 345 678")).toBe("254712345678");
  });

  it("returns null for invalid phone", () => {
    expect(formatPhone("123456789")).toBeNull();
  });

  it("returns null for empty phone", () => {
    expect(formatPhone("")).toBeNull();
  });

  it("returns null for null phone", () => {
    expect(formatPhone(null)).toBeNull();
  });

  it("returns null for undefined phone", () => {
    expect(formatPhone(undefined)).toBeNull();
  });

  it("returns null for wrong prefix (2545...)", () => {
    expect(formatPhone("254512345678")).toBeNull();
  });
});

describe("formatCurrency", () => {
  it("formats KES with two decimal places", () => {
    expect(formatCurrency(1500000)).toBe("KES 1,500,000.00");
  });

  it("formats small amounts correctly", () => {
    expect(formatCurrency(99.5)).toBe("KES 99.50");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("KES 0.00");
  });

  it("handles NaN", () => {
    expect(formatCurrency(NaN)).toBe("KES 0.00");
  });

  it("handles string numbers", () => {
    expect(formatCurrency("1500000")).toBe("KES 1,500,000.00");
  });
});

describe("formatDate", () => {
  it("formats a valid date", () => {
    const date = new Date("2024-06-15T10:30:00");
    const result = formatDate(date);
    expect(result).toContain("2024");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
  });

  it("returns null for null input", () => {
    expect(formatDate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(formatDate(undefined)).toBeNull();
  });

  it("handles ISO string date", () => {
    const result = formatDate("2024-12-25T14:30:00Z");
    expect(result).toContain("2024");
  });
});

describe("timeAgo", () => {
  it("returns 'just now' for very recent dates", () => {
    const date = new Date(Date.now() - 1000).toISOString();
    expect(timeAgo(date)).toBe("just now");
  });

  it("returns minutes ago for times less than an hour", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("5 mins ago");
  });

  it("returns hours ago for times less than a day", () => {
    const date = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(timeAgo(date)).toBe("3 hrs ago");
  });

  it("returns days ago for times less than a week", () => {
    const date = new Date(Date.now() - 5 * 86400 * 1000).toISOString();
    expect(timeAgo(date)).toBe("5 days ago");
  });
});
