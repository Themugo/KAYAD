// Personal listing photo removal: server-side ownership, last-photo rule, and storage-cleanup ordering (REAL carController.deleteCarImage).
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

let doc; let order; let storageFails; let audits = [];
const Car = { findById: jest.fn(async () => doc), findByIdAndUpdate: jest.fn(async () => ({})), find: jest.fn(), softDeleteGuarded: jest.fn(), countBidRows: jest.fn() };
jest.unstable_mockModule("../../models/Car.js", () => ({ default: Car }));
const User = { findById: jest.fn(() => ({ select: async () => ({}) })), findByIdAndUpdate: jest.fn(async () => ({})) };
const deleteImage = jest.fn(async () => { order.push("storage"); if (storageFails) throw new Error("storage down"); });
jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule("../../utils/cache.js", () => ({ cacheDelPattern: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({ uploadMultiple: jest.fn(), deleteImage }));
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

const { deleteCarImage } = await import("../../controllers/carController.js");
const OWNER = { id: "u1", role: "user", effectiveRole: "user" };
const OTHER = { id: "u2", role: "user", effectiveRole: "user" };
const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const mkCar = (over = {}) => { const c = { _id: "c1", id: "c1", dealer: "u1", status: "available", coverImage: 0, deletedAt: null,
  images: [{ url: "a", public_id: "pa" }, { url: "b", public_id: "pb" }], ...over };
  c.save = jest.fn(async () => { order.push("save"); }); return c; };
beforeEach(() => { order = []; storageFails = false; audits = []; jest.clearAllMocks(); doc = mkCar(); });

describe("personal listing photo removal", () => {
  test("a different personal account cannot remove photos", async () => {
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "0" }, user: OTHER }, res);
    expect(res.code).toBe(403); expect(doc.save).not.toHaveBeenCalled(); expect(deleteImage).not.toHaveBeenCalled();
  });
  test("owner removal saves the listing BEFORE deleting storage (no broken reference if save fails)", async () => {
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "1" }, user: OWNER }, res);
    expect(res.code).toBe(200); expect(order).toEqual(["save", "storage"]); expect(res.body.data.images).toHaveLength(1);
  });
  test("a failed save never deletes the stored file", async () => {
    doc.save = jest.fn(async () => { throw new Error("db down"); });
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "1" }, user: OWNER }, res);
    expect(res.code).toBe(500); expect(deleteImage).not.toHaveBeenCalled();
  });
  test("a storage cleanup failure does not fail the request or restore the reference", async () => {
    storageFails = true;
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "0" }, user: OWNER }, res);
    expect(res.code).toBe(200); expect(res.body.data.images.map((i) => i.url)).toEqual(["b"]);
  });
  test("the last photo of a published listing cannot be removed (server rule)", async () => {
    doc = mkCar({ images: [{ url: "a", public_id: "pa" }] });
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "0" }, user: OWNER }, res);
    expect(res.code).toBe(409); expect(res.body.code).toBe("LAST_PHOTO_REQUIRED"); expect(doc.save).not.toHaveBeenCalled(); expect(deleteImage).not.toHaveBeenCalled();
  });
  test("the last photo of a draft may be removed", async () => {
    doc = mkCar({ status: "draft", images: [{ url: "a", public_id: "pa" }] });
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "0" }, user: OWNER }, res);
    expect(res.code).toBe(200); expect(res.body.data.coverImage).toBe(0);
  });
  test("cover index follows the removed photo", async () => {
    doc = mkCar({ coverImage: 1, images: [{ url: "a" }, { url: "b" }, { url: "c" }] });
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "0" }, user: OWNER }, res);
    expect(res.body.data.coverImage).toBe(0); expect(res.body.data.images.map((i) => i.url)).toEqual(["b", "c"]);
  });
  test("an invalid index is rejected", async () => {
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "9" }, user: OWNER }, res);
    expect(res.code).toBe(400);
  });
});
