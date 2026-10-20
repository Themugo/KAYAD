// Onboarding -> first listing, for dealer / private seller / buyer / inspector (mechanic).
import { describe, test, expect, jest, beforeEach, afterEach, afterAll } from "@jest/globals";
import crypto from "crypto";

const U = "11111111-1111-4111-8111-111111111111";
const ADMIN = "99999999-9999-4999-8999-999999999999";
const APP = "55555555-5555-4555-8555-555555555555";

const dealerModel = { findOne: jest.fn(), create: jest.fn() };
const verificationModel = { findOne: jest.fn() };
const carModel = { countDocuments: jest.fn(), create: jest.fn() };
const userModel = { findOne: jest.fn(), create: jest.fn(), findById: jest.fn() };
const userAuthModel = { create: jest.fn(async (d) => d) };
const appModel = { findById: jest.fn(), findOne: jest.fn(), create: jest.fn() };
const sendNotification = jest.fn(async () => ({}));
const deliver = jest.fn(async () => ({ status: "sent" })); // STAGE 5C: the set-password link goes via the gateway, not the in-app notification
const entitlement = jest.fn();

const sbChain = () => { const c = { select: () => c, eq: () => c, is: () => c, maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: { id: "prov" }, error: null }), insert: () => c, update: () => c }; return c; };

jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: dealerModel }));
jest.unstable_mockModule("../../models/DealerVerification.js", () => ({ default: verificationModel }));
jest.unstable_mockModule("../../models/Car.js", () => ({ default: carModel }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: userModel }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: userAuthModel }));
jest.unstable_mockModule("../../models/Referral.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/InspectorApplication.js", () => ({ default: appModel }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: () => ({ lean: async () => ({ freeMarket: true }) }) } }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver, sendUserCommunication: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: () => sbChain() }), isSupabaseConnected: () => true }));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({ getDealerEntitlement: jest.fn(), assertDealerCanCreateListing: entitlement }));
jest.unstable_mockModule("../../config/cloudinary.js", () => ({ uploadMultiple: jest.fn(), deleteImage: jest.fn() }));
jest.unstable_mockModule("../../middleware/upload.js", () => ({ cleanupFiles: jest.fn() }));
jest.unstable_mockModule("../../utils/cache.js", () => ({ cacheDelPattern: jest.fn() }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn() }));
jest.unstable_mockModule("../../services/duplicateVehicleService.js", () => ({ detectDuplicates: jest.fn(), flagDuplicate: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logVehicleCreated: jest.fn(), logVehicleEdited: jest.fn(), logVehicleDeleted: jest.fn() }));
jest.unstable_mockModule("../../utils/atomicTransactions.js", () => ({ atomicCreateDealerListing: jest.fn() }));
jest.unstable_mockModule("../../services/mediaRecovery.service.js", () => ({ registerMediaUploadJob: jest.fn(async () => ({})), registerMediaUploadFailure: jest.fn(async () => ({})), completeMediaUpload: jest.fn(async () => ({})) }));

const { requireDealerVerification, isListingCreationRequest } = await import("../../middleware/dealerVerification.js");
const { approveApplication } = await import("../../controllers/inspectorApplicationController.js");
const { createCar } = await import("../../controllers/carController.js");
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");
beforeEach(() => __setOnboardingPolicyForTests({})); // STAGE 5 default: approval_required

const res = () => { const r = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } }; return r; };
beforeEach(() => { jest.clearAllMocks(); });

describe("isListingCreationRequest (mounted-router path)", () => {
  test.each([
    ["POST", "/api/cars", "/", true],
    ["POST", "/api/cars", "", true],
    ["POST", "/api/dealer-platform", "/inventory", true],
    ["POST", "/api/v1/cars", "/", true],
    ["GET", "/api/cars", "/", false],
    ["POST", "/api/cars", "/123/bid", false],
    ["POST", "/api/auth", "/register", false],
  ])("%s %s%s -> %s", (method, baseUrl, path, want) => {
    expect(isListingCreationRequest({ method, baseUrl, path })).toBe(want);
  });
});

describe("requireDealerVerification: who can list on day one", () => {
  const run = async (user, req = {}) => { const r = res(); const next = jest.fn(); await requireDealerVerification({ user, method: "POST", baseUrl: "/api/cars", path: "/", ...req }, r, next); return { r, next }; };

  test("private seller with no dealer row is auto-provisioned and may list", async () => {
    dealerModel.findOne.mockResolvedValue(null);
    dealerModel.create.mockResolvedValue({ approved: true });
    const { next } = await run({ id: U, role: "individual_seller" });
    expect(dealerModel.create).toHaveBeenCalledWith(expect.objectContaining({ user: U, approved: true }));
    expect(next).toHaveBeenCalled();
  });

  test("new dealer (unapproved, verification submitted) gets progressive access for their first 3 cars ONLY in self_onboarding mode", async () => {
    __setOnboardingPolicyForTests({ dealerOnboardingMode: "self_onboarding" });
    dealerModel.findOne.mockResolvedValue({ approved: false });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: "pending" });
    carModel.countDocuments.mockResolvedValue(0);
    const { next } = await run({ id: U, role: "dealer" });
    expect(next).toHaveBeenCalled();
  });

  test("progressive access ends at 3 cars", async () => {
    dealerModel.findOne.mockResolvedValue({ approved: false });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: "pending" });
    carModel.countDocuments.mockResolvedValue(3);
    const { r, next } = await run({ id: U, role: "dealer" });
    expect(next).not.toHaveBeenCalled();
    expect(r.code).toBe(403);
  });

  test("progressive access never applies to non-creation requests", async () => {
    dealerModel.findOne.mockResolvedValue({ approved: false });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: "pending" });
    carModel.countDocuments.mockResolvedValue(0);
    const { next } = await run({ id: U, role: "dealer" }, { method: "PUT", path: "/abc" });
    expect(next).not.toHaveBeenCalled();
  });

  test("rejected dealer and dealer who never submitted verification are blocked with a clear next step", async () => {
    dealerModel.findOne.mockResolvedValue({ approved: false });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: "rejected" });
    expect((await run({ id: U, role: "dealer" })).r.code).toBe(403);
    verificationModel.findOne.mockResolvedValue(null);
    const { r } = await run({ id: U, role: "dealer" });
    expect(r.code).toBe(403);
    expect(r.body.requiresAction).toBe("submit_verification");
  });
});

describe("createCar surfaces entitlement errors instead of a 500", () => {
  test("dealer with no subscription gets 402 SUBSCRIPTION_REQUIRED", async () => {
    userModel.findById.mockReturnValue({ select: async () => ({ id: U, role: "dealer", status: "pending" }) });
    carModel.countDocuments.mockResolvedValue(0);
    entitlement.mockRejectedValue(Object.assign(new Error("An active dealer subscription is required to list vehicles."), { code: "SUBSCRIPTION_REQUIRED", status: 402 }));
    const r = res();
    await createCar({ user: { id: U, role: "dealer" }, body: {}, files: [] }, r);
    expect(r.code).toBe(402);
    expect(r.body.code).toBe("SUBSCRIPTION_REQUIRED");
  });
  test("unexpected errors are still a generic 500", async () => {
    userModel.findById.mockReturnValue({ select: async () => { throw new Error("db exploded"); } });
    const r = res();
    await createCar({ user: { id: U, role: "dealer" }, body: {}, files: [] }, r);
    expect(r.code).toBe(500);
    expect(r.body.message).toBe("Failed to create car");
  });
});

describe("inspector (mechanic) approval", () => {
  const application = () => ({ id: APP, user: null, email: "mech@x.co", fullName: "Mo Mechanic", phone: "+254700000000", location: "Nairobi", specialties: ["engine"], status: "pending", save: jest.fn(async () => {}) });
  const approve = async () => { const r = res(); await approveApplication({ params: { id: APP }, body: {}, user: { id: ADMIN } }, r); return r; };

  test("new inspector: account created, role ghost_checker, a single-use hashed set-password link is issued", async () => {
    appModel.findById.mockResolvedValue(application());
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({ id: U, _id: U, role: "ghost_checker", email: "mech@x.co" });
    const r = await approve();
    expect(r.code).toBe(200);
    expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({ role: "ghost_checker", status: "approved" }));
    const auth = userAuthModel.create.mock.calls[0][0];
    expect(auth.resetToken).toMatch(/^[0-9a-f]{64}$/);
    expect(auth.resetTokenExpire).toBeInstanceOf(Date);
    // STAGE 5C: the in-app notification must NOT carry the token; the emailed link does.
    expect(sendNotification.mock.calls[0][0].message).not.toMatch(/token=/);
    const msg = deliver.mock.calls[0][0].text;
    expect(deliver.mock.calls[0][0].recipient).toBe("mech@x.co");
    const raw = decodeURIComponent(msg.match(/token=([0-9a-f]{64})/)[1]);
    expect(crypto.createHash("sha256").update(raw).digest("hex")).toBe(auth.resetToken);
  });

  test.each(["dealer", "individual_seller", "admin", "superadmin", "escrow_officer"])("existing %s sharing the email is NOT converted to an inspector", async (role) => {
    appModel.findById.mockResolvedValue(application());
    const existing = { id: U, _id: U, role, status: "approved", save: jest.fn() };
    userModel.findOne.mockResolvedValue(existing);
    const r = await approve();
    expect(r.code).toBe(409);
    expect(existing.role).toBe(role);
    expect(existing.save).not.toHaveBeenCalled();
  });

  test("STAGE 5C: existing buyer with an UNVERIFIED mailbox is refused (no squatter promotion)", async () => {
    appModel.findById.mockResolvedValue(application());
    const existing = { id: U, _id: U, role: "user", status: "approved", emailVerified: false, save: jest.fn() };
    userModel.findOne.mockResolvedValue(existing);
    const r = await approve();
    expect(r.code).toBe(409);
    expect(r.body.code).toBe("INSPECTOR_EMAIL_UNVERIFIED");
    expect(existing.role).toBe("user");
    expect(existing.save).not.toHaveBeenCalled();
  });

  test("existing VERIFIED buyer is converted and told to log in (no new password link)", async () => {
    appModel.findById.mockResolvedValue(application());
    const existing = { id: U, _id: U, role: "user", status: "approved", emailVerified: true, save: jest.fn(async () => {}) };
    userModel.findOne.mockResolvedValue(existing);
    const r = await approve();
    expect(r.code).toBe(200);
    expect(existing.role).toBe("ghost_checker");
    expect(userAuthModel.create).not.toHaveBeenCalled();
    expect(sendNotification.mock.calls[0][0].message).not.toMatch(/token=/);
  });
});

// ─────────────────────────────────────────────────────────────
// STAGE 5 — the owner's onboarding policy actually controls the workflow.
// ─────────────────────────────────────────────────────────────
describe("STAGE 5 requireDealerVerification follows the owner's dealer mode", () => {
  const run = async (user, req = {}) => { const r = res(); const next = jest.fn(); await requireDealerVerification({ user, method: "POST", baseUrl: "/api/cars", path: "/", ...req }, r, next); return { r, next }; };
  const pending = () => { dealerModel.findOne.mockResolvedValue({ approved: false }); verificationModel.findOne.mockResolvedValue({ verificationStatus: "pending" }); carModel.countDocuments.mockResolvedValue(0); };

  test.each(["approval_required", "closed"])("mode %s: a pending dealer cannot create listings (no progressive access)", async (mode) => {
    __setOnboardingPolicyForTests({ dealerOnboardingMode: mode });
    pending();
    const { r, next } = await run({ id: U, role: "dealer" });
    expect(next).not.toHaveBeenCalled();
    expect(r.code).toBe(403);
    expect(r.body.code).toBe("DEALER_APPROVAL_PENDING");
  });
  test("self_onboarding: a pending dealer gets limited progressive access (still not 'verified')", async () => {
    __setOnboardingPolicyForTests({ dealerOnboardingMode: "self_onboarding" });
    pending();
    const { next } = await run({ id: U, role: "dealer" });
    expect(next).toHaveBeenCalled();
  });
  test("untrusted policy (unavailable) behaves like approval_required, never like self_onboarding", async () => {
    __setOnboardingPolicyForTests({ dealerOnboardingMode: "self_onboarding" }, "unavailable");
    pending();
    const { next, r } = await run({ id: U, role: "dealer" });
    expect(next).not.toHaveBeenCalled();
    expect(r.code).toBe(403);
  });
  test.each(["approval_required", "self_onboarding", "closed"])("an APPROVED dealer is unaffected by mode %s", async (mode) => {
    __setOnboardingPolicyForTests({ dealerOnboardingMode: mode });
    dealerModel.findOne.mockResolvedValue({ approved: true });
    // Stage 5F.16: set the verification state explicitly. The check used to inherit whatever verification mock the
    // previous test left behind (a leaked "pending"), which Stage 5F.12 correctly stopped treating as approved.
    verificationModel.findOne.mockResolvedValue(mode === "closed" ? { verificationStatus: "approved" } : null);
    const { next } = await run({ id: U, role: "dealer" });
    expect(next).toHaveBeenCalled();
  });
  test("a rejected dealer is blocked in every mode and told to resubmit", async () => {
    for (const mode of ["approval_required", "self_onboarding"]) {
      __setOnboardingPolicyForTests({ dealerOnboardingMode: mode });
      dealerModel.findOne.mockResolvedValue({ approved: false });
      verificationModel.findOne.mockResolvedValue({ verificationStatus: "rejected" });
      const { r } = await run({ id: U, role: "dealer" });
      expect(r.code).toBe(403);
      expect(r.body.requiresAction).toBe("resubmit_verification");
    }
  });
});

describe("STAGE 5 createCar status follows the owner's listing-moderation setting", () => {
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const prev = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  // createCar schedules background media work with setImmediate; let it settle, then restore the env so
  // nothing leaks into other suites that share this worker process.
  afterEach(async () => { await new Promise((r) => setTimeout(r, 25)); });
  afterAll(() => { for (const k of keys) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } });
  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = "x"; process.env.CLOUDINARY_API_KEY = "x"; process.env.CLOUDINARY_API_SECRET = "x";
    carModel.create.mockImplementation(async (b) => ({ _id: "car-1", id: "car-1", ...b }));
    carModel.countDocuments.mockResolvedValue(0);
    userModel.findByIdAndUpdate = jest.fn(async () => ({}));
  });
  const create = async (sellerStatus, extraBody = {}) => {
    userModel.findById.mockReturnValue({ select: async () => ({ id: U, role: "individual_seller", status: sellerStatus, location: "Nairobi" }) });
    const r = res();
    await createCar({ user: { id: U, role: "individual_seller" }, body: { title: "T", status: "available", isVerifiedDealer: true, ...extraBody }, files: [{ path: "/tmp/a.jpg" }], get: () => undefined }, r);
    return r;
  };
  test("hold_for_review: an approved seller's listing is created PENDING", async () => {
    __setOnboardingPolicyForTests({ listingModeration: "hold_for_review" });
    const r = await create("approved");
    expect(r.code).toBe(201);
    expect(carModel.create.mock.calls[0][0].status).toBe("pending");
  });
  test("auto_publish: an approved seller's listing is published; an unapproved seller's stays pending", async () => {
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" });
    expect((await create("approved")).code).toBe(201);
    expect(carModel.create.mock.calls[0][0].status).toBe("available");
    carModel.create.mockClear();
    expect((await create("pending")).code).toBe(201);
    expect(carModel.create.mock.calls[0][0].status).toBe("pending");
  });
  test("unavailable policy holds the listing for review (fail safe)", async () => {
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" }, "unavailable");
    await create("approved");
    expect(carModel.create.mock.calls[0][0].status).toBe("pending");
  });
  test("a client-supplied status is never honoured (mass assignment)", async () => {
    __setOnboardingPolicyForTests({ listingModeration: "hold_for_review" });
    await create("approved", { status: "available", approved: true });
    expect(carModel.create.mock.calls[0][0].status).toBe("pending");
  });
});
