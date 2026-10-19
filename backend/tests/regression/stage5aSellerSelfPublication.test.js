// ============================================================
// STAGE 5A (2026-10-19) — GATE E: SELLER / DEALER SELF-PUBLICATION IS BLOCKED THROUGH EVERY BULK AND COPY PATH.
//
// Stage 5 implemented the three protections but only PATCH /dealer/cars/bulk-status had a dedicated test. This file adds the
// two that did not (POST /dealer-platform/inventory/bulk → bulkUpdateListings, and POST /dealer/cars/:id/duplicate) and proves
// the owner's moderation setting is honoured independently of the dealer-onboarding mode on all three, plus the Stage 5A
// invariant that a SOLD listing cannot be re-opened/hidden by a seller bulk edit.
// Real route handlers / controllers; persistence faked (EVIDENCE TIER: mocked local runtime).
// ============================================================
import { describe, test, expect, beforeEach, afterAll, jest } from "@jest/globals";
import http from "node:http";
import express from "express";

// ── carController dependency mocks ────────────────────────────
let carRow;
let platformOwned = [];
const saved = [];
const makeCarDoc = () => {
  const doc = { ...carRow, priceHistory: [...(carRow.priceHistory || [])] };
  Object.defineProperty(doc, "save", { enumerable: false, value: jest.fn(async () => { saved.push({ ...doc }); return doc; }) });
  Object.defineProperty(doc, "toObject", { enumerable: false, value: () => ({ ...carRow }) });
  return doc;
};
const softDelete = jest.fn(async () => ({}));
jest.unstable_mockModule("../../models/Car.js", () => ({
  default: { findById: jest.fn(async () => (carRow ? makeCarDoc() : null)), softDelete, find: jest.fn(async () => platformOwned) },
}));
jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    findById: jest.fn(() => ({ select: async () => ({ role: "dealer", listingCount: 1 }) })),
    findByIdAndUpdate: jest.fn(async () => ({})),
  },
}));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule("../../utils/cache.js", () => ({ cacheDelPattern: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({ uploadMultiple: jest.fn(), deleteImage: jest.fn() }));
jest.unstable_mockModule("../../middleware/upload.js", () => ({ cleanupFiles: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logWarn: jest.fn(), logError: jest.fn(), logInfo: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true, getSupabase: () => sb }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../services/duplicateVehicleService.js", () => ({ detectDuplicates: jest.fn(), flagDuplicate: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({
  logAuditEvent: jest.fn(async () => {}), logVehicleCreated: jest.fn(), logVehicleEdited: jest.fn(async () => {}), logVehicleDeleted: jest.fn(async () => {}),
}));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({
  getDealerEntitlement: jest.fn(), assertDealerCanCreateListing: jest.fn(), initiateDealerUpgrade: jest.fn(),
}));
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({ atomicCreateDealerListing: jest.fn() }));
jest.unstable_mockModule("../../services/mediaRecovery.service.js", () => ({
  registerMediaUploadJob: jest.fn(), registerMediaUploadFailure: jest.fn(), completeMediaUpload: jest.fn(),
}));
const SERVER_ESCROW = false;
jest.unstable_mockModule("../../services/escrowCapability.service.js", () => ({
  getEscrowEnabledForNewOrEditedCar: jest.fn(async () => SERVER_ESCROW),
  getEffectiveEscrowForCar: jest.fn(async () => SERVER_ESCROW),
}));

// ── dealerRoutes dependency mocks (route handler under test is real) ──
let dealerCars = [];
let updateError = null;
let lastUpdate = null;
const sb = {
  from: () => {
    const q = {
      _ids: null, _dealer: null, _patch: null,
      select() { return q; },
      in(_c, ids) { q._ids = ids; return q; },
      eq(_c, v) { q._dealer = v; return q; },
      update(p) { q._patch = p; return q; },
      then(res, rej) {
        if (q._patch) {
          lastUpdate = { patch: q._patch, ids: q._ids };
          return Promise.resolve({ error: updateError }).then(res, rej);
        }
        const data = dealerCars.filter((c) => q._ids.includes(c.id) && c.dealer === q._dealer);
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return q;
  },
};
let currentUser;
const pass = (_q, _r, n) => n();
jest.unstable_mockModule("../../middleware/auth.js", () => ({
  protect: (req, _res, next) => { req.user = currentUser; next(); },
  dealerOnly: pass, requireApproved: pass, allowRoles: () => pass,
}));
jest.unstable_mockModule("../../middleware/dealerVerification.js", () => ({ requireDealerVerification: () => pass }));
jest.unstable_mockModule("../../middleware/apiPagination.js", () => ({ getPagination: jest.fn(), withPagination: jest.fn() }));
jest.unstable_mockModule("../../middleware/apiCache.js", () => ({ cacheDealerData: () => pass, cacheAnalytics: () => pass, invalidateCache: () => pass }));
jest.unstable_mockModule("../../services/paymentService.js", () => ({ initiatePayment: jest.fn() }));
jest.unstable_mockModule("../../services/pricingRecommendationService.js", () => ({ getPricingRecommendations: jest.fn() }));
const dbFindOne = jest.fn(); const dbCreate = jest.fn(async (_t, d) => ({ id: "dup-1", ...d }));
jest.unstable_mockModule("../../db/index.js", () => ({
  default: {}, aggregate: jest.fn(), updateMany: jest.fn(), findAll: jest.fn(), findById: jest.fn(), findOne: dbFindOne, create: dbCreate, update: jest.fn(), remove: jest.fn(), paginate: jest.fn(), count: jest.fn(),
}));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn() }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn() }));
jest.unstable_mockModule("../../services/auctionLifecycle.service.js", () => ({ startAuction: jest.fn(), extendAuction: jest.fn(), closeAuction: jest.fn() }));
jest.unstable_mockModule("../../services/mpesaB2C.service.js", () => ({ disburseB2C: jest.fn() }));
jest.unstable_mockModule("../../services/dealerVerificationService.js", () => ({ submitDealerVerification: jest.fn() }));


const { bulkUpdateListings } = await import("../../controllers/dealerPlatformController.js");
const dealerRoutes = (await import("../../routes/dealerRoutes.js")).default;
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");

const mkRes = () => { const r = { code: 200 }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const APPROVED = { id: "seller-1", role: "dealer", effectiveRole: "dealer", status: "approved", emailVerified: true };
const PENDING = { ...APPROVED, status: "pending" };
const mkOwned = (over = {}) => { const d = { id: "c1", _id: "c1", dealer: "seller-1", status: "pending", sold: false, save: jest.fn(async () => {}), ...over }; return d; };
const bulkCall = async (user, body) => { const res = mkRes(); await bulkUpdateListings({ user, body }, res); return res; };

let server; let base;
const startServer = async () => {
  if (server) return;
  const app = express(); app.use(express.json()); app.use("/api/dealer", dealerRoutes);
  app.use((err, _req, res, _next) => res.status(500).json({ success: false }));
  server = http.createServer(app); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}`;
};
afterAll(() => server && server.close());
const post = (path, body) => fetch(`${base}/api/dealer${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }).then(async (r) => ({ code: r.status, body: await r.json().catch(() => ({})) }));
const patch = (path, body) => fetch(`${base}/api/dealer${path}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ code: r.status, body: await r.json().catch(() => ({})) }));

beforeEach(() => { dealerCars = []; updateError = null; lastUpdate = null; currentUser = APPROVED; platformOwned = []; dbCreate.mockClear(); dbFindOne.mockReset(); __setOnboardingPolicyForTests({}); });

describe("POST /dealer-platform/inventory/bulk (bulkUpdateListings)", () => {
  test.each(["available", "active"])("hold_for_review: status %j ⇒ 403 LISTING_PUBLICATION_REQUIRES_REVIEW and NOTHING is saved", async (status) => {
    platformOwned = [mkOwned()];
    __setOnboardingPolicyForTests({ listingModeration: "hold_for_review" });
    const r = await bulkCall(APPROVED, { ids: ["c1"], action: "status", data: { status } });
    expect([r.code, r.body.code]).toEqual([403, "LISTING_PUBLICATION_REQUIRES_REVIEW"]);
    expect(platformOwned[0].save).not.toHaveBeenCalled();
  });
  test.each(["unavailable", "invalid"])("policy source %s ⇒ treated as hold_for_review (never opens publication)", async (source) => {
    platformOwned = [mkOwned()];
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" }, source);
    const r = await bulkCall(APPROVED, { ids: ["c1"], action: "status", data: { status: "available" } });
    expect(r.code).toBe(403);
    expect(platformOwned[0].save).not.toHaveBeenCalled();
  });
  test("auto_publish + approved seller ⇒ allowed", async () => {
    platformOwned = [mkOwned()];
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" });
    const r = await bulkCall(APPROVED, { ids: ["c1"], action: "status", data: { status: "available" } });
    expect(r.code).toBe(200);
    expect(platformOwned[0].status).toBe("available");
  });
  test("auto_publish but seller NOT approved (pending dealer application) ⇒ still blocked", async () => {
    platformOwned = [mkOwned()];
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" });
    const r = await bulkCall(PENDING, { ids: ["c1"], action: "status", data: { status: "available" } });
    expect(r.code).toBe(403);
    expect(platformOwned[0].save).not.toHaveBeenCalled();
  });
  test("non-publishing statuses are unaffected by hold_for_review (a seller may still draft/hide their own)", async () => {
    platformOwned = [mkOwned()];
    __setOnboardingPolicyForTests({ listingModeration: "hold_for_review" });
    const r = await bulkCall(APPROVED, { ids: ["c1"], action: "status", data: { status: "draft" } });
    expect(r.code).toBe(200);
  });
  test("a SOLD listing cannot be changed by a seller bulk edit (409), and no listing in the batch is touched", async () => {
    const a = mkOwned({ id: "c1" }); const sold = mkOwned({ id: "c2", status: "sold", sold: true });
    platformOwned = [a, sold];
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" });
    const r = await bulkCall(APPROVED, { ids: ["c1", "c2"], action: "status", data: { status: "available" } });
    expect([r.code, r.body.code]).toEqual([409, "LISTING_MODERATION_BLOCKED"]);
    expect(a.save).not.toHaveBeenCalled(); expect(sold.save).not.toHaveBeenCalled();
  });
});

describe("PATCH /dealer/cars/bulk-status — sold listings", () => {
  test("a SOLD listing in the batch is skipped, the rest proceed", async () => {
    await startServer();
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" });
    dealerCars = [{ id: "c1", dealer: "seller-1", status: "pending" }, { id: "c2", dealer: "seller-1", status: "sold" }];
    const r = await patch("/cars/bulk-status", { ids: ["c1", "c2"], status: "available" });
    expect(r.code).toBe(200);
    expect(lastUpdate.ids).toEqual(["c1"]);
  });
});

describe("POST /dealer/cars/:id/duplicate — a copy is a NEW listing that follows the moderation policy", () => {
  const original = { id: "orig", dealer: "seller-1", title: "Prado", status: "available", price: 1, createdAt: "x", updatedAt: "y" };
  test("hold_for_review ⇒ the copy is created `pending`, never `available`, even though the original is live", async () => {
    await startServer();
    dbFindOne.mockResolvedValue(original);
    __setOnboardingPolicyForTests({ listingModeration: "hold_for_review" });
    const r = await post("/cars/orig/duplicate");
    expect(r.code).toBe(201);
    expect(dbCreate.mock.calls.at(-1)[1].status).toBe("pending");
    expect(dbCreate.mock.calls.at(-1)[1].title).toBe("Prado (Copy)");
  });
  test("auto_publish + approved seller ⇒ `available`", async () => {
    await startServer();
    dbFindOne.mockResolvedValue(original);
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" });
    await post("/cars/orig/duplicate");
    expect(dbCreate.mock.calls.at(-1)[1].status).toBe("available");
  });
  test("auto_publish but seller not yet approved ⇒ `pending`", async () => {
    await startServer();
    currentUser = PENDING;
    dbFindOne.mockResolvedValue(original);
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" });
    await post("/cars/orig/duplicate");
    expect(dbCreate.mock.calls.at(-1)[1].status).toBe("pending");
  });
  test("untrusted policy ⇒ `pending`", async () => {
    await startServer();
    dbFindOne.mockResolvedValue(original);
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" }, "unavailable");
    await post("/cars/orig/duplicate");
    expect(dbCreate.mock.calls.at(-1)[1].status).toBe("pending");
  });
  test("copying someone else's listing is a 404 and creates nothing", async () => {
    await startServer();
    dbFindOne.mockResolvedValue(null);
    const r = await post("/cars/not-mine/duplicate");
    expect(r.code).toBe(404);
    expect(dbCreate).not.toHaveBeenCalled();
  });
});
