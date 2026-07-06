import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

jest.unstable_mockModule("../services/abuse.service.js", () => ({
  detectAbuse: jest.fn(),
}));

describe("auction.service", () => {
  let auctionService;

  beforeAll(async () => {
    auctionService = await import("../services/auction.service.js");
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockVehicle = () => ({
    id: "car1",
    price: 500000,
    reservePrice: 300000,
    buyNowPrice: 1000000,
  });

  describe("createAuction", () => {
    it("throws if no vehicle id", () => {
      expect(() => auctionService.createAuction({})).toThrow("Vehicle ID required");
    });

    it("creates auction with defaults", () => {
      const auction = auctionService.createAuction(mockVehicle());
      expect(auction.id).toBe("car1");
      expect(auction.status).toBe("PENDING");
      expect(auction.highestBid).toBe(500000);
      expect(auction.highestBidder).toBeNull();
      expect(auction.bids).toEqual([]);
    });
  });

  describe("startAuction", () => {
    it("returns null for unknown auction", () => {
      expect(auctionService.startAuction("nonexistent")).toBeNull();
    });

    it("starts auction with default 180 min duration", () => {
      const now = Date.now();
      jest.setSystemTime(now);
      auctionService.createAuction(mockVehicle());
      const auction = auctionService.startAuction("car1");
      expect(auction.status).toBe("LIVE");
      expect(auction.startTime).toBe(now);
      expect(auction.endTime).toBe(now + 180 * 60 * 1000);
    });

    it("starts auction with custom duration", () => {
      const now = Date.now();
      jest.setSystemTime(now);
      auctionService.createAuction(mockVehicle());
      const auction = auctionService.startAuction("car1", 60);
      expect(auction.endTime).toBe(now + 60 * 60 * 1000);
    });
  });

  describe("endAuction", () => {
    it("returns null for unknown auction", () => {
      expect(auctionService.endAuction("nonexistent")).toBeNull();
    });

    it("ends auction and returns winner info", () => {
      const vehicle = { ...mockVehicle(), price: 200000, reservePrice: 500000 };
      auctionService.createAuction(vehicle);
      auctionService.startAuction("car1");
      const result = auctionService.endAuction("car1");
      expect(result.winner).toBeNull();
      expect(result.reserveMet).toBe(false);
    });

    it("reserve met when highestBid >= reservePrice", () => {
      const vehicle = { ...mockVehicle(), reservePrice: 200000 };
      auctionService.createAuction(vehicle);
      auctionService.startAuction("car1");
      const result = auctionService.endAuction("car1");
      expect(result.reserveMet).toBe(true);
    });
  });

  describe("placeBid", () => {
    it("returns error for unknown auction", async () => {
      const result = await auctionService.placeBid({ auctionId: "x" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Auction not found");
    });

    it("returns error if abuse detected", async () => {
      const { detectAbuse } = await import("../services/abuse.service.js");
      detectAbuse.mockResolvedValue({ flagged: true });
      auctionService.createAuction(mockVehicle());
      auctionService.startAuction("car1");
      const result = await auctionService.placeBid({ auctionId: "car1", amount: 600000, userId: "u1" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Suspicious bidding detected");
    });

    it("returns error if auction not live", async () => {
      const { detectAbuse } = await import("../services/abuse.service.js");
      detectAbuse.mockResolvedValue({ flagged: false });
      auctionService.createAuction(mockVehicle());
      const result = await auctionService.placeBid({ auctionId: "car1", amount: 600000, userId: "u1" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Auction not live");
    });

    it("returns error if auction ended", async () => {
      const { detectAbuse } = await import("../services/abuse.service.js");
      detectAbuse.mockResolvedValue({ flagged: false });
      const now = Date.now();
      jest.setSystemTime(now);
      auctionService.createAuction(mockVehicle());
      auctionService.startAuction("car1", 0); // 0 duration
      jest.advanceTimersByTime(1);
      const result = await auctionService.placeBid({ auctionId: "car1", amount: 600000, userId: "u1" });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Auction ended");
    });

    it("returns error if bid below minimum", async () => {
      const { detectAbuse } = await import("../services/abuse.service.js");
      detectAbuse.mockResolvedValue({ flagged: false });
      auctionService.createAuction(mockVehicle());
      auctionService.startAuction("car1");
      const result = await auctionService.placeBid({ auctionId: "car1", amount: 500000, userId: "u1" });
      // highestBid=500000, minIncrement=5000, so min bid is 505000
      expect(result.success).toBe(false);
      expect(result.message).toContain("Minimum bid is");
    });

    it("triggers buy now when amount >= buyNowPrice", async () => {
      const { detectAbuse } = await import("../services/abuse.service.js");
      detectAbuse.mockResolvedValue({ flagged: false });
      auctionService.createAuction(mockVehicle());
      auctionService.startAuction("car1");
      const result = await auctionService.placeBid({ auctionId: "car1", amount: 1000000, userId: "u1" });
      expect(result.winner).toBeDefined();
      expect(result.amount).toBe(1000000);
    });

    it("places bid successfully and extends anti-sniping", async () => {
      const { detectAbuse } = await import("../services/abuse.service.js");
      detectAbuse.mockResolvedValue({ flagged: false });
      const now = Date.now();
      jest.setSystemTime(now);
      auctionService.createAuction(mockVehicle());
      auctionService.startAuction("car1", 10); // 10 min
      jest.advanceTimersByTime(9 * 60 * 1000); // 9 min in
      const result = await auctionService.placeBid({ auctionId: "car1", amount: 600000, userId: "u1" });
      expect(result.success).toBe(true);
      expect(result.bid).toBeDefined();
      expect(result.highestBid).toBe(600000);
      expect(result.endTime).toBeGreaterThan(now + 10 * 60 * 1000 - 1000); // extended
    });

    it("returns error when auction is locked", async () => {
      const { detectAbuse } = await import("../services/abuse.service.js");
      detectAbuse.mockResolvedValue({ flagged: false });
      auctionService.createAuction(mockVehicle());
      auctionService.startAuction("car1");

      // Manually lock (internal lock via first concurrent call)
      const p1 = auctionService.placeBid({ auctionId: "car1", amount: 600000, userId: "u1" });
      const p2 = auctionService.placeBid({ auctionId: "car1", amount: 700000, userId: "u1" });
      const results = await Promise.all([p1, p2]);
      expect(results.some((r) => r.success === false && r.message === "Try again (busy)")).toBe(true);
    });
  });

  describe("getAuction", () => {
    it("returns null for unknown", () => {
      expect(auctionService.getAuction("nonexistent")).toBeNull();
    });

    it("returns auction and auto-ends if past end time", () => {
      const now = Date.now();
      jest.setSystemTime(now);
      auctionService.createAuction(mockVehicle());
      auctionService.startAuction("car1", 0); // ends immediately
      jest.advanceTimersByTime(1);
      const auction = auctionService.getAuction("car1");
      expect(auction.status).toBe("ENDED");
    });
  });

  describe("getAllAuctions", () => {
    it("returns all auctions", () => {
      auctionService.createAuction(mockVehicle());
      const list = auctionService.getAllAuctions();
      expect(list.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("cleanupEndedAuctions", () => {
    it("removes ended auctions", () => {
      auctionService.createAuction(mockVehicle());
      auctionService.startAuction("car1");
      auctionService.endAuction("car1");
      auctionService.cleanupEndedAuctions();
      expect(auctionService.getAllAuctions()).toHaveLength(0);
    });
  });
});
