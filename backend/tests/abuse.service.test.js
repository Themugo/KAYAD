import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockFind = jest.fn();
const mockSort = jest.fn(() => ({ limit: mockLimit }));
const mockLimit = jest.fn();

jest.unstable_mockModule("../models/Bid.js", () => ({
  __esModule: true,
  default: { find: mockFind },
}));

const { detectAbuse } = await import("../services/abuse.service.js");

const makeBid = (amount, createdAt, user = "u1") => ({
  user: { toString: () => user },
  amount,
  createdAt: new Date(createdAt),
});

describe("abuse.service", () => {
  beforeEach(() => {
    mockFind.mockClear();
    mockSort.mockClear();
    mockLimit.mockClear();
    mockFind.mockReturnValue({ sort: mockSort });
    mockSort.mockReturnValue({ limit: mockLimit });
  });

  it("returns not flagged when fewer than 5 bids", async () => {
    mockLimit.mockResolvedValue([
      { amount: 100, createdAt: new Date(), user: { toString: () => "u1" } },
    ]);
    const result = await detectAbuse("user1", "auction1");
    expect(result).toEqual({ flagged: false });
  });

  it("flags rapid bidding (5+ bids within 2s each)", async () => {
    const now = Date.now();
    const bids = Array.from({ length: 6 }, (_, i) => makeBid(1000, now - i * 100, "u1"));
    mockLimit.mockResolvedValue(bids);
    const result = await detectAbuse("user1", "auction1");
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain("Rapid bidding detected");
  });

  it("flags high bid frequency", async () => {
    const now = Date.now();
    const bids = Array.from({ length: 10 }, (_, i) => makeBid(1000, now - i * 1000, "u1"));
    mockLimit.mockResolvedValue(bids);
    const result = await detectAbuse("user1", "auction1");
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain("High bid frequency");
  });

  it("flags suspicious small increments", async () => {
    const now = Date.now();
    const bids = Array.from({ length: 10 }, (_, i) => makeBid(110 - i, now - i * 100, "u1"));
    mockLimit.mockResolvedValue(bids);
    const result = await detectAbuse("user1", "auction1");
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain("Suspicious small bid increments");
  });

  it("flags self-outbidding pattern", async () => {
    const now = Date.now();
    const bids = Array.from({ length: 10 }, (_, i) => makeBid(1000, now - i * 100, "u1"));
    mockLimit.mockResolvedValue(bids);
    const result = await detectAbuse("user1", "auction1");
    expect(result.flagged).toBe(true);
    expect(result.reasons).toContain("Self-outbidding pattern");
  });

  it("returns not flagged when score is below threshold", async () => {
    const now = Date.now();
    const bids = Array.from({ length: 6 }, (_, i) => makeBid(5000, now - i * 10000, "u1"));
    mockLimit.mockResolvedValue(bids);
    const result = await detectAbuse("user1", "auction1");
    expect(result.flagged).toBe(false);
    expect(result.score).toBeLessThan(3);
  });

  it("passes correct args to Bid.find", async () => {
    mockLimit.mockResolvedValue([]);
    await detectAbuse("user99", "auction99");
    expect(mockFind).toHaveBeenCalledWith({ user: "user99", auction: "auction99" });
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mockLimit).toHaveBeenCalledWith(20);
  });
});
