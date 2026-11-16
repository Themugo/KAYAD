// GET /api/cars manual-entry filters: typed make/model/colour match by "contains"; listed options stay exact. Recording model, no database.
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

let lastQuery = null;
const chain = (q) => { const c = { select: () => c, populate: () => c, sort: () => c, skip: () => c, limit: () => c, lean: async () => [] }; lastQuery = q; return c; };
jest.unstable_mockModule("../../models/Car.js", () => ({ default: { find: (q) => chain(q), countDocuments: async () => 0 } }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: { find: () => ({ distinct: () => ({ lean: async () => ["u1"] }) }) } }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true, getSupabase: () => ({}) }));
const { getCars } = await import("../../controllers/carController.js");

const run = async (query) => {
  const res = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  await getCars({ query }, res);
  return res;
};
beforeEach(() => { lastQuery = null; });

describe("getCars manual-entry filters", () => {
  it("a typed make is matched case-insensitively by contains, with regex characters escaped", async () => {
    await run({ brandLike: "toy.ta(" });
    expect(lastQuery.brand).toEqual({ $regex: "toy\\.ta\\(", $options: "i" });
  });
  it("a typed model and colour are matched by contains", async () => {
    await run({ modelLike: "prad", colorLike: "pearl" });
    expect(lastQuery.model).toEqual({ $regex: "prad", $options: "i" });
    expect(lastQuery.color).toEqual({ $regex: "pearl", $options: "i" });
  });
  it("a listed option stays an exact match and wins over a typed one", async () => {
    await run({ brand: "Toyota", brandLike: "zzz", model: "Prado", modelLike: "zzz", color: "White", colorLike: "zzz" });
    expect(lastQuery.brand).toEqual({ $in: ["Toyota"] });
    expect(lastQuery.model.$regex).toBe("^Prado$");
    expect(lastQuery.color.$regex).toBe("^White$");
  });
  it("one-character, empty, non-string and oversized input is ignored or capped", async () => {
    await run({ brandLike: "a", modelLike: "  ", colorLike: { $ne: null } });
    expect(lastQuery.brand).toBeUndefined();
    expect(lastQuery.model).toBeUndefined();
    expect(lastQuery.color).toBeUndefined();
    await run({ modelLike: "x".repeat(500) });
    expect(lastQuery.model.$regex.length).toBe(40);
  });
  it("always keeps the public-visibility rules", async () => {
    await run({ brandLike: "toyota" });
    expect(lastQuery.status).toBe("available");
    expect(lastQuery.deletedAt).toEqual({ $exists: false });
  });
});
