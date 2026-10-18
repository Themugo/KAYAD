// ============================================================
// STAGE 1 FOUNDATION (2026-10-18) — listing write-boundary regressions.
//
//   S1-LIST-01  PUT /cars/:id let the listing's own seller change moderation /
//               verification / promotion fields (status, ntsaVerified,
//               logbookVerified, dutyStatus, isPromoted, promotionExpiresAt)
//               because updateCarSchema is non-strict and validateCar merges.
//   S1-LIST-02  PUT /cars/:id let the client overwrite the server-computed
//               escrowEnabled (Stage 9 invariant held only on create).
//   S1-LIST-03  Any STAFF_ROLES member (e.g. ghost_checker) could edit/delete
//               any listing; now requires MANAGE_CARS (staff) or ownership.
//   S1-LIST-04  PATCH /dealer/cars/bulk-status wrote any status string
//               (incl. admin-only "rejected", values outside the CHECK) and
//               reported success when the write failed.
// ============================================================
import { describe, test, expect, beforeEach, afterAll, jest } from "@jest/globals";
import http from "node:http";
import express from "express";

// ── carController dependency mocks ────────────────────────────
let carRow;
const saved = [];
const makeCarDoc = () => {
  const doc = { ...carRow, priceHistory: [...(carRow.priceHistory || [])] };
  Object.defineProperty(doc, "save", { enumerable: false, value: jest.fn(async () => { saved.push({ ...doc }); return doc; }) });
  Object.defineProperty(doc, "toObject", { enumerable: false, value: () => ({ ...carRow }) });
  return doc;
};
const softDelete = jest.fn(async () => ({}));
jest.unstable_mockModule("../../models/Car.js", () => ({
  default: { findById: jest.fn(async () => (carRow ? makeCarDoc() : null)), softDelete },
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
  logVehicleCreated: jest.fn(), logVehicleEdited: jest.fn(async () => {}), logVehicleDeleted: jest.fn(async () => {}),
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
jest.unstable_mockModule("../../db/index.js", () => ({
  findAll: jest.fn(), findById: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), paginate: jest.fn(), count: jest.fn(),
}));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn() }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn() }));
jest.unstable_mockModule("../../services/auctionLifecycle.service.js", () => ({ startAuction: jest.fn(), extendAuction: jest.fn(), closeAuction: jest.fn() }));
jest.unstable_mockModule("../../services/mpesaB2C.service.js", () => ({ disburseB2C: jest.fn() }));
jest.unstable_mockModule("../../services/dealerVerificationService.js", () => ({ submitDealerVerification: jest.fn() }));

const { updateCar, deleteCar } = await import("../../controllers/carController.js");
const dealerRoutes = (await import("../../routes/dealerRoutes.js")).default;
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");

const mkRes = () => {
  const r = { code: 200 };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};
const SELLER = { id: "seller-1", role: "dealer", effectiveRole: "dealer" };
const OTHER_SELLER = { id: "seller-2", role: "dealer", effectiveRole: "dealer" };
const ADMIN = { id: "admin-1", role: "admin", effectiveRole: "admin" };
const GHOST = { id: "ghost-1", role: "ghost_checker", effectiveRole: "ghost_checker" };
const OWNER = { id: "own-1", role: "superadmin", effectiveRole: "webhoist" };
const baseCar = () => ({
  id: "car-1", _id: "car-1", dealer: "seller-1", title: "Prado", price: 5_000_000, status: "pending",
  ntsaVerified: false, logbookVerified: false, dutyStatus: null, isPromoted: false, promotionExpiresAt: null,
  escrowEnabled: false, auctionStatus: "draft", images: [], coverImage: 0, priceHistory: [],
});
const put = async (user, body) => { const res = mkRes(); await updateCar({ params: { id: "car-1" }, user, body: { ...body }, get: () => undefined }, res); return res; };

describe("S1-LIST-01 seller cannot self-moderate, self-verify or self-promote through PUT /cars/:id", () => {
  beforeEach(() => { carRow = baseCar(); saved.length = 0; });
  test.each([
    ["status", "available"],
    ["ntsaVerified", true],
    ["logbookVerified", true],
    ["dutyStatus", "paid"],
    ["isPromoted", true],
    ["promotionExpiresAt", "2099-01-01T00:00:00.000Z"],
  ])("seller changing %s → 403 LISTING_FIELD_ADMIN_ONLY, nothing saved", async (field, value) => {
    const res = await put(SELLER, { [field]: value });
    expect(res.code).toBe(403);
    expect(res.body.code).toBe("LISTING_FIELD_ADMIN_ONLY");
    expect(saved).toHaveLength(0);
  });
  test("seller round-tripping unchanged protected values with a real edit succeeds", async () => {
    const res = await put(SELLER, { title: "Prado TX", status: "pending", ntsaVerified: false, isPromoted: "false" });
    expect(res.code).toBe(200);
    expect(saved.at(-1).title).toBe("Prado TX");
    expect(saved.at(-1).status).toBe("pending");
  });
  test("admin may still change moderation/verification fields via the edit path", async () => {
    const res = await put(ADMIN, { ntsaVerified: true, status: "available" });
    expect(res.code).toBe(200);
    expect(saved.at(-1)).toMatchObject({ ntsaVerified: true, status: "available" });
  });
});

describe("S1-LIST-02 escrowEnabled stays server-computed on edit", () => {
  beforeEach(() => { carRow = baseCar(); saved.length = 0; });
  test("client escrowEnabled:true is ignored for the seller", async () => {
    const res = await put(SELLER, { title: "Prado VX", escrowEnabled: true });
    expect(res.code).toBe(200);
    expect(saved.at(-1).escrowEnabled).toBe(SERVER_ESCROW);
  });
  test("client escrowEnabled:true is ignored for staff too", async () => {
    await put(ADMIN, { escrowEnabled: true });
    expect(saved.at(-1).escrowEnabled).toBe(SERVER_ESCROW);
  });
});

describe("S1-LIST-03 cross-owner edit/delete requires listing-management authority", () => {
  beforeEach(() => { carRow = baseCar(); saved.length = 0; softDelete.mockClear(); });
  test("ghost_checker cannot edit another seller's listing", async () => {
    expect((await put(GHOST, { title: "x" })).code).toBe(403);
    expect(saved).toHaveLength(0);
  });
  test("another dealer cannot edit it", async () => expect((await put(OTHER_SELLER, { title: "x" })).code).toBe(403));
  test("platform owner can edit it", async () => expect((await put(OWNER, { title: "Owner fix" })).code).toBe(200));
  test("ghost_checker cannot delete it", async () => {
    const res = mkRes();
    await deleteCar({ params: { id: "car-1" }, user: GHOST }, res);
    expect(res.code).toBe(403);
    expect(softDelete).not.toHaveBeenCalled();
  });
  test("admin can delete it", async () => {
    const res = mkRes();
    await deleteCar({ params: { id: "car-1" }, user: ADMIN }, res);
    expect(softDelete).toHaveBeenCalledWith("car-1", "admin-1");
  });
});

describe("S1-LIST-04 dealer bulk-status", () => {
  let server; let base;
  beforeEach(async () => {
    dealerCars = [
      { id: "c1", dealer: "seller-1", status: "pending" },
      { id: "c2", dealer: "seller-1", status: "rejected" },
      { id: "c3", dealer: "seller-2", status: "pending" },
    ];
    updateError = null; lastUpdate = null; currentUser = SELLER;
    if (!server) {
      const app = express();
      app.use(express.json());
      app.use("/api/dealer", dealerRoutes);
      app.use((err, _req, res, _next) => res.status(500).json({ success: false }));
      server = http.createServer(app);
      await new Promise((r) => server.listen(0, "127.0.0.1", r));
      base = `http://127.0.0.1:${server.address().port}`;
    }
  });
  afterAll(() => server && server.close());
  const patch = (body) => fetch(`${base}/api/dealer/cars/bulk-status`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }).then(async (r) => ({ code: r.status, body: await r.json() }));

  test("admin-only 'rejected' is refused", async () => {
    const r = await patch({ ids: ["c1"], status: "rejected" });
    expect(r.code).toBe(400);
    expect(lastUpdate).toBeNull();
  });
  test("a status outside the cars.status CHECK is refused", async () => {
    expect((await patch({ ids: ["c1"], status: "deleted" })).code).toBe(400);
  });
  test("dashboard 'active' maps to canonical 'available' (auto_publish + approved seller)", async () => {
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" });
    currentUser = { ...SELLER, status: "approved" };
    const r = await patch({ ids: ["c1"], status: "active" });
    expect(r.code).toBe(200);
    expect(lastUpdate.patch).toEqual({ status: "available" });
  });
  test("STAGE 5: hold_for_review refuses seller self-publication", async () => {
    __setOnboardingPolicyForTests({ listingModeration: "hold_for_review" });
    currentUser = { ...SELLER, status: "approved" };
    const r = await patch({ ids: ["c1"], status: "available" });
    expect(r.code).toBe(403);
    expect(r.body.code).toBe("LISTING_PUBLICATION_REQUIRES_REVIEW");
    expect(lastUpdate).toBeNull();
  });
  test("only own, non-rejected listings are touched", async () => {
    const r = await patch({ ids: ["c1", "c2", "c3"], status: "sold" });
    expect(r.body.modified).toBe(1);
    expect(lastUpdate.ids).toEqual(["c1"]);
  });
  test("a failed write is not reported as success", async () => {
    updateError = { message: "violates check constraint" };
    const r = await patch({ ids: ["c1"], status: "hidden" });
    expect(r.code).toBe(500);
    expect(r.body.success).toBe(false);
  });
});
