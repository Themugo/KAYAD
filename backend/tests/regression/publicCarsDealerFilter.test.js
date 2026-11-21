// Public GET /api/cars?dealer=<uuid> - a dealer's showroom. Only a well-formed UUID is accepted, and the vehicle
// filter always keeps status "available" and excludes soft-deleted rows. Recording model, no database.
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

describe("getCars dealer filter", () => {
  it("scopes to one dealer when given a UUID and still only lists available, non-deleted vehicles", async () => {
    const id = "05752bf6-34b9-40e2-8566-68c01f133179";
    const res = await run({ dealer: id });
    expect(res.statusCode).toBe(200);
    expect(lastQuery.dealer).toEqual({ $in: [id] });
    expect(lastQuery.status).toBe("available");
    expect(lastQuery.deletedAt).toEqual({ $exists: false });
  });
  it("ignores anything that is not a UUID (no query injection through the dealer parameter)", async () => {
    for (const bad of ["x", "1 or 1=1", "05752bf6-34b9-40e2-8566-68c01f13317", { $ne: null }, ["a"]]) {
      await run({ dealer: bad });
      expect(lastQuery.dealer).toBeUndefined();
    }
  });
  it("leaves the public listing unscoped when no dealer is given", async () => {
    await run({});
    expect(lastQuery.dealer).toBeUndefined();
    expect(lastQuery.status).toBe("available");
  });
});
