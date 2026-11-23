// Personal listing photo removal: server-side ownership, last-photo rule, and storage-cleanup ordering (REAL carController.deleteCarImage).
import { jest, describe, test, expect, beforeEach, beforeAll, afterAll } from "@jest/globals";

// addCarImages refuses to run when cloud storage is unconfigured (a production guard we must keep). The storage module itself is
// mocked below, so the test only needs the credentials to be *present*; supply placeholders so it does not depend on the runner's env.
const CLOUDINARY_KEYS = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const savedCloudinaryEnv = Object.fromEntries(CLOUDINARY_KEYS.map((k) => [k, process.env[k]]));
beforeAll(() => { for (const k of CLOUDINARY_KEYS) process.env[k] = process.env[k] || "test-placeholder"; });
afterAll(() => { for (const k of CLOUDINARY_KEYS) { if (savedCloudinaryEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedCloudinaryEnv[k]; } });

let doc; let order; let storageFails; let audits = [];
const Car = {
  findById: jest.fn(async () => doc),
  findByIdAndUpdate: jest.fn(async () => ({})),
  findOneAndUpdate: jest.fn(async (_filter, update) => { order.push("save"); Object.assign(doc, update?.$set || {}); return doc; }),
  find: jest.fn(), softDeleteGuarded: jest.fn(), countBidRows: jest.fn(),
};
jest.unstable_mockModule("../../models/Car.js", () => ({ default: Car }));
const User = { findById: jest.fn(() => ({ select: async () => ({}) })), findByIdAndUpdate: jest.fn(async () => ({})) };
const deleteImage = jest.fn(async () => { order.push("storage"); if (storageFails) throw new Error("storage down"); });
const uploadMultiple = jest.fn(async () => [{ url: "https://cdn.example.test/new.jpg", public_id: "new-public-id" }]);
jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn(() => ({ lean: async () => ({ maxListingImages: 20 }) })) } }));
jest.unstable_mockModule("../../utils/cache.js", () => ({ cacheDelPattern: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({ uploadMultiple, deleteImage }));
jest.unstable_mockModule("../../middleware/upload.js", () => ({ cleanupFiles: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true, getSupabase: () => ({}) }));
jest.unstable_mockModule("../../services/personalListingMutationGuard.service.js", () => ({
  getPersonalListingActionEligibility: jest.fn(async () => new Map()),
  assertPersonalListingMutationAllowed: jest.fn(async () => ({ allowed: true })),
  buildPersonalListingMutationFilter: jest.fn(({ car, ownerId, expectedImages }) => ({ id: car.id, dealer: ownerId, images: expectedImages })),
}));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async (req, action) => { audits.push(action); }) }));
jest.unstable_mockModule("../../services/duplicateVehicleService.js", () => ({ detectDuplicates: jest.fn(), flagDuplicate: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logVehicleCreated: jest.fn(), logVehicleEdited: jest.fn(), logVehicleDeleted: jest.fn(async () => { audits.push("vehicle_deleted"); }) }));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({ getDealerEntitlement: jest.fn(), assertDealerCanCreateListing: jest.fn() }));
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({ atomicCreateDealerListing: jest.fn() }));
jest.unstable_mockModule("../../services/mediaRecovery.service.js", () => ({ registerMediaUploadJob: jest.fn(), registerMediaUploadFailure: jest.fn(async () => ({})), completeMediaUpload: jest.fn() }));
jest.unstable_mockModule("../../services/escrowCapability.service.js", () => ({ getEscrowEnabledForNewOrEditedCar: jest.fn(), getEffectiveEscrowForCar: jest.fn() }));
jest.unstable_mockModule("../../utils/publicListingCache.js", () => ({ invalidatePublicListingCaches: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../services/privateSellerAuctionEligibility.service.js", () => ({ evaluateEligibilityBatch: jest.fn() }));
jest.unstable_mockModule("../../services/onboardingPolicy.service.js", () => ({ getOnboardingPolicy: jest.fn(), isPolicyTrusted: jest.fn(), sellerMayPublishDirectly: jest.fn(async () => false) }));

const { deleteCarImage, setCoverImage, addCarImages } = await import("../../controllers/carController.js");
const OWNER = { id: "u1", role: "user", effectiveRole: "user" };
const OTHER = { id: "u2", role: "user", effectiveRole: "user" };
const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const mkCar = (over = {}) => { const c = { _id: "c1", id: "c1", dealer: "u1", status: "available", coverImage: 0, deletedAt: null,
  images: [{ url: "a", public_id: "pa" }, { url: "b", public_id: "pb" }], ...over };
  c.save = jest.fn(async () => { order.push("save"); }); return c; };
beforeEach(() => {
  order = []; storageFails = false; audits = []; jest.clearAllMocks(); doc = mkCar();
  Car.findOneAndUpdate.mockImplementation(async (_filter, update) => { order.push("save"); Object.assign(doc, update?.$set || {}); return doc; });
});

describe("personal listing photo removal", () => {
  test("a different personal account cannot remove photos", async () => {
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "0" }, user: OTHER }, res);
    expect(res.code).toBe(403); expect(doc.save).not.toHaveBeenCalled(); expect(deleteImage).not.toHaveBeenCalled();
  });
  test("owner removal uses a conditional partial update BEFORE deleting storage", async () => {
    const res = mkRes(); await deleteCarImage({ params: { id: "c1", imageIndex: "1" }, user: OWNER }, res);
    expect(res.code).toBe(200); expect(order).toEqual(["save", "storage"]); expect(res.body.data.images).toHaveLength(1);
    expect(Car.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: "c1", dealer: "u1" }), expect.objectContaining({ $set: expect.objectContaining({ images: expect.any(Array), coverImage: 0 }) }), { new: true });
  });
  test("a failed conditional update never deletes the stored file", async () => {
    Car.findOneAndUpdate.mockRejectedValueOnce(new Error("db down"));
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
  test("cover selection uses a conditional photo snapshot update", async () => {
    const res = mkRes(); await setCoverImage({ params: { id: "c1" }, body: { index: 1 }, user: OWNER }, res);
    expect(res.code).toBe(200); expect(res.body.data.coverImage).toBe(0);
    expect(Car.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: "c1", dealer: "u1", images: expect.any(Array) }), expect.objectContaining({ $set: expect.objectContaining({ coverImage: 0 }) }), { new: true });
  });
  test("photo upload attaches new images only after the conditional write succeeds", async () => {
    const res = mkRes(); await addCarImages({ params: { id: "c1" }, files: [{ path: "/tmp/photo.jpg" }], user: OWNER }, res);
    expect(res.code).toBe(200); expect(res.body.data.images).toHaveLength(3);
    expect(Car.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: "c1", dealer: "u1", images: expect.any(Array) }), expect.objectContaining({ $set: expect.objectContaining({ images: expect.any(Array) }) }), { new: true });
  });
  test("a photo upload that loses a concurrent update removes its unattached Cloudinary asset", async () => {
    Car.findOneAndUpdate.mockResolvedValueOnce(null);
    const res = mkRes(); await addCarImages({ params: { id: "c1" }, files: [{ path: "/tmp/photo.jpg" }], user: OWNER }, res);
    expect(res.code).toBe(409); expect(deleteImage).toHaveBeenCalledWith("new-public-id");
  });
});
