// ============================================================
// STAGE 5F.16 — DEALER LIFECYCLE INVARIANTS (regression pins)
//
// Phase B of the stage asks that these invariants be pinned by tests rather than only by source inspection:
//   1. A suspended or rejected dealer cannot obtain privileges from a stale legacy `dealers.approved` flag.
//   2. Approval of the dealer and approval of a listing are separate operations.
//   3. Dealer approval/suspension/rejection never bulk-mutates listings or account records.
//   4. Legal verification transitions are explicit; an illegal one is refused and writes nothing.
//
// Real requireDealerVerification middleware and real dealerVerificationService. Persistence is faked
// (EVIDENCE TIER: M, mocked local runtime). No authorization logic is mocked: the guard under test is the real code.
// ============================================================
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

process.env.NODE_ENV = "test";
const U = "11111111-1111-4111-8111-111111111111";
const V = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const D = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

// ── model mocks for the middleware ────────────────────────────
const dealerModel = { findOne: jest.fn(), create: jest.fn() };
const verificationModel = { findOne: jest.fn() };
const carModel = { countDocuments: jest.fn().mockResolvedValue(0), create: jest.fn() };
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: dealerModel }));
jest.unstable_mockModule("../../models/DealerVerification.js", () => ({ default: verificationModel }));
jest.unstable_mockModule("../../models/Car.js", () => ({ default: carModel }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findOne: jest.fn(), findById: jest.fn() } }));
jest.unstable_mockModule("../../models/Referral.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: { findOne: () => ({ lean: async () => ({}) }) } }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({}), isSupabaseConnected: () => true }));

// ── db adapter emulation for the decision service: records every table it writes ────────────
let tables; let writes;
const matches = (row, filter) => Object.entries(filter).every(([k, v]) => row[k] === v);
const db = {
  findById: jest.fn(async (t, id) => { const r = tables[t].find((x) => x.id === id); return r ? { ...r } : null; }),
  findOne: jest.fn(async (t, f) => tables[t].find((x) => matches(x, f)) ?? null),
  findAll: jest.fn(async () => ({ data: [], count: 0 })),
  create: jest.fn(async (t) => { writes.push(`create:${t}`); throw new Error("unexpected create"); }),
  count: jest.fn(),
  update: jest.fn(async (t, id, patch) => { writes.push(`update:${t}`); const r = tables[t].find((x) => x.id === id); Object.assign(r, patch); return { ...r }; }),
  updateMany: jest.fn(async (t, f, patch) => { writes.push(`updateMany:${t}`); const hit = tables[t].filter((x) => matches(x, f)); hit.forEach((x) => Object.assign(x, patch)); return hit.map((x) => ({ ...x })); }),
};
jest.unstable_mockModule("../../db/index.js", () => db);

const { requireDealerVerification, checkDealerVerificationStatus } = await import("../../middleware/dealerVerification.js");
const { transitionDealerVerification } = await import("../../services/dealerVerificationService.js");
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");

const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const guard = async (req = {}) => {
  const r = mkRes(); const next = jest.fn();
  await requireDealerVerification({ user: { id: U, role: "dealer" }, method: "POST", baseUrl: "/api/auction", path: "/start", ...req }, r, next);
  return { r, next };
};

beforeEach(() => {
  jest.clearAllMocks();
  __setOnboardingPolicyForTests({});
  dealerModel.findOne.mockReset(); verificationModel.findOne.mockReset();
  carModel.countDocuments.mockResolvedValue(0);
  writes = [];
  tables = {
    dealer_verifications: [{ id: V, dealer: D, verificationStatus: "pending" }],
    dealers: [{ id: D, approved: false, isSuspended: false }],
    cars: [{ id: "c-pending", status: "pending", dealer: U }, { id: "c-live", status: "available", dealer: U }, { id: "c-sold", status: "sold", dealer: U }],
    users: [{ id: U, status: "pending" }],
  };
});

describe("I1 — a stale legacy approval flag never overrides a current suspension or rejection", () => {
  test.each([
    ["suspended", 403, "DEALER_ACCOUNT_SUSPENDED"],
    ["rejected", 403, "DEALER_VERIFICATION_REJECTED"],
  ])("dealers.approved=true + verification %s ⇒ %s", async (status, code, errCode) => {
    dealerModel.findOne.mockResolvedValue({ approved: true });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: status, suspensionReason: "x", rejectionReason: "y" });
    const { r, next } = await guard();
    expect(next).not.toHaveBeenCalled();
    expect(r.code).toBe(code);
    expect(r.body.code).toBe(errCode);
  });

  test.each(["POST", "PATCH", "GET"])("the block applies to %s requests as well as listing creation", async (method) => {
    dealerModel.findOne.mockResolvedValue({ approved: true });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: "suspended" });
    const { r, next } = await guard({ method });
    expect(next).not.toHaveBeenCalled();
    expect(r.code).toBe(403);
  });

  test("a rejection response tells the dealer to resubmit and exposes the stored reason", async () => {
    dealerModel.findOne.mockResolvedValue({ approved: true });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: "rejected", rejectionReason: "Licence unreadable" });
    const { r } = await guard();
    expect(r.body.requiresAction).toBe("resubmit_verification");
    expect(r.body.rejectionReason).toBe("Licence unreadable");
  });

  test("checkDealerVerificationStatus agrees with the middleware (no second, laxer definition)", async () => {
    dealerModel.findOne.mockResolvedValue({ approved: true });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: "suspended" });
    expect(await checkDealerVerificationStatus(U)).toMatchObject({ verified: false, reason: "suspended" });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: "rejected" });
    expect(await checkDealerVerificationStatus(U)).toMatchObject({ verified: false, reason: "rejected" });
  });

  test("an approved dealer with an approved verification record passes", async () => {
    dealerModel.findOne.mockResolvedValue({ approved: true });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: "approved" });
    expect((await guard()).next).toHaveBeenCalled();
  });

  test("legacy-approved dealer with NO verification record still passes (grandfathered)", async () => {
    dealerModel.findOne.mockResolvedValue({ approved: true });
    verificationModel.findOne.mockResolvedValue(null);
    expect((await guard()).next).toHaveBeenCalled();
  });

  test("OWNER DECISION OD-17 pinned: legacy-approved + a PENDING verification is not treated as approved", async () => {
    // Stage 5F.12 behaviour, retained. A legacy-approved dealer who has an open (pending) verification row is held to the
    // pending rules until it is decided. Whether grandfathered dealers should keep access while re-verifying is an owner
    // decision; this test records the current, fail-closed behaviour so a change is deliberate.
    dealerModel.findOne.mockResolvedValue({ approved: true });
    verificationModel.findOne.mockResolvedValue({ verificationStatus: "pending" });
    const { r, next } = await guard();
    expect(next).not.toHaveBeenCalled();
    expect(r.code).toBe(403);
  });

  test("an unapproved dealer without a verification record is told to submit one", async () => {
    dealerModel.findOne.mockResolvedValue({ approved: false });
    verificationModel.findOne.mockResolvedValue(null);
    const { r, next } = await guard();
    expect(next).not.toHaveBeenCalled();
    expect(r.body.requiresAction).toBe("submit_verification");
  });
});

describe("I2/I3 — dealer decisions touch the dealer and its verification record only", () => {
  test("approve: writes dealer_verifications + dealers, never cars or users; pending/live/sold listings unchanged", async () => {
    const before = JSON.stringify(tables.cars);
    await transitionDealerVerification(V, "approved", "admin-1");
    expect(JSON.stringify(tables.cars)).toBe(before);
    expect(new Set(writes.map((w) => w.split(":")[1]))).toEqual(new Set(["dealer_verifications", "dealers"]));
    expect(tables.dealers[0].approved).toBe(true);
  });

  test("approve does not publish a pending listing under ANY moderation policy", async () => {
    for (const listingModeration of ["auto_publish", "hold_for_review"]) {
      tables.dealer_verifications[0].verificationStatus = "pending";
      __setOnboardingPolicyForTests({ listingModeration });
      await transitionDealerVerification(V, "approved", "admin-1");
      expect(tables.cars.find((c) => c.id === "c-pending").status).toBe("pending");
    }
  });

  test.each([["pending", "suspended"], ["approved", "suspended"], ["pending", "rejected"]])(
    "%s → %s also leaves every listing as it was", async (from, to) => {
      tables.dealer_verifications[0].verificationStatus = from;
      const before = JSON.stringify(tables.cars);
      await transitionDealerVerification(V, to, "admin-1", { suspensionReason: "audit", rejectionReason: "docs" });
      expect(JSON.stringify(tables.cars)).toBe(before);
      expect(writes.some((w) => w.endsWith(":cars"))).toBe(false);
    });

  test("suspension clears the approved flag's effect: dealers.approved=false, isSuspended=true", async () => {
    tables.dealer_verifications[0].verificationStatus = "approved";
    tables.dealers[0].approved = true;
    await transitionDealerVerification(V, "suspended", "admin-1", { suspensionReason: "Complaints" });
    expect(tables.dealers[0]).toMatchObject({ approved: false, isSuspended: true });
  });

  test("reinstatement is an explicit suspended → approved decision, and un-suspends the dealer", async () => {
    tables.dealer_verifications[0].verificationStatus = "suspended";
    tables.dealers[0] = { id: D, approved: false, isSuspended: true };
    await transitionDealerVerification(V, "approved", "admin-1");
    expect(tables.dealers[0]).toMatchObject({ approved: true, isSuspended: false });
  });
});

describe("I4 — illegal transitions are refused and write nothing", () => {
  test.each([
    ["rejected", "approved"], ["rejected", "suspended"], ["approved", "rejected"], ["approved", "pending"], ["suspended", "rejected"], ["suspended", "pending"],
  ])("%s → %s ⇒ 409, no write", async (from, to) => {
    tables.dealer_verifications[0].verificationStatus = from;
    await expect(transitionDealerVerification(V, to, "admin-1")).rejects.toMatchObject({ statusCode: 409 });
    expect(writes).toEqual([]);
  });

  test("an unknown status is a 400 and writes nothing", async () => {
    await expect(transitionDealerVerification(V, "superapproved", "admin-1")).rejects.toMatchObject({ statusCode: 400 });
    expect(writes).toEqual([]);
  });
});
