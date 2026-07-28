// backend/tests/helpers.test.js
// ─────────────────────────────────────────────────────────────
// Helper utility tests
// Tests ID generation, bidder tag generation, time left calculation, time formatting
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from "@jest/globals";
import { generateId, generateBidderTag, getTimeLeft, formatTimeLeft } from "../utils/helpers.js";

describe("Helper Utilities", () => {
  describe("generateId", () => {
    it("should generate ID with default length", () => {
      const id = generateId();
      expect(id).toBeDefined();
      expect(id.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it("should generate ID with custom length", () => {
      const id = generateId(8);
      expect(id).toBeDefined();
      expect(id.length).toBe(16); // 8 bytes = 16 hex chars
    });

    it("should generate unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it("should generate valid hex string", () => {
      const id = generateId();
      expect(/^[0-9a-f]+$/.test(id)).toBe(true);
    });
  });

  describe("generateBidderTag", () => {
    it("should generate bidder tag with correct format", () => {
      const tag = generateBidderTag();
      expect(tag).toMatch(/^Bidder-\d{4}-[0-9a-f]{4}$/);
    });

    it("should generate unique bidder tags", () => {
      const tag1 = generateBidderTag();
      const tag2 = generateBidderTag();
      expect(tag1).not.toBe(tag2);
    });

    it("should start with 'Bidder-' prefix", () => {
      const tag = generateBidderTag();
      expect(tag.startsWith("Bidder-")).toBe(true);
    });

    it("should include 4-digit number", () => {
      const tag = generateBidderTag();
      const match = tag.match(/Bidder-(\d{4})-/);
      expect(match).toBeTruthy();
      const number = parseInt(match[1]);
      expect(number).toBeGreaterThanOrEqual(1000);
      expect(number).toBeLessThan(10000);
    });
  });

  describe("getTimeLeft", () => {
    it("should return 0 for null endTime", () => {
      const timeLeft = getTimeLeft(null);
      expect(timeLeft).toBe(0);
    });

    it("should return 0 for undefined endTime", () => {
      const timeLeft = getTimeLeft(undefined);
      expect(timeLeft).toBe(0);
    });

    it("should calculate time left for future date", () => {
      const future = new Date(Date.now() + 60000); // 1 minute from now
      const timeLeft = getTimeLeft(future);
      expect(timeLeft).toBeGreaterThan(0);
      expect(timeLeft).toBeLessThanOrEqual(60000);
    });

    it("should return 0 for past date", () => {
      const past = new Date(Date.now() - 60000); // 1 minute ago
      const timeLeft = getTimeLeft(past);
      expect(timeLeft).toBe(0);
    });

    it("should handle date string", () => {
      const future = new Date(Date.now() + 60000).toISOString();
      const timeLeft = getTimeLeft(future);
      expect(timeLeft).toBeGreaterThan(0);
    });
  });

  describe("formatTimeLeft", () => {
    it("should return 'Ended' for zero or negative time", () => {
      expect(formatTimeLeft(0)).toBe("Ended");
      expect(formatTimeLeft(-1000)).toBe("Ended");
    });

    it("should format time in hours, minutes, seconds", () => {
      const formatted = formatTimeLeft(3661000); // 1h 1m 1s
      expect(formatted).toBe("1h 1m 1s");
    });

    it("should format time with only minutes and seconds", () => {
      const formatted = formatTimeLeft(61000); // 1m 1s
      expect(formatted).toBe("0h 1m 1s");
    });

    it("should format time with only seconds", () => {
      const formatted = formatTimeLeft(1000); // 1s
      expect(formatted).toBe("0h 0m 1s");
    });

    it("should format time with hours only", () => {
      const formatted = formatTimeLeft(3600000); // 1h
      expect(formatted).toBe("1h 0m 0s");
    });

    it("should handle large time values", () => {
      const formatted = formatTimeLeft(90061000); // 25h 1m 1s
      expect(formatted).toBe("25h 1m 1s");
    });
  });
});
