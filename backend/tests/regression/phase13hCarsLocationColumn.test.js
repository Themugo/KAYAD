// Phase 13H — cars has no `location` column (real column location_city, app alias `city`). Two readers selected `location`:
//   GET /api/analytics/market/county-trends (PUBLIC) and the saved-search cron. Both failed with "column cars.location does not exist".
// EVIDENCE TIER: unit (recorded findAll calls); the real-database behaviour is certified in phase13h_route_matrix.mjs.
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

const findAllCalls = [];
let rows = [];
jest.unstable_mockModule("../../db/index.js", () => ({
  findAll: jest.fn(async (table, opts) => { findAllCalls.push([table, opts]); return rows; }),
  findById: jest.fn(), update: jest.fn(), count: jest.fn(), aggregate: jest.fn(), create: jest.fn(), findOne: jest.fn(), upsert: jest.fn(),
}));
const { getCountyTrends } = await import("../../services/vehicleAnalyticsService.js");
const { matches } = await import("../../services/savedSearchCron.js");

beforeEach(() => { findAllCalls.length = 0; rows = []; });

describe("getCountyTrends", () => {
  it("selects the aliased `city` field, never the non-existent `location` column", async () => {
    await getCountyTrends(new Date(0), new Date());
    const [table, opts] = findAllCalls[0];
    expect(table).toBe("cars");
    expect(opts.select.split(",")).toContain("city");
    expect(opts.select.split(",")).not.toContain("location");
  });
  it("groups by city, keeps the legacy location.city fallback and reports Unknown only when neither exists", async () => {
    const t = "2026-10-01T00:00:00Z";
    rows = [
      { city: "Nairobi", price: 100, status: "available", createdAt: t, updatedAt: t },
      { city: "Nairobi", price: 300, status: "sold", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-11T00:00:00Z" },
      { location: { city: "Mombasa" }, price: 50, status: "available", createdAt: t, updatedAt: t },
      { price: 70, status: "available", createdAt: t, updatedAt: t },
    ];
    const out = Object.fromEntries((await getCountyTrends(new Date(0), new Date())).map((r) => [r.county, r]));
    expect(out.Nairobi).toMatchObject({ volume: 2, averagePrice: 200, daysOnMarket: 10 });
    expect(out.Mombasa.volume).toBe(1);
    expect(out.Unknown.volume).toBe(1);
  });
});

describe("saved-search matching by city", () => {
  it("matches the aliased city (case-insensitive) and rejects a different city", () => {
    expect(matches({ city: "Nairobi" }, { city: "nairobi" })).toBe(true);
    expect(matches({ city: "Mombasa" }, { location: "Nairobi" })).toBe(false);
  });
  it("still honours legacy-shaped rows and ignores the filter when none is set", () => {
    expect(matches({ location: { city: "Kisumu" } }, { city: "kisumu" })).toBe(true);
    expect(matches({ brand: "Toyota" }, { brand: "toyota" })).toBe(true);
    expect(matches({}, { city: "Nairobi" })).toBe(false);
  });
});
