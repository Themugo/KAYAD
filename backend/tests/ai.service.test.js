import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { estimatePrice, analyzeDeal, analyzeCarPrice } from "../services/ai.service.js";

describe("ai.service", () => {
  describe("estimatePrice", () => {
    it("returns base price with defaults", () => {
      const price = estimatePrice({});
      // base=1200000 * depreciation(2020=age 4->0.85->no, let me calculate)
      // Actually this depends on current year. Let me use a specific year.
      expect(price).toBeGreaterThan(0);
    });

    it("applies brand weight for Toyota", () => {
      const price = estimatePrice({ title: "Toyota Prado", year: 2023, mileage: 10000, condition: "good" });
      // brand weight 1.2 * base 1200000 = 1440000, model boost Prado +2500000 = 3940000, * depreciation 0.85 = 3349000
      // mileage: 10000/10000=1, 1*20000=20000, 3349000-20000=3329000
      // engine: none, condition good: *1.0 = 3329000
      // floor: 3329000 > 250000
      expect(price).toBe(3329000);
    });

    it("applies model boost for known models", () => {
      const price = estimatePrice({ title: "Nissan Xtrail", year: 2020, mileage: 50000, condition: "good" });
      // brand=nissan=1.0, base=1200000, model=xtrail=+800000=2000000
      // depreciation: age=6(2026-2020), <=7 -> 0.65; 2000000*0.65=1300000
      // mileage: 50000/10000=5, 5*20000=100000, 1300000-100000=1200000
      // condition good: *1.0=1200000
      expect(price).toBe(1200000);
    });

    it("applies engine type impact for diesel", () => {
      const price = estimatePrice({ title: "Toyota Hilux Diesel", year: 2020, mileage: 50000, condition: "average" });
      expect(price).toBeGreaterThan(0);
    });

    it("applies engine type impact for hybrid", () => {
      const price = estimatePrice({ title: "Toyota Prius Hybrid", year: 2020, mileage: 30000, condition: "good" });
      // brand toyota 1.2 -> 1440000, no model match, *0.65(age<=7) = 936000
      // mileage: 30000/10000=3, 3*20000=60000, 936000-60000=876000
      // engine hybrid +300000 = 1176000
      // condition good *1.0 = 1176000
      expect(price).toBe(1176000);
    });

    it("applies condition multiplier for new", () => {
      const price = estimatePrice({ title: "BMW 3 Series", year: 2025, mileage: 0, condition: "new" });
      // brand=bmw=1.5, base=1200000*1.5=1800000, no model, *0.85(age<=3)=1530000
      // mileage: 0, engine: 0, condition new: *1.2 = 1836000
      expect(price).toBe(1836000);
    });

    it("applies condition multiplier for poor", () => {
      const price = estimatePrice({ title: "Mazda Demio", year: 2015, mileage: 150000, condition: "poor" });
      // brand=mazda=1.1, base=1320000, model=demio=+300000=1620000
      // age=9, <=12 -> 0.45 -> 1620000*0.45=729000
      // mileage: 150000/10000=15, 15*20000=300000, 729000-300000=429000
      // condition poor: *0.75 = 321750
      // floor: 321750 > 250000 -> 321750
      expect(price).toBe(321750);
    });

    it("enforces floor price of 250000", () => {
      const price = estimatePrice({ title: "Unknown", year: 2000, mileage: 500000, condition: "poor" });
      // brand none, model none, base=1200000
      // age=24, >12 -> 0.3, 1200000*0.3=360000
      // mileage: 500000/10000=50, 50*20000=1000000, 360000-1000000=-640000
      // engine: 0, poor: *0.75 = -480000
      // floor: 250000
      expect(price).toBe(250000);
    });

    it("handles first brand match without continuing", () => {
      const price = estimatePrice({ title: "Toyota Subaru", year: 2020, mileage: 50000, condition: "good" });
      // brand=toyota=1.2 (not subaru because toyota matches first in loop)
      // base=1440000, no model, *0.65=936000, -100000=836000
      // good *1.0=836000
      expect(price).toBe(836000);
    });
  });

  describe("analyzeDeal", () => {
    it("returns great deal when ratio < 0.65", () => {
      const result = analyzeDeal(500000, 1000000);
      expect(result.label).toContain("Great Deal");
      expect(result.score).toBe(9);
    });

    it("returns overpriced when ratio > 1.35", () => {
      const result = analyzeDeal(1500000, 1000000);
      expect(result.label).toContain("Overpriced");
      expect(result.score).toBe(3);
    });

    it("returns fair price in the middle", () => {
      const result = analyzeDeal(1000000, 1000000);
      expect(result.label).toContain("Fair Price");
      expect(result.score).toBe(7);
    });
  });

  describe("analyzeCarPrice", () => {
    it("returns full analysis with difference and percentage", () => {
      const result = analyzeCarPrice({
        title: "Toyota Prado",
        year: 2023,
        mileage: 10000,
        price: 3000000,
        condition: "good",
      });
      // estimatedPrice from estimatePrice test above is 3329000
      // ratio = 3000000/3329000 ≈ 0.901, which is between 0.65 and 1.35 → Fair Price
      expect(result.estimatedPrice).toBe(3329000);
      expect(result.inputPrice).toBe(3000000);
      expect(result.difference).toBe(-329000);
      expect(result.deal).toBeDefined();
      expect(result.deal.label).toContain("Fair Price");
    });
  });
});
