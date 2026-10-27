// Phase 14.8 - soft-deleted listings are read-only history (REAL carController.updateCar/addCarImages/deleteCarImage/getMyListings).
// (harness reused from the 14.7 deletion-guard suite)
// Phase 14.7 - server-side listing deletion guard. REAL carController.deleteCar and REAL utils/carDeletionGuard.js;
// persistence is a small stateful in-memory model whose softDeleteGuarded() mirrors the conditional UPDATE in models/Car.js.
// A second block runs the REAL models/Car.js with a recording query builder to prove the guard is part of the single UPDATE.
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

let findFilters = []; let rows; let bidRows; let decrements; let audits; let beforeWrite;
const blocked = (r) => r.status === "sold" || r.status === "reserved" || ["live", "ended"].includes(r.auctionStatus || "none") || (r.bidsCount || 0) > 0 || !!r.highestBidderId;
const doc = (r) => r && { ...r };
const Car = {
  findById: jest.fn(async (id) => { const d = doc(rows.get(id)); return d && { ...d, toObject: () => ({ ...d }) }; }),
  find: jest.fn((f) => { findFilters.push(f); const out = [...rows.values()].filter((r) => (f.dealer ? r.dealer === f.dealer : true) && (f.deletedAt && f.deletedAt.$exists !== false ? true : !r.deletedAt)); const p = Promise.resolve(out); p.populate = () => p; p.sort = () => p; p.lean = () => p; return p; }),
  findByIdAndUpdate: jest.fn(async () => ({})),
  countBidRows: jest.fn(async (id) => bidRows[id] || 0),
  softDeleteGuarded: jest.fn(async (id) => {
    if (beforeWrite) { beforeWrite(); beforeWrite = null; }          // simulate a concurrent bid / auction change
    const r = rows.get(id);
    if (!r || r.deletedAt || blocked(r)) return { modifiedCount: 0 }; // conditional UPDATE ... WHERE <guard>
    r.deletedAt = "now"; return { modifiedCount: 1 };
  }),
  softDelete: jest.fn(),
};
const User = { findById: jest.fn(() => ({ select: async () => ({ listingCount: 3 }) })), findByIdAndUpdate: jest.fn(async (id, upd) => { decrements.push(upd); return {}; }) };
jest.unstable_mockModule("../../models/Car.js", () => ({ default: Car }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule("../../utils/cache.js", () => ({ cacheDelPattern: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({ uploadMultiple: jest.fn(), deleteImage: jest.fn() }));
jest.unstable_mockModule("../../middleware/upload.js", () => ({ cleanupFiles: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true, getSupabase: () => ({}) }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async (req, action) => { audits.push(action); }) }));
jest.unstable_mockModule("../../services/duplicateVehicleService.js", () => ({ detectDuplicates: jest.fn(), flagDuplicate: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logVehicleCreated: jest.fn(), logVehicleEdited: jest.fn(), logVehicleDeleted: jest.fn(async () => { audits.push("vehicle_deleted"); }) }));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({ getDealerEntitlement: jest.fn(), assertDealerCanCreateListing: jest.fn() }));
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({ atomicCreateDealerListing: jest.fn() }));
jest.unstable_mockModule("../../services/mediaRecovery.service.js", () => ({ registerMediaUploadJob: jest.fn(), registerMediaUploadFailure: jest.fn(), completeMediaUpload: jest.fn() }));
jest.unstable_mockModule("../../services/escrowCapability.service.js", () => ({ getEscrowEnabledForNewOrEditedCar: jest.fn(), getEffectiveEscrowForCar: jest.fn() }));
jest.unstable_mockModule("../../utils/publicListingCache.js", () => ({ invalidatePublicListingCaches: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../services/privateSellerAuctionEligibility.service.js", () => ({ evaluateEligibilityBatch: jest.fn() }));
jest.unstable_mockModule("../../services/onboardingPolicy.service.js", () => ({ getOnboardingPolicy: jest.fn(), isPolicyTrusted: jest.fn() }));


const { updateCar, addCarImages, deleteCarImage, getMyListings } = await import("../../controllers/carController.js");
const OWNER = { id: "d1", role: "dealer", effectiveRole: "dealer" };
const OTHER = { id: "d2", role: "dealer", effectiveRole: "dealer" };
const ADMIN = { id: "a1", role: "admin", effectiveRole: "admin" };
const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const car = (over = {}) => ({ id: "c1", dealer: "d1", status: "available", images: [{ url: "u1" }, { url: "u2" }], auctionStatus: "none", bidsCount: 0, deletedAt: null, ...over });
beforeEach(() => { rows = new Map([["c1", car({ deletedAt: "2026-10-01" })]]); bidRows = {}; decrements = []; audits = []; beforeWrite = null; findFilters = []; jest.clearAllMocks(); });

describe("14.8 a soft-deleted listing is read-only history for its owner", () => {
  test("owner cannot edit it (404, nothing written)", async () => {
    const res = mkRes(); await updateCar({ params: { id: "c1" }, user: OWNER, body: { title: "Resurrected" }, files: [] }, res);
    expect(res.code).toBe(404);
    expect(Car.findByIdAndUpdate).not.toHaveBeenCalled();
  });
  test("owner cannot add photos (404)", async () => {
    const res = mkRes(); await addCarImages({ params: { id: "c1" }, user: OWNER, files: [{ path: "x" }] }, res);
    expect(res.code).toBe(404);
  });
  test("owner cannot remove photos (404)", async () => {
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "0" }, user: OWNER }, res);
    expect(res.code).toBe(404);
  });
  test("a different dealer still gets 403, not a 404 that would depend on state", async () => {
    const res = mkRes(); await updateCar({ params: { id: "c1" }, user: OTHER, body: { title: "x" }, files: [] }, res);
    expect(res.code).toBe(403);
  });
  test("staff keep administrative access to the historical record (not refused as deleted)", async () => {
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "9" }, user: ADMIN }, res);
    expect(res.code).toBe(400); // reaches the normal validation (invalid image index) instead of the deleted-listing 404
  });
  test("an ACTIVE listing is unaffected: owner photo validation still runs", async () => {
    rows.set("c1", car());
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "9" }, user: OWNER }, res);
    expect(res.code).toBe(400);
  });
  test("owner inventory query excludes soft-deleted listings", async () => {
    rows = new Map([["c1", car({ deletedAt: "2026-10-01" })], ["c2", car({ id: "c2", title: "live" })]]);
    const res = mkRes(); await getMyListings({ user: OWNER }, res);
    expect(findFilters[0]).toMatchObject({ dealer: "d1", deletedAt: { $exists: false } });
    expect(res.body.data.map((c) => c.id)).toEqual(["c2"]);
  });
});
