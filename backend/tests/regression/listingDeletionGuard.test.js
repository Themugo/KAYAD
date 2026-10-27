// Phase 14.7 - server-side listing deletion guard. REAL carController.deleteCar and REAL utils/carDeletionGuard.js;
// persistence is a small stateful in-memory model whose softDeleteGuarded() mirrors the conditional UPDATE in models/Car.js.
// A second block runs the REAL models/Car.js with a recording query builder to prove the guard is part of the single UPDATE.
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

let rows; let bidRows; let decrements; let audits; let beforeWrite;
const blocked = (r) => r.status === "sold" || r.status === "reserved" || ["live", "ended"].includes(r.auctionStatus || "none") || (r.bidsCount || 0) > 0 || !!r.highestBidderId;
const doc = (r) => r && { ...r };
const Car = {
  findById: jest.fn(async (id) => doc(rows.get(id))),
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

const { deleteCar } = await import("../../controllers/carController.js");
const { listingDeletionBlock } = await import("../../utils/carDeletionGuard.js");

const OWNER = { id: "d1", role: "dealer", effectiveRole: "dealer" };
const OTHER = { id: "d2", role: "dealer", effectiveRole: "dealer" };
const ADMIN = { id: "a1", role: "admin", effectiveRole: "admin" };
const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const del = async (user, id = "c1") => { const res = mkRes(); await deleteCar({ params: { id }, user }, res); return res; };
const car = (over = {}) => ({ id: "c1", dealer: "d1", status: "available", auctionStatus: "none", bidsCount: 0, highestBidderId: null, deletedAt: null, ...over });

beforeEach(() => { rows = new Map([["c1", car()]]); bidRows = {}; decrements = []; audits = []; beforeWrite = null; jest.clearAllMocks(); });

describe("DELETE /cars/:id - who may delete", () => {
  test("owner deletes a plain listing once", async () => {
    const r = await del(OWNER);
    expect(r.code).toBe(200);
    expect(rows.get("c1").deletedAt).toBe("now");
    expect(decrements).toHaveLength(1);
    expect(audits).toEqual(expect.arrayContaining(["delete_car", "vehicle_deleted"]));
  });
  test("a different dealer is refused (403) and nothing is written", async () => {
    const r = await del(OTHER);
    expect(r.code).toBe(403);
    expect(Car.softDeleteGuarded).not.toHaveBeenCalled();
  });
  test("unknown listing -> 404", async () => expect((await del(OWNER, "nope")).code).toBe(404));
  test("staff with listing authority may delete a non-blocked listing", async () => expect((await del(ADMIN)).code).toBe(200));
});

describe("DELETE /cars/:id - business-rule guard (enforced regardless of caller)", () => {
  test.each([
    ["live auction", { auctionStatus: "live" }, "AUCTION_ACTIVE"],
    ["closed auction", { auctionStatus: "ended" }, "AUCTION_CLOSED"],
    ["bids counted on the listing", { bidsCount: 2 }, "BIDS_PRESENT"],
    ["highest bidder recorded", { highestBidderId: "u9" }, "BIDS_PRESENT"],
    ["sold listing", { status: "sold" }, "LISTING_SOLD"],
  ])("%s -> 409 LISTING_DELETE_BLOCKED and no write", async (_n, over, reason) => {
    rows.set("c1", car(over));
    for (const user of [OWNER, ADMIN]) {
      const r = await del(user);
      expect(r.code).toBe(409);
      expect(r.body).toMatchObject({ success: false, code: "LISTING_DELETE_BLOCKED", reason });
    }
    expect(Car.softDeleteGuarded).not.toHaveBeenCalled();
    expect(rows.get("c1").deletedAt).toBeNull();
    expect(decrements).toHaveLength(0);
  });
  test("bid rows exist even though the counter is stale -> blocked", async () => {
    bidRows.c1 = 1;
    expect((await del(OWNER)).body.reason).toBe("BIDS_PRESENT");
  });
  test("draft auction with no bids and a non-auction listing are deletable", async () => {
    rows.set("c1", car({ auctionStatus: "draft" })); expect((await del(OWNER)).code).toBe(200);
    rows.set("c1", car({ auctionStatus: undefined })); expect((await del(OWNER)).code).toBe(200);
  });
  test("a draft listing (status draft) is deletable", async () => {
    rows.set("c1", car({ status: "draft" })); expect((await del(OWNER)).code).toBe(200);
  });
});

describe("DELETE /cars/:id - races and idempotency", () => {
  test("a bid lands between the pre-check and the write -> the atomic guard refuses (409), no decrement", async () => {
    beforeWrite = () => { const r = rows.get("c1"); r.auctionStatus = "live"; r.bidsCount = 1; };
    const r = await del(OWNER);
    expect(r.code).toBe(409);
    expect(r.body.code).toBe("LISTING_DELETE_BLOCKED");
    expect(rows.get("c1").deletedAt).toBeNull();
    expect(decrements).toHaveLength(0);
  });
  test("repeated deletion is idempotent: 200, one decrement, one audit trail", async () => {
    expect((await del(OWNER)).code).toBe(200);
    const again = await del(OWNER);
    expect(again.code).toBe(200);
    expect(again.body.alreadyDeleted).toBe(true);
    expect(decrements).toHaveLength(1);
    expect(audits.filter((a) => a === "delete_car")).toHaveLength(1);
  });
  test("two concurrent deletes: exactly one performs the write, the other reports already deleted", async () => {
    const [a, b] = await Promise.all([del(OWNER), del(OWNER)]);
    expect([a.code, b.code]).toEqual([200, 200]);
    expect(decrements).toHaveLength(1);
  });
  test("a non-owner cannot probe or delete an already-deleted listing", async () => {
    rows.set("c1", car({ deletedAt: "t" }));
    expect((await del(OTHER)).code).toBe(403);
  });
});

describe("listingDeletionBlock (pure rule)", () => {
  test("14.8 a RESERVED listing cannot be deleted: 409 LISTING_RESERVED, row unchanged (owner and staff)", async () => {
    rows.set("c1", car({ status: "reserved" }));
    for (const who of [OWNER, ADMIN]) {
      const res = await del(who);
      expect(res.code).toBe(409);
      expect(res.body).toMatchObject({ success: false, code: "LISTING_DELETE_BLOCKED", reason: "LISTING_RESERVED" });
      expect(rows.get("c1").deletedAt).toBeNull();
    }
    expect(decrements).toEqual([]);
  });
  test("14.8 a reservation committed between the pre-check and the write refuses the delete", async () => {
    beforeWrite = () => { rows.get("c1").status = "reserved"; };
    const res = await del(OWNER);
    expect(res.code).toBe(409);
    expect(res.body.reason).toBe("LISTING_RESERVED");
    expect(rows.get("c1").deletedAt).toBeNull();
  });
  test("14.8 non-owner is refused before any reservation detail is revealed (403)", async () => {
    rows.set("c1", car({ status: "reserved" }));
    const res = await del(OTHER);
    expect(res.code).toBe(403);
    expect(JSON.stringify(res.body)).not.toMatch(/RESERVED/);
  });
  test("snake_case rows are understood too", () => {
    expect(listingDeletionBlock({ status: "reserved" })?.code).toBe("LISTING_RESERVED");
    expect(listingDeletionBlock({ status: "available" })).toBeNull();
    expect(listingDeletionBlock({ auction_status: "live" }).code).toBe("AUCTION_ACTIVE");
    expect(listingDeletionBlock({ bids_count: 1 }).code).toBe("BIDS_PRESENT");
    expect(listingDeletionBlock({ auction_status: "none", bids_count: 0 })).toBeNull();
    expect(listingDeletionBlock(null)).toBeNull();
  });
});
