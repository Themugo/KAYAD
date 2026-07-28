import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockLean = jest.fn();
const mockLimit = jest.fn(() => ({ lean: mockLean }));
const mockSkip = jest.fn(() => ({ limit: mockLimit }));
const mockSort = jest.fn(() => ({ skip: mockSkip }));
const mockFind = jest.fn(() => ({ sort: mockSort }));
const mockCountDocuments = jest.fn();

jest.unstable_mockModule("../models/Car.js", () => ({
  __esModule: true,
  default: { find: mockFind, countDocuments: mockCountDocuments },
}));

const { searchCars } = await import("../services/search.service.js");

describe("search.service", () => {
  beforeEach(() => {
    mockFind.mockClear();
    mockSort.mockClear();
    mockSkip.mockClear();
    mockLimit.mockClear();
    mockLean.mockClear();
    mockCountDocuments.mockClear();
  });

  it("returns empty result when no cars match", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    const result = await searchCars({});
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.pages).toBe(0);
  });

  it("filters by keyword with regex escape", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ keyword: "Toyota+" });
    const filter = mockFind.mock.calls[0][0];
    expect(filter.$or[0].title.$regex).toBe("Toyota\\+");
  });

  it("filters by brand", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ brand: "Nissan" });
    expect(mockFind.mock.calls[0][0].brand).toBe("Nissan");
  });

  it("filters by price range", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ minPrice: 100000, maxPrice: 5000000 });
    const filter = mockFind.mock.calls[0][0];
    expect(filter.price.$gte).toBe(100000);
    expect(filter.price.$lte).toBe(5000000);
  });

  it("filters by year", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ year: 2020 });
    expect(mockFind.mock.calls[0][0].year).toBe(2020);
  });

  it("filters by mileage range", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ minMileage: 10000, maxMileage: 50000 });
    const filter = mockFind.mock.calls[0][0];
    expect(filter.mileage.$gte).toBe(10000);
    expect(filter.mileage.$lte).toBe(50000);
  });

  it("sorts by price_asc", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ sort: "price_asc" });
    expect(mockSort.mock.calls[0][0]).toEqual({ price: 1 });
  });

  it("sorts by price_desc", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ sort: "price_desc" });
    expect(mockSort.mock.calls[0][0]).toEqual({ price: -1 });
  });

  it("sorts by popular (views)", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ sort: "popular" });
    expect(mockSort.mock.calls[0][0]).toEqual({ views: -1 });
  });

  it("defaults to latest sort", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({});
    expect(mockSort.mock.calls[0][0]).toEqual({ createdAt: -1 });
  });

  it("paginates correctly", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ page: 3, limit: 10 });
    expect(mockSkip).toHaveBeenCalledWith(20);
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("computes total pages", async () => {
    mockLean.mockResolvedValue([{ _id: "1" }]);
    mockCountDocuments.mockResolvedValue(25);
    const result = await searchCars({ limit: 10 });
    expect(result.pagination.pages).toBe(3);
    expect(result.data).toHaveLength(1);
  });

  it("handles only minPrice set", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ minPrice: 50000 });
    const filter = mockFind.mock.calls[0][0];
    expect(filter.price.$gte).toBe(50000);
    expect(filter.price.$lte).toBeUndefined();
  });

  it("handles only maxPrice set", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ maxPrice: 10000000 });
    const filter = mockFind.mock.calls[0][0];
    expect(filter.price.$lte).toBe(10000000);
    expect(filter.price.$gte).toBeUndefined();
  });

  it("handles only minMileage set", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ minMileage: 20000 });
    const filter = mockFind.mock.calls[0][0];
    expect(filter.mileage.$gte).toBe(20000);
    expect(filter.mileage.$lte).toBeUndefined();
  });

  it("always includes status:active filter", async () => {
    mockLean.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    await searchCars({ keyword: "test" });
    expect(mockFind.mock.calls[0][0].status).toBe("active");
  });
});
