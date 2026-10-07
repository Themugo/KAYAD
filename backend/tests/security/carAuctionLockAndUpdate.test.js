// ============================================================
// P0/P1 SOURCE-LEVEL TRUST BOUNDARY SWEEP — Item 2
// OWNERSHIP / LISTING AUTHORIZATION AFTER SALE
//
// Regression coverage for two real defects found in
// backend/controllers/carController.js's updateCar, both exercised only
// by actually invoking the controller (never previously covered by a
// real-DB or unit test):
//
//  1. CRASH: car.set(key, value) was called on every listing edit, but
//     the Car model (backend/models/_base.js wrapDoc) returns a plain
//     object with no .set() method — every single PUT /api/cars/:id
//     threw "car.set is not a function", silently caught by the
//     controller's own try/catch and surfaced only as a generic 500.
//     Fixed by using plain property assignment (car[key] = value).
//
//  2. AUTHORIZATION GAP: the generic listing-edit endpoint let a car's
//     owning dealer mutate auction-defining fields (reservePrice,
//     startingBid, auctionStartTime, auctionEnd, allowBid, reserveMode)
//     with no reference to car.auctionStatus at all — bypassing the
//     canonical auction-amendment workflow in auctionSetup.service.js,
//     which correctly makes a *published* setup immutable (409) once
//     live. A dealer could silently change the reserve after bids were
//     placed, or edit an already-live/ended/sold auction's terms
//     directly. Fixed by locking those fields once auctionStatus leaves
//     "draft", with an explicit staff bypass for operational correction
//     (mirroring the admin bypass already used by
//     requireProviderOwnership elsewhere in this codebase).
// ============================================================

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const findByIdMock = jest.fn();
jest.unstable_mockModule("../../models/Car.js", () => ({ default: { findById: findByIdMock } }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: {} }));
jest.unstable_mockModule("../../utils/cache.js", () => ({ cacheDelPattern: jest.fn().mockResolvedValue(undefined) }));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({
  uploadMultiple: jest.fn(),
  deleteImage: jest.fn(),
}));
jest.unstable_mockModule("../../middleware/upload.js", () => ({ cleanupFiles: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true, getSupabase: jest.fn() }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn().mockResolvedValue(undefined) }));
jest.unstable_mockModule("../../services/duplicateVehicleService.js", () => ({
  detectDuplicates: jest.fn().mockResolvedValue([]),
  flagDuplicate: jest.fn(),
}));
jest.unstable_mockModule("../../services/auditService.js", () => ({
  logVehicleCreated: jest.fn().mockResolvedValue(undefined),
  logVehicleEdited: jest.fn().mockResolvedValue(undefined),
  logVehicleDeleted: jest.fn().mockResolvedValue(undefined),
}));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({
  getDealerEntitlement: jest.fn(),
  assertDealerCanCreateListing: jest.fn(),
}));
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({ atomicCreateDealerListing: jest.fn() }));
jest.unstable_mockModule("../../services/mediaRecovery.service.js", () => ({
  registerMediaUploadJob: jest.fn(),
  registerMediaUploadFailure: jest.fn(),
  completeMediaUpload: jest.fn(),
}));

const { updateCar } = await import("../../controllers/carController.js");

// Builds a fake Car document matching the real shape returned by
// backend/models/_base.js's wrapDoc: a plain object with .toObject()/.save(),
// NOT a Mongoose document (no .set()).
function makeCarDoc(overrides = {}) {
  const doc = {
    id: "car1",
    _id: "car1",
    dealer: "dealer1",
    title: "Toyota Hilux",
    price: 2000000,
    priceHistory: [],
    images: ["http://img/1.jpg"],
    coverImage: 0,
    escrowEnabled: false,
    auctionStatus: "draft",
    reservePrice: 1500000,
    startingBid: 1000000,
    allowBid: true,
    auctionStartTime: null,
    auctionEnd: null,
    ...overrides,
  };
  doc.toObject = function () { return { ...this }; };
  doc.save = jest.fn().mockImplementation(async function () { return this; });
  return doc;
}

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("updateCar — field assignment no longer crashes", () => {
  beforeEach(() => { findByIdMock.mockReset(); });

  test("applies an allowed field edit and saves (car.set was never a real method)", async () => {
    const car = makeCarDoc();
    findByIdMock.mockResolvedValue(car);
    const req = { params: { id: "car1" }, user: { id: "dealer1", role: "dealer" }, body: { title: "Toyota Hilux 2021" } };
    const res = mockRes();

    await updateCar(req, res);

    expect(car.title).toBe("Toyota Hilux 2021");
    expect(car.save).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe("updateCar — auction terms lock after draft", () => {
  beforeEach(() => { findByIdMock.mockReset(); });

  test("owner CAN change reservePrice while auction is still draft", async () => {
    const car = makeCarDoc({ auctionStatus: "draft" });
    findByIdMock.mockResolvedValue(car);
    const req = { params: { id: "car1" }, user: { id: "dealer1", role: "dealer" }, body: { reservePrice: 1800000 } };
    const res = mockRes();

    await updateCar(req, res);

    expect(car.reservePrice).toBe(1800000);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test("owner CANNOT change reservePrice once the auction is live (bids may already exist)", async () => {
    const car = makeCarDoc({ auctionStatus: "live", reservePrice: 1500000 });
    findByIdMock.mockResolvedValue(car);
    const req = { params: { id: "car1" }, user: { id: "dealer1", role: "dealer" }, body: { reservePrice: 999 } };
    const res = mockRes();

    await updateCar(req, res);

    expect(car.reservePrice).toBe(1500000); // unchanged
    expect(car.save).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "AUCTION_TERMS_LOCKED" }));
  });

  test("owner CANNOT change startingBid/auctionEnd/allowBid on an ended auction", async () => {
    const car = makeCarDoc({ auctionStatus: "ended", startingBid: 1000000, allowBid: false });
    findByIdMock.mockResolvedValue(car);
    const req = { params: { id: "car1" }, user: { id: "dealer1", role: "dealer" }, body: { startingBid: 1, allowBid: true } };
    const res = mockRes();

    await updateCar(req, res);

    expect(car.startingBid).toBe(1000000);
    expect(car.allowBid).toBe(false);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("owner CANNOT change auction terms on a sold auction", async () => {
    const car = makeCarDoc({ auctionStatus: "sold", auctionEnd: "2026-01-01T00:00:00.000Z" });
    findByIdMock.mockResolvedValue(car);
    const req = { params: { id: "car1" }, user: { id: "dealer1", role: "dealer" }, body: { auctionEnd: "2030-01-01T00:00:00.000Z" } };
    const res = mockRes();

    await updateCar(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test("owner CAN still edit non-auction fields (title, price, description) while auction is live", async () => {
    const car = makeCarDoc({ auctionStatus: "live" });
    findByIdMock.mockResolvedValue(car);
    const req = { params: { id: "car1" }, user: { id: "dealer1", role: "dealer" }, body: { description: "Updated description" } };
    const res = mockRes();

    await updateCar(req, res);

    expect(car.description).toBe("Updated description");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test("resubmitting the current reservePrice value while live is a no-op, not a lock violation", async () => {
    const car = makeCarDoc({ auctionStatus: "live", reservePrice: 1500000 });
    findByIdMock.mockResolvedValue(car);
    const req = { params: { id: "car1" }, user: { id: "dealer1", role: "dealer" }, body: { reservePrice: 1500000, title: "Same car, new photos" } };
    const res = mockRes();

    await updateCar(req, res);

    expect(res.status).not.toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test("staff/admin can still amend auction terms on a live auction for operational correction", async () => {
    const car = makeCarDoc({ auctionStatus: "live", reservePrice: 1500000 });
    findByIdMock.mockResolvedValue(car);
    const req = { params: { id: "car1" }, user: { id: "admin1", role: "admin" }, body: { reservePrice: 1600000 } };
    const res = mockRes();

    await updateCar(req, res);

    expect(car.reservePrice).toBe(1600000);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test("a non-owner, non-staff dealer still gets 403 regardless of auction status", async () => {
    const car = makeCarDoc({ dealer: "dealer1", auctionStatus: "draft" });
    findByIdMock.mockResolvedValue(car);
    const req = { params: { id: "car1" }, user: { id: "dealer2", role: "dealer" }, body: { title: "Hijacked listing" } };
    const res = mockRes();

    await updateCar(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(car.title).toBe("Toyota Hilux");
  });
});
