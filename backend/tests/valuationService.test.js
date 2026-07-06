import { describe, it, expect, beforeEach } from "@jest/globals";
import VALUATION_COEFFICIENTS from "../config/valuation.js";

const {
  estimatePrice, calculateMarketAverage, calculateConditionAdjustment,
  calculateMileageAdjustment, calculateYearAdjustment,
} = await import("../services/valuationService.js");

describe("valuationService", () => {
  describe("estimatePrice", () => {
    it("returns null when no similar cars", async () => {
      const result = await estimatePrice({ brand: "Unknown", model: "X", year: 2020, price: 10000 });
      expect(result).toBeNull();
    });
  });

  describe("calculateMarketAverage", () => {
    it("returns 0 for empty array", () => {
      expect(calculateMarketAverage([])).toBe(0);
    });

    it("computes average of car prices", () => {
      const cars = [{ price: 1000 }, { price: 2000 }, { price: 3000 }];
      expect(calculateMarketAverage(cars)).toBe(2000);
    });

    it("rounds to integer", () => {
      const cars = [{ price: 1000 }, { price: 2000 }];
      expect(calculateMarketAverage(cars)).toBe(1500);
    });
  });

  describe("calculateConditionAdjustment", () => {
    it("returns 1.2 for new", () => expect(calculateConditionAdjustment("new")).toBe(1.2));
    it("returns 1.1 for excellent", () => expect(calculateConditionAdjustment("excellent")).toBe(1.1));
    it("returns 1.0 for good", () => expect(calculateConditionAdjustment("good")).toBe(1.0));
    it("returns 0.9 for fair", () => expect(calculateConditionAdjustment("fair")).toBe(0.9));
    it("returns 0.8 for poor", () => expect(calculateConditionAdjustment("poor")).toBe(0.8));
    it("returns 1.0 for unknown", () => expect(calculateConditionAdjustment("unknown")).toBe(1.0));
    it("handles undefined", () => expect(calculateConditionAdjustment(undefined)).toBe(1.0));
    it("is case insensitive", () => expect(calculateConditionAdjustment("NEW")).toBe(1.2));
  });

  describe("calculateMileageAdjustment", () => {
    const baseCar = { year: new Date().getFullYear() - 5 };

    it("returns 1.0 when no mileage", () => {
      expect(calculateMileageAdjustment({ ...baseCar, mileage: null })).toBe(1.0);
    });

    it("returns 1.1 for very low mileage", () => {
      expect(calculateMileageAdjustment({ ...baseCar, mileage: 10000 })).toBe(1.1);
    });

    it("returns 1.05 for below average mileage", () => {
      expect(calculateMileageAdjustment({ ...baseCar, mileage: 50000 })).toBe(1.05);
    });

    it("returns 1.0 for average mileage", () => {
      expect(calculateMileageAdjustment({ ...baseCar, mileage: 75000 })).toBe(1.0);
    });

    it("returns 0.95 for above average mileage", () => {
      expect(calculateMileageAdjustment({ ...baseCar, mileage: 130000 })).toBe(0.95);
    });

    it("returns 0.9 for high mileage", () => {
      expect(calculateMileageAdjustment({ ...baseCar, mileage: 200000 })).toBe(0.9);
    });
  });

  describe("calculateYearAdjustment", () => {
    it("returns 1.1 for current year car", () => {
      expect(calculateYearAdjustment(new Date().getFullYear())).toBe(1.1);
    });

    it("returns 1.05 for 2-year-old car", () => {
      expect(calculateYearAdjustment(new Date().getFullYear() - 2)).toBe(1.05);
    });

    it("returns 1.0 for 4-year-old car", () => {
      expect(calculateYearAdjustment(new Date().getFullYear() - 4)).toBe(1.0);
    });

    it("returns 0.95 for 7-year-old car", () => {
      expect(calculateYearAdjustment(new Date().getFullYear() - 7)).toBe(0.95);
    });

    it("returns 0.9 for 15-year-old car", () => {
      expect(calculateYearAdjustment(new Date().getFullYear() - 15)).toBe(0.9);
    });
  });

  describe("coefficient consistency", () => {
    it("all condition scores are between 0 and 2", () => {
      const { conditionScores } = VALUATION_COEFFICIENTS.aiPricing;
      Object.values(conditionScores).forEach((v) => {
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(2);
      });
    });

    it("confidence weights sum to 1.0", () => {
      const { confidenceWeights } = VALUATION_COEFFICIENTS.vehicleValuation;
      const total = Object.values(confidenceWeights).reduce((s, v) => s + v, 0);
      expect(total).toBeCloseTo(1.0, 5);
    });

    it("ai pricing weights sum to 1.0", () => {
      const { weights } = VALUATION_COEFFICIENTS.aiPricing;
      const total = Object.values(weights).reduce((s, v) => s + v, 0);
      expect(total).toBeCloseTo(1.0, 5);
    });

    it("price estimator thresholds are monotonically increasing", () => {
      const pe = VALUATION_COEFFICIENTS.priceEstimator;
      expect(pe.greatThreshold).toBeLessThan(pe.goodThreshold);
      expect(pe.goodThreshold).toBeLessThan(pe.overpricedThreshold);
    });

    it("year adjustment multipliers decrease with age", () => {
      const ya = VALUATION_COEFFICIENTS.aiPricing.yearAdjustment;
      expect(ya.newMultiplier).toBeGreaterThan(ya.recentMultiplier);
      expect(ya.recentMultiplier).toBeGreaterThan(ya.avgMultiplier);
      expect(ya.avgMultiplier).toBeGreaterThan(ya.oldMultiplier);
      expect(ya.oldMultiplier).toBeGreaterThan(ya.vintageMultiplier);
    });

    it("mileage multipliers decrease with mileage", () => {
      const m = VALUATION_COEFFICIENTS.aiPricing.mileage;
      expect(m.lowMultiplier).toBeGreaterThan(m.belowAvgMultiplier);
      expect(m.belowAvgMultiplier).toBeGreaterThan(1.0);
      expect(1.0).toBeGreaterThan(m.aboveAvgMultiplier);
      expect(m.aboveAvgMultiplier).toBeGreaterThan(m.highMultiplier);
    });
  });
});
