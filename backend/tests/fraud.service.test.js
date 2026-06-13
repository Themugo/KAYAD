import { describe, it, expect } from "@jest/globals";
import { detectFraud } from "../services/fraud.service.js";

const DAY = new Date("2025-01-01T14:00:00").getTime();

describe("detectFraud", () => {
  it("returns no flag for a normal bid", () => {
    const r = detectFraud({ bid: 50000, previousBid: 40000, now: DAY });
    expect(r.flagged).toBe(false);
    expect(r.score).toBe(0);
  });

  it("returns no flag when all defaults apply", () => {
    const r = detectFraud({ bid: 50000, now: DAY });
    expect(r.flagged).toBe(false);
    expect(r.score).toBe(0);
  });

  // ── individual checks ──

  it("adds 3 points for unrealistic amount (> 100M)", () => {
    const r = detectFraud({ bid: 200_000_000, now: DAY });
    expect(r.score).toBe(3);
    expect(r.reasons).toContain("Unrealistic bid amount");
    // score 3 → medium / cooldown
    expect(r.severity).toBe("medium");
    expect(r.action).toBe("cooldown");
  });

  it("adds 2 points for abnormal spike (3× below 1M, 2× at or above 1M)", () => {
    const r1 = detectFraud({ bid: 500000, previousBid: 100000, now: DAY });
    expect(r1.score).toBe(2);
    expect(r1.reasons).toContain("Abnormal bid spike");

    const r2 = detectFraud({ bid: 3_000_001, previousBid: 1_000_000, now: DAY });
    expect(r2.score).toBe(2);
    expect(r2.reasons).toContain("Abnormal bid spike");
  });

  it("does not flag spike when within multiplier", () => {
    const r1 = detectFraud({ bid: 250000, previousBid: 100000, now: DAY });
    expect(r1.reasons || []).not.toContain("Abnormal bid spike");

    const r2 = detectFraud({ bid: 2_900_000, previousBid: 1_000_000, now: DAY });
    expect(r2.reasons || []).not.toContain("Abnormal bid spike");
  });

  it("adds 2 points for bidding too fast", () => {
    const now = Date.now();
    const r1 = detectFraud({ bid: 50000, lastBidTime: now - 100, now });
    expect(r1.reasons).toContain("Bidding too fast");

    const r2 = detectFraud({ bid: 2_000_000, lastBidTime: now - 500, now });
    expect(r2.reasons).toContain("Bidding too fast");
  });

  it("does not flag with sufficient interval", () => {
    const now = Date.now();
    const r = detectFraud({ bid: 50000, lastBidTime: now - 2000, now });
    expect(r.reasons || []).not.toContain("Bidding too fast");
  });

  it("adds 2 points for too many bids per minute", () => {
    const r = detectFraud({ bid: 1000, bidsLastMinute: 21, now: DAY });
    expect(r.reasons).toContain("Too many bids per minute");
  });

  it("adds 1 point for unusual bidding volume (> 100 bids)", () => {
    const r = detectFraud({ bid: 1000, userBidsCount: 101, now: DAY });
    expect(r.score).toBe(1);
    // reasons only present when score >= 2
  });

  it("adds 2 points for far above average range (3×)", () => {
    const r = detectFraud({ bid: 1_000_000, auctionAverageBid: 200000, now: DAY });
    expect(r.reasons).toContain("Far above average bid range");
  });

  it("adds 2 points for consecutive self-bidding", () => {
    const now = Date.now();
    const r = detectFraud({
      bid: 1000,
      previousBidderId: "u1",
      currentUserId: "u1",
      bidHistory: [
        { userId: "u1", time: now - 1000 },
        { userId: "u1", time: now - 2000 },
      ],
    });
    expect(r.reasons).toContain("Consecutive self-bidding");
  });

  it("adds 1 point for suspicious bid increment pattern", () => {
    const r = detectFraud({
      bid: 104,
      now: DAY,
      bidHistory: [
        { bid: 100, time: 1000 },
        { bid: 102, time: 2000 },
        { bid: 104, time: 3000 },
      ],
    });
    expect(r.score).toBe(1);
  });

  it("adds 1 point for unusual hour (1-5 AM)", () => {
    const night = new Date("2025-01-01T03:00:00").getTime();
    const r = detectFraud({ bid: 1000, now: night });
    expect(r.score).toBe(1);
  });

  it("does not flag normal daytime hours", () => {
    const day = new Date("2025-01-01T14:00:00").getTime();
    const r = detectFraud({ bid: 1000, now: day });
    expect(r.reasons || []).not.toContain("Unusual bidding hour");
  });

  // ── severity tiers ──

  it("returns high/block for score >= 5", () => {
    const r = detectFraud({ bid: 200_000_000, previousBid: 100, lastBidTime: Date.now() - 50, bidsLastMinute: 30 });
    expect(r.flagged).toBe(true);
    expect(r.severity).toBe("high");
    expect(r.action).toBe("block");
    expect(r.score).toBeGreaterThanOrEqual(5);
  });

  it("returns medium/cooldown for score >= 3", () => {
    const r = detectFraud({ bid: 200_000_000, now: DAY });
    expect(r.severity).toBe("medium");
    expect(r.action).toBe("cooldown");
  });

  it("returns low/warn for score >= 2", () => {
    const r = detectFraud({ bid: 500000, previousBid: 100000, now: DAY });
    expect(r.severity).toBe("low");
    expect(r.action).toBe("warn");
  });

  it("returns no flag for score < 2", () => {
    const r = detectFraud({ bid: 100000, userBidsCount: 50, now: DAY });
    expect(r.flagged).toBe(false);
  });
});
