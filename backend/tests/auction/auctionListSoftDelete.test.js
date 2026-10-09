import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const carFind = jest.fn();
const carCount = jest.fn();
const carFindById = jest.fn();
const findAll = jest.fn();
jest.unstable_mockModule("../../models/Car.js", () => ({ default: { find: carFind, countDocuments: carCount, findById: carFindById } }));
jest.unstable_mockModule("../../models/Bid.js", () => ({ default: {} }));
jest.unstable_mockModule("../../db/index.js", () => ({ findAll }));
jest.unstable_mockModule("../../services/escrowCapability.service.js", () => ({ getEffectiveEscrowForCar: jest.fn().mockResolvedValue(false) }));
const { listAuctions, getActiveAuctions, getAuction } = await import("../../controllers/auctionController.js");

const chain = (cars) => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => cars }) }) }) });
const res = () => { const r = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } }; return r; };

describe("auction endpoints never expose soft-deleted vehicles", () => {
  beforeEach(() => { jest.clearAllMocks(); carCount.mockResolvedValue(0); findAll.mockResolvedValue([]); });

  test.each(["live", "ended"])("listAuctions(status=%s) filter and count use deletedAt IS NULL", async (status) => {
    carFind.mockReturnValue(chain([]));
    await listAuctions({ query: { status } }, res());
    expect(carFind.mock.calls[0][0].deletedAt).toEqual({ $exists: false });
    expect(carCount.mock.calls[0][0].deletedAt).toEqual({ $exists: false });
  });

  test("scheduled path loads cars with the same soft-delete guard", async () => {
    findAll.mockResolvedValue([{ car_id: "c1", config: { startsAt: new Date(Date.now() + 86400000).toISOString() } }]);
    carFind.mockReturnValue({ lean: async () => [] });
    await listAuctions({ query: { status: "draft" } }, res());
    expect(carFind.mock.calls[0][0]).toMatchObject({ deletedAt: { $exists: false }, id: { $in: ["c1"] } });
  });

  test("getActiveAuctions uses the guard", async () => {
    carFind.mockReturnValue(chain([]));
    await getActiveAuctions({ query: {} }, res());
    expect(carFind.mock.calls[0][0].deletedAt).toEqual({ $exists: false });
  });

  test("auction detail of a soft-deleted vehicle is 404", async () => {
    carFindById.mockReturnValue({ populate: () => ({ lean: async () => ({ id: "c1", auctionStatus: "live", deletedAt: "2026-10-01T00:00:00Z" }) }) });
    const r = res(); await getAuction({ params: { id: "c1" } }, r);
    expect(r.statusCode).toBe(404);
  });
});

describe("failure is propagated, not converted to an empty list", () => {
  test("a throwing scheduled source rejects (asyncHandler -> 5xx) instead of returning []", async () => {
    findAll.mockRejectedValue(new Error('relation "auction_setups" does not exist'));
    await expect(listAuctions({ query: { status: "draft" } }, res())).rejects.toThrow(/auction_setups/);
  });
});
