import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const carFind = jest.fn();
const carCount = jest.fn();
const carFindById = jest.fn();
const findAll = jest.fn();
const bidFind = jest.fn();
jest.unstable_mockModule("../../models/Car.js", () => ({ default: { find: carFind, countDocuments: carCount, findById: carFindById } }));
jest.unstable_mockModule("../../models/Bid.js", () => ({ default: { find: bidFind } }));
jest.unstable_mockModule("../../db/index.js", () => ({ findAll }));
jest.unstable_mockModule("../../services/escrowCapability.service.js", () => ({ getEffectiveEscrowForCar: jest.fn().mockResolvedValue(false) }));
const { listAuctions, getActiveAuctions, getAuction, getPublicAuctionBids } = await import("../../controllers/auctionController.js");

const chain = (cars) => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => cars }) }) }) });
const res = () => { const r = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } }; return r; };

describe("auction endpoints never expose soft-deleted vehicles", () => {
  beforeEach(() => { jest.clearAllMocks(); carCount.mockResolvedValue(0); findAll.mockResolvedValue([]); bidFind.mockReturnValue({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) }); });

  test.each(["live", "ended"])("listAuctions(status=%s) filter and count use deletedAt IS NULL", async (status) => {
    carFind.mockReturnValue(chain([]));
    await listAuctions({ query: { status } }, res());
    expect(carFind.mock.calls[0][0].deletedAt).toEqual({ $exists: false });
    expect(carCount.mock.calls[0][0].deletedAt).toEqual({ $exists: false });
  });

  test("public live discovery excludes rejected listings and enforces the live time window", async () => {
    carFind.mockReturnValue(chain([]));
    const r = res();
    await listAuctions({ query: { status: "live" } }, r);
    const filter = carFind.mock.calls[0][0];
    expect(filter.status).toEqual({ $ne: "rejected" });
    expect(filter.auctionStatus).toBe("live");
    expect(Date.parse(filter.auctionStartTime.$lte)).toBeLessThanOrEqual(Date.now());
    expect(Date.parse(filter.auctionEnd.$gt)).toBeGreaterThan(Date.now());
    expect(carCount.mock.calls[0][0]).toEqual(filter);
  });

  test("scheduled path loads cars with the same soft-delete guard", async () => {
    findAll.mockResolvedValue([{ car_id: "c1", config: { startsAt: new Date(Date.now() + 86400000).toISOString() } }]);
    carFind.mockReturnValue({ lean: async () => [] });
    await listAuctions({ query: { status: "draft" } }, res());
    expect(carFind.mock.calls[0][0]).toMatchObject({ deletedAt: { $exists: false }, status: { $ne: "rejected" }, id: { $in: ["c1"] } });
  });

  test("published upcoming setup is openable before the car lifecycle row is mirrored", async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    carFindById.mockReturnValue({ populate: () => ({ lean: async () => ({ id: "c1", status: "available", auctionStatus: null, auctionStartTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), price: 500, dealer: null }) }) });
    findAll.mockResolvedValue([{ id: "setup-1", car_id: "c1", publication_status: "published", config: { startsAt: start, endsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), startingBid: 500 } }]);
    const r = res();
    await getAuction({ params: { id: "c1" } }, r);
    expect(r.statusCode).toBe(200);
    expect(r.body.auction.status).toBe("draft");
    expect(r.body.auction.startTime).toBe(start);
  });

  test("public bid history route accepts a published upcoming setup before lifecycle mirroring", async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    carFindById.mockReturnValue({ populate: () => ({ lean: async () => ({ id: "c1", status: "available", auctionStatus: null }) }) });
    findAll.mockResolvedValue([{ id: "setup-1", car_id: "c1", publication_status: "published", config: { startsAt: start } }]);
    const r = res();
    await getPublicAuctionBids({ params: { id: "c1" } }, r);
    expect(r.statusCode).toBe(200);
    expect(r.body.bids).toEqual([]);
  });

  test("auction detail of a rejected listing is not public", async () => {
    carFindById.mockReturnValue({ populate: () => ({ lean: async () => ({ id: "c1", status: "rejected", auctionStatus: "live" }) }) });
    const r = res();
    await getAuction({ params: { id: "c1" } }, r);
    expect(r.statusCode).toBe(404);
  });

  test.each([
    ["soft-deleted", { id: "c1", auctionStatus: "live", deletedAt: "2026-10-01T00:00:00Z" }],
    ["rejected", { id: "c1", auctionStatus: "live", status: "rejected" }],
  ])("public bid history hides a %s listing", async (_label, car) => {
    carFindById.mockReturnValue({ populate: () => ({ lean: async () => car }) });
    const r = res();
    await getPublicAuctionBids({ params: { id: "c1" } }, r);
    expect(r.statusCode).toBe(404);
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
