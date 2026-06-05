import { describe, it, expect, jest } from "@jest/globals";

const mockAggregate = jest.fn();

jest.unstable_mockModule("../models/Payment.js", () => ({
  __esModule: true,
  default: { aggregate: mockAggregate },
}));

const { calculateRevenue } = await import("../services/revenue.service.js");

describe("revenue.service", () => {
  beforeEach(() => {
    mockAggregate.mockClear();
  });
  it("returns zero total and zero transactions with no payments", async () => {
    mockAggregate.mockResolvedValue([]);
    const result = await calculateRevenue();
    expect(result).toEqual({ total: 0, transactions: 0 });
    expect(mockAggregate).toHaveBeenCalledWith([
      { $match: { status: "success" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
  });

  it("returns computed total and count when payments exist", async () => {
    mockAggregate.mockResolvedValue([{ total: 500000, count: 3 }]);
    const result = await calculateRevenue({});
    expect(result).toEqual({ total: 500000, transactions: 3 });
  });

  it("filters by startDate when provided", async () => {
    mockAggregate.mockResolvedValue([{ total: 100, count: 1 }]);
    await calculateRevenue({ startDate: "2024-01-01" });
    const match = mockAggregate.mock.calls[0][0][0].$match;
    expect(match.status).toBe("success");
    expect(match.createdAt.$gte).toEqual(new Date("2024-01-01"));
    expect(match.createdAt.$lte).toBeUndefined();
  });

  it("filters by endDate when provided", async () => {
    mockAggregate.mockResolvedValue([{ total: 100, count: 1 }]);
    await calculateRevenue({ endDate: "2024-12-31" });
    const match = mockAggregate.mock.calls[0][0][0].$match;
    expect(match.createdAt.$lte).toEqual(new Date("2024-12-31"));
    expect(match.createdAt.$gte).toBeUndefined();
  });

  it("filters by both startDate and endDate", async () => {
    mockAggregate.mockResolvedValue([{ total: 100, count: 1 }]);
    await calculateRevenue({ startDate: "2024-01-01", endDate: "2024-12-31" });
    const match = mockAggregate.mock.calls[0][0][0].$match;
    expect(match.createdAt.$gte).toEqual(new Date("2024-01-01"));
    expect(match.createdAt.$lte).toEqual(new Date("2024-12-31"));
  });
});
