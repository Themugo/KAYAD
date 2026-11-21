import { describe, it, expect } from "@jest/globals";
import { generateId, generateBidderTag, getTimeLeft, formatTimeLeft } from "../../utils/helpers.js";

describe("generateId", () => {
  it("generates a hex string of correct length", () => {
    const id = generateId(16);
    expect(id).toHaveLength(32); // 16 bytes = 32 hex chars
  });

  it("generates different ids each time", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it("respects custom length", () => {
    const id = generateId(8);
    expect(id).toHaveLength(16); // 8 bytes = 16 hex chars
  });
});

describe("generateBidderTag", () => {
  it("returns a string starting with Bidder-", () => {
    const tag = generateBidderTag();
    expect(tag.startsWith("Bidder-")).toBe(true);
  });

  it("includes a random number and hex suffix", () => {
    const tag = generateBidderTag();
    const parts = tag.split("-");
    expect(parts).toHaveLength(3);
    expect(parts[1]).toMatch(/^\d{4}$/); // 4 digit number
    expect(parts[2]).toMatch(/^[0-9a-f]{4}$/); // 4 char hex
  });

  it("generates unique tags", () => {
    const tags = new Set();
    for (let i = 0; i < 100; i++) {
      tags.add(generateBidderTag());
    }
    // With high probability, all tags are unique
    expect(tags.size).toBeGreaterThan(90);
  });
});

describe("getTimeLeft", () => {
  it("returns 0 for null endTime", () => {
    expect(getTimeLeft(null)).toBe(0);
  });

  it("returns 0 for undefined endTime", () => {
    expect(getTimeLeft(undefined)).toBe(0);
  });

  it("returns positive time for future endTime", () => {
    const future = new Date(Date.now() + 60000).toISOString(); // 1 minute in future
    const result = getTimeLeft(future);
    expect(result).toBeGreaterThan(50000);
    expect(result).toBeLessThanOrEqual(60000);
  });

  it("returns 0 for past endTime", () => {
    const past = new Date(Date.now() - 60000).toISOString(); // 1 minute in past
    expect(getTimeLeft(past)).toBe(0);
  });

  it("handles Date objects", () => {
    const future = new Date(Date.now() + 60000);
    const result = getTimeLeft(future);
    expect(result).toBeGreaterThan(50000);
  });
});

describe("formatTimeLeft", () => {
  it("returns 'Ended' for zero", () => {
    expect(formatTimeLeft(0)).toBe("Ended");
  });

  it("returns 'Ended' for negative values", () => {
    expect(formatTimeLeft(-1000)).toBe("Ended");
  });

  it("formats seconds only", () => {
    const result = formatTimeLeft(45000); // 45 seconds
    expect(result).toBe("0h 0m 45s");
  });

  it("formats minutes and seconds", () => {
    const result = formatTimeLeft(150000); // 2.5 minutes
    expect(result).toContain("2m");
    expect(result).toContain("30s");
  });

  it("formats hours, minutes and seconds", () => {
    const result = formatTimeLeft(3661000); // ~1 hour, 1 minute, 1 second
    expect(result).toContain("1h");
    expect(result).toContain("1m");
    expect(result).toContain("1s");
  });

  it("formats exactly 1 hour", () => {
    const result = formatTimeLeft(3600000); // 1 hour
    expect(result).toBe("1h 0m 0s");
  });

  it("formats exactly 1 minute", () => {
    const result = formatTimeLeft(60000); // 1 minute
    expect(result).toBe("0h 1m 0s");
  });
});
