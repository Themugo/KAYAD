import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockLean = jest.fn();
const mockFind = jest.fn(() => ({ lean: mockLean }));

jest.unstable_mockModule("../models/Car.js", () => ({
  __esModule: true,
  default: { find: mockFind },
}));

const { getRecommendedCars } = await import("../services/recommendation.service.js");

describe("recommendation.service", () => {
  beforeEach(() => {
    mockFind.mockClear();
    mockLean.mockClear();
  });

  it("returns empty array when no cars found", async () => {
    mockLean.mockResolvedValue([]);
    const result = await getRecommendedCars({ userId: "abc" });
    expect(result).toEqual([]);
    expect(mockFind).toHaveBeenCalledWith({ status: "active" });
  });

  it("returns scored and sorted results limited by limit", async () => {
    const newer = Date.now();
    const older = newer - 86400000;
    mockLean.mockResolvedValue([
      { _id: "1", title: "Old Car", views: 10, currentBid: 1000, createdAt: new Date(older) },
      { _id: "2", title: "New Car", views: 100, currentBid: 5000, createdAt: new Date(newer) },
      { _id: "3", title: "Mid Car", views: 50, currentBid: 2000, createdAt: new Date(newer - 43200000) },
    ]);

    const result = await getRecommendedCars({ limit: 2 });

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("New Car");
    expect(result[1].title).toBe("Mid Car");
  });

  it("applies custom filters on top of status:active", async () => {
    mockLean.mockResolvedValue([]);
    await getRecommendedCars({ filters: { brand: "Toyota" } });
    expect(mockFind).toHaveBeenCalledWith({ status: "active", brand: "Toyota" });
  });

  it("defaults to limit 10", async () => {
    const cars = Array.from({ length: 15 }, (_, i) => ({
      _id: String(i),
      title: `Car ${i}`,
      views: 10,
      currentBid: 1000,
      createdAt: new Date(Date.now() - i * 60000),
    }));
    mockLean.mockResolvedValue(cars);
    const result = await getRecommendedCars();
    expect(result).toHaveLength(10);
  });

  it("scores higher for more views and higher bids", async () => {
    const now = Date.now();
    mockLean.mockResolvedValue([
      { _id: "high", title: "High Score", views: 200, currentBid: 50000, createdAt: new Date(now) },
      { _id: "low", title: "Low Score", views: 1, currentBid: 100, createdAt: new Date(now) },
    ]);
    const result = await getRecommendedCars();
    expect(result[0].title).toBe("High Score");
  });

  it("handles cars with missing views/currentBid using defaults", async () => {
    mockLean.mockResolvedValue([
      { _id: "no-stats", title: "No Stats", createdAt: new Date() },
    ]);
    const result = await getRecommendedCars();
    expect(result).toHaveLength(1);
    expect(result[0].score).toBeDefined();
    expect(typeof result[0].score).toBe("number");
  });
});
