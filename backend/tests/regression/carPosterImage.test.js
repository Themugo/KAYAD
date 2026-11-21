// Poster (cover) image: choosing a photo moves it to the front so images[0] and coverImage agree for every consumer (REAL carController.setCoverImage).
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

let saved = []; let findFilters = []; let rows; let bidRows; let decrements; let audits; let beforeWrite;
const blocked = (r) => r.status === "sold" || r.status === "reserved" || ["live", "ended"].includes(r.auctionStatus || "none") || (r.bidsCount || 0) > 0 || !!r.highestBidderId;
const doc = (r) => r && { ...r };
const Car = {
  findById: jest.fn(async (id) => { const r = rows.get(id); if (!r) return null; return Object.assign(r, { save: jest.fn(async () => { saved.push([...r.images]); }) }); }),
  find: jest.fn(), findByIdAndUpdate: jest.fn(), countBidRows: jest.fn(), softDeleteGuarded: jest.fn(), softDelete: jest.fn(),
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
jest.unstable_mockModule("../../services/onboardingPolicy.service.js", () => ({ getOnboardingPolicy: jest.fn(), isPolicyTrusted: jest.fn(), sellerMayPublishDirectly: jest.fn(async () => false) }));



const { setCoverImage } = await import("../../controllers/carController.js");
const OWNER = { id: "d1", role: "dealer", effectiveRole: "dealer" };
const OTHER = { id: "d2", role: "dealer", effectiveRole: "dealer" };
const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const car = (over = {}) => ({ id: "c1", _id: "c1", dealer: "d1", coverImage: 0, images: [{ url: "a" }, { url: "b" }, { url: "c" }], deletedAt: null, ...over });
beforeEach(() => { rows = new Map([["c1", car()]]); saved = []; audits = []; jest.clearAllMocks(); });

describe("choose the poster image", () => {
  test("moves the chosen photo to the front, keeps the rest in order, resets coverImage and audits", async () => {
    const res = mkRes(); await setCoverImage({ params: { id: "c1" }, user: OWNER, body: { index: 2 } }, res);
    expect(res.code).toBe(200);
    expect(res.body.data.images.map((i) => i.url)).toEqual(["c", "a", "b"]);
    expect(res.body.data.coverImage).toBe(0);
    expect(saved).toHaveLength(1);
    expect(audits).toContain("set_car_cover_image");
  });
  test("choosing the photo that is already the poster is a no-op (nothing written)", async () => {
    const res = mkRes(); await setCoverImage({ params: { id: "c1" }, user: OWNER, body: { index: 0 } }, res);
    expect(res.code).toBe(200); expect(saved).toHaveLength(0);
  });
  test.each([[-1], [3], [1.5], ["x"], [undefined]])("invalid index %p is refused", async (index) => {
    const res = mkRes(); await setCoverImage({ params: { id: "c1" }, user: OWNER, body: { index } }, res);
    expect(res.code).toBe(400); expect(saved).toHaveLength(0);
  });
  test("another dealer cannot change it (403) and a missing listing is 404", async () => {
    let res = mkRes(); await setCoverImage({ params: { id: "c1" }, user: OTHER, body: { index: 1 } }, res);
    expect(res.code).toBe(403); expect(saved).toHaveLength(0);
    res = mkRes(); await setCoverImage({ params: { id: "nope" }, user: OWNER, body: { index: 1 } }, res);
    expect(res.code).toBe(404);
  });
  test("a soft-deleted listing is read-only history for its owner", async () => {
    rows.set("c1", car({ deletedAt: "2026-10-01" }));
    const res = mkRes(); await setCoverImage({ params: { id: "c1" }, user: OWNER, body: { index: 1 } }, res);
    expect(res.code).toBe(404); expect(saved).toHaveLength(0);
  });
});
