import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockCarCount = jest.fn();
const mockBidCount = jest.fn();
const mockUserCount = jest.fn();
const mockAggregate = jest.fn();

jest.unstable_mockModule("../models/Car.js", () => ({
  __esModule: true,
  default: { countDocuments: mockCarCount },
}));

jest.unstable_mockModule("../models/Bid.js", () => ({
  __esModule: true,
  default: { countDocuments: mockBidCount, aggregate: mockAggregate },
}));

jest.unstable_mockModule("../models/User.js", () => ({
  __esModule: true,
  default: { countDocuments: mockUserCount },
}));

const { getPlatformAnalytics } = await import("../services/analytics.service.js");

describe("analytics.service", () => {
  beforeEach(() => {
    mockCarCount.mockClear();
    mockBidCount.mockClear();
    mockUserCount.mockClear();
    mockAggregate.mockClear();
  });

  it("returns zeroed analytics when no data exists", async () => {
    mockCarCount.mockResolvedValue(0);
    mockBidCount.mockResolvedValue(0);
    mockUserCount.mockResolvedValue(0);
    mockAggregate.mockResolvedValue([]);
    const result = await getPlatformAnalytics();
    expect(result.overview).toEqual({
      totalCars: 0,
      totalBids: 0,
      totalUsers: 0,
      totalBidValue: 0,
      avgBid: 0,
      avgBidsPerCar: 0,
    });
  });

  it("computes averages and totals from aggregate results", async () => {
    mockCarCount.mockResolvedValue(10);
    mockBidCount.mockResolvedValue(50);
    mockUserCount.mockResolvedValue(100);
    mockAggregate
      .mockResolvedValueOnce([{ avg: 250000 }])
      .mockResolvedValueOnce([{ total: 50000000 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getPlatformAnalytics();
    expect(result.overview.totalCars).toBe(10);
    expect(result.overview.totalBids).toBe(50);
    expect(result.overview.totalUsers).toBe(100);
    expect(result.overview.avgBid).toBe(250000);
    expect(result.overview.totalBidValue).toBe(50000000);
    expect(result.overview.avgBidsPerCar).toBe(5);
  });

  it("includes daily activity and top cars in response", async () => {
    mockCarCount.mockResolvedValue(0);
    mockBidCount.mockResolvedValue(0);
    mockUserCount.mockResolvedValue(0);
    mockAggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ _id: { day: 1, month: 1 }, count: 3 }])
      .mockResolvedValueOnce([{ _id: "car1", bidCount: 10 }]);

    const result = await getPlatformAnalytics();
    expect(result.activity.dailyBids).toHaveLength(1);
    expect(result.performance.topCars).toHaveLength(1);
  });
});
