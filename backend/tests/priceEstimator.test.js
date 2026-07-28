import { describe, it, expect, jest } from "@jest/globals";

const mockSelect = jest.fn();
const mockFind = jest.fn(() => ({ select: mockSelect }));

jest.unstable_mockModule("../models/Car.js", () => ({
  __esModule: true,
  default: { find: mockFind },
}));

const { estimatePrice } = await import("../services/priceEstimator.js");

describe("priceEstimator", () => {
  it("returns null when no similar cars found", async () => {
    mockSelect.mockResolvedValue([]);
    const result = await estimatePrice({ brand: "Toyota", model: "Camry", year: 2020, price: 3000000 });
    expect(result).toBeNull();
    expect(mockFind).toHaveBeenCalledWith({
      brand: "Toyota",
      model: "Camry",
      year: { $gte: 2019, $lte: 2021 },
    });
  });

  it('returns "great" when price < 80% of market avg', async () => {
    mockSelect.mockResolvedValue([{ price: 100 }, { price: 100 }]);
    const result = await estimatePrice({ brand: "A", model: "B", year: 2020, price: 70 });
    expect(result).toEqual({ avgMarketPrice: 100, dealRating: "great" });
  });

  it('returns "good" when price between 80% and 95% of avg', async () => {
    mockSelect.mockResolvedValue([{ price: 100 }]);
    const result = await estimatePrice({ brand: "A", model: "B", year: 2020, price: 85 });
    expect(result).toEqual({ avgMarketPrice: 100, dealRating: "good" });
  });

  it('returns "fair" when price between 95% and 120% of avg', async () => {
    mockSelect.mockResolvedValue([{ price: 100 }]);
    const result = await estimatePrice({ brand: "A", model: "B", year: 2020, price: 100 });
    expect(result).toEqual({ avgMarketPrice: 100, dealRating: "fair" });
  });

  it('returns "overpriced" when price > 120% of avg', async () => {
    mockSelect.mockResolvedValue([{ price: 100 }]);
    const result = await estimatePrice({ brand: "A", model: "B", year: 2020, price: 130 });
    expect(result).toEqual({ avgMarketPrice: 100, dealRating: "overpriced" });
  });
});
