import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Shared mutable state for autoBid engine recursion
let currentBid = 0;

const mockRedis = {
  hset: jest.fn().mockResolvedValue(1),
  hdel: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  get: jest.fn().mockImplementation(() => Promise.resolve(String(currentBid))),
  set: jest.fn().mockImplementation((key, value) => {
    currentBid = Number(value);
    return Promise.resolve("OK");
  }),
  zadd: jest.fn().mockResolvedValue(1),
};
const mockEmitBidUpdate = jest.fn();

jest.unstable_mockModule("../config/redis.js", () => ({
  default: mockRedis,
}));
jest.unstable_mockModule("../socket/socket.js", () => ({
  emitBidUpdate: mockEmitBidUpdate,
}));

describe("autoBid.service", () => {
  let service;

  beforeAll(async () => {
    service = await import("../services/autoBid.service.js");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentBid = 0;
    // Restore default implementations (clearAllMocks only clears calls/instances, not impls)
    mockRedis.get.mockImplementation(() => Promise.resolve(String(currentBid)));
    mockRedis.set.mockImplementation((key, value) => {
      currentBid = Number(value);
      return Promise.resolve("OK");
    });
  });

  describe("setAutoBid", () => {
    it("registers an auto-bid in redis hash", async () => {
      const result = await service.setAutoBid({ roomId: "room1", userId: "u1", maxBid: 50000 });
      expect(mockRedis.hset).toHaveBeenCalledWith("auction:room1:autobids", "u1", 50000);
      expect(result.success).toBe(true);
    });
  });

  describe("removeAutoBid", () => {
    it("removes auto-bid from redis hash", async () => {
      const result = await service.removeAutoBid({ roomId: "room1", userId: "u1" });
      expect(mockRedis.hdel).toHaveBeenCalledWith("auction:room1:autobids", "u1");
      expect(result.success).toBe(true);
    });
  });

  describe("runAutoBidEngine", () => {
    it("returns early if no auto bidders", async () => {
      currentBid = 1000;
      mockRedis.hgetall.mockResolvedValue({});
      await service.runAutoBidEngine("room1");
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("returns early if no eligible bidders (maxBid <= current)", async () => {
      currentBid = 5000;
      mockRedis.hgetall.mockResolvedValue({ u1: "3000" });
      await service.runAutoBidEngine("room1");
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("places bid and recurses until stable with competition", async () => {
      currentBid = 1000;
      mockRedis.hgetall.mockResolvedValue({ u1: "1400", u2: "1200" });
      await service.runAutoBidEngine("room1");

      // Iter 1: nextBid = min(1400, 1200+100) = 1300, set(room1, 1300)
      // Iter 2: current=1300, u1(1400>1300)✓, u2(1200>1300)✗ → solo
      //         nextBid = min(1400, 1300+100) = 1400, set(room1, 1400)
      // Iter 3: current=1400, u1(1400>1400)✗ → stops
      expect(mockRedis.set).toHaveBeenCalledTimes(2);
      expect(mockRedis.set).toHaveBeenNthCalledWith(1, "auction:room1", 1300);
      expect(mockRedis.set).toHaveBeenNthCalledWith(2, "auction:room1", 1400);
    });

    it("places bids step-by-step as solo bidder until max reached", async () => {
      currentBid = 1000;
      mockRedis.hgetall.mockResolvedValue({ u1: "1200" });
      await service.runAutoBidEngine("room1");

      // Iter 1: nextBid = min(1200, 1000+100) = 1100
      // Iter 2: nextBid = min(1200, 1100+100) = 1200
      // Iter 3: current=1200, u1(1200>1200)✗ → stops
      expect(mockRedis.set).toHaveBeenCalledTimes(2);
      expect(mockRedis.set).toHaveBeenNthCalledWith(1, "auction:room1", 1100);
      expect(mockRedis.set).toHaveBeenNthCalledWith(2, "auction:room1", 1200);
    });

    it("does nothing if no auto bidders when current is 0", async () => {
      mockRedis.hgetall.mockResolvedValue({});
      await service.runAutoBidEngine("room1");
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("handles errors gracefully", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("Redis down"));
      await expect(service.runAutoBidEngine("room1")).resolves.not.toThrow();
    });
  });
});
