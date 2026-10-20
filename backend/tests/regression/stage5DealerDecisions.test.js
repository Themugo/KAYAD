// ============================================================
// STAGE 5 (2026-10-19) — dealer decisions: atomic transitions, no ordinary-admin approval
// unless the owner delegated it, and "dealer approval ≠ listing approval".
// Real verificationController + dealerVerificationService; db adapter emulated.
// ============================================================
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

process.env.NODE_ENV = "test";
const V = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const D = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const TARGET = "tttttttt-tttt-4ttt-8ttt-tttttttttttt";

let tables; let tick;
const matches = (row, filter) => Object.entries(filter).every(([k, v]) => row[k] === v);
const db = {
  findById: jest.fn(async (t, id) => { await tick?.(); const r = tables[t].find((x) => x.id === id); return r ? { ...r } : null; }),
  findOne: jest.fn(async (t, f) => tables[t].find((x) => matches(x, f)) ?? null),
  findAll: jest.fn(async () => []),
  create: jest.fn(), count: jest.fn(),
  update: jest.fn(async (t, id, patch) => { const r = tables[t].find((x) => x.id === id); Object.assign(r, patch); return { ...r }; }),
  updateMany: jest.fn(async (t, f, patch) => { const hit = tables[t].filter((x) => matches(x, f)); hit.forEach((x) => Object.assign(x, patch)); return hit.map((x) => ({ ...x })); }),
};
jest.unstable_mockModule("../../db/index.js", () => db);
jest.unstable_mockModule("../../services/otpService.js", () => ({ createOtpChallenge: jest.fn(), verifyOtpChallenge: jest.fn() }));
const sendNotification = jest.fn(async () => ({}));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({}) }));

const { approveVerification, rejectVerification } = await import("../../controllers/verificationController.js");
const { transitionDealerVerification } = await import("../../services/dealerVerificationService.js");
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");

const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const decide = async (fn, id = V) => { const r = mkRes(); await fn({ params: { id }, body: {}, user: { id: "admin-1" } }, r); return r; };

beforeEach(() => {
  jest.clearAllMocks(); tick = null;
  tables = {
    dealer_verifications: [{ id: V, user: TARGET, dealer: D, verificationStatus: "pending" }],
    dealers: [{ id: D, user: TARGET, approved: false, isSuspended: false }],
    users: [{ id: TARGET, status: "pending" }],
    cars: [{ id: "c1", dealer: TARGET, status: "pending", isVerifiedDealer: false }, { id: "c2", dealer: TARGET, status: "sold", isVerifiedDealer: false }],
  };
  __setOnboardingPolicyForTests({});
});

describe("atomic dealer decisions", () => {
  test("approve flips verification, dealer.approved and users.status together", async () => {
    const r = await decide(approveVerification);
    expect(r.code).toBe(200);
    expect(tables.dealer_verifications[0].verificationStatus).toBe("approved");
    expect(tables.dealers[0].approved).toBe(true);
    expect(tables.users[0].status).toBe("approved");
  });
  test("concurrent approve vs reject: exactly one wins; the loser gets 409 and does not overwrite", async () => {
    // Both decisions read 'pending' before either writes.
    let reads = 0; let release; const gate = new Promise((res) => { release = res; });
    tick = async () => { reads += 1; if (reads === 2) release(); await gate; };
    const [a, b] = await Promise.all([decide(approveVerification), decide(rejectVerification)]);
    expect([a.code, b.code].sort()).toEqual([200, 409]);
    const final = tables.dealer_verifications[0].verificationStatus;
    expect(final).toBe(a.code === 200 ? "approved" : "rejected");
    expect(tables.users[0].status).toBe(a.code === 200 ? "approved" : "rejected");
  });
  test("duplicate decision (approve twice) is a 409, not a second approval", async () => {
    expect((await decide(approveVerification)).code).toBe(200);
    const again = await decide(approveVerification);
    expect(again.code).toBe(409);
  });
  test.each([["approved", "rejected"], ["rejected", "approved"], ["approved", "pending"]])("illegal transition %s → %s is refused", async (from, to) => {
    tables.dealer_verifications[0].verificationStatus = from;
    await expect(transitionDealerVerification(V, to, "admin-1")).rejects.toMatchObject({ statusCode: 409 });
  });
  test("unknown verification id ⇒ 404", async () => {
    expect((await decide(approveVerification, "ffffffff-ffff-4fff-8fff-ffffffffffff")).code).toBe(404);
  });
  test("rejection notifies the dealer and never marks them approved", async () => {
    const r = await decide(rejectVerification);
    expect(r.code).toBe(200);
    expect(tables.dealers[0].approved).toBe(false);
    expect(tables.users[0].status).toBe("rejected");
    expect(sendNotification.mock.calls[0][0].message).toMatch(/rejected/i);
  });
});

describe("dealer approval is NOT listing approval", () => {
  test("hold_for_review: approving the dealer leaves their pending listings pending (still flags the dealer verified)", async () => {
    __setOnboardingPolicyForTests({ listingModeration: "hold_for_review" });
    await decide(approveVerification);
    expect(tables.cars.find((c) => c.id === "c1").status).toBe("pending");
    expect(tables.cars.find((c) => c.id === "c1").isVerifiedDealer).toBe(true);
  });
  test("auto_publish: approving the dealer does NOT bulk-publish pending listings; sold listings are untouched", async () => {
    // Stage 5F.12 / 5F.16 invariant: dealer approval and listing approval are separate decisions. The owner's
    // auto_publish setting governs listings at the point a listing is submitted, never a bulk side effect of approving
    // the business. (This test previously asserted the opposite; the stated requirement changed.)
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" });
    await decide(approveVerification);
    expect(tables.cars.find((c) => c.id === "c1").status).toBe("pending");
    expect(tables.cars.find((c) => c.id === "c2").status).toBe("sold");
  });
  test("untrusted policy never bulk-publishes", async () => {
    __setOnboardingPolicyForTests({ listingModeration: "auto_publish" }, "unavailable");
    await decide(approveVerification);
    expect(tables.cars.find((c) => c.id === "c1").status).toBe("pending");
  });
  test("the approval message does not promise publication", async () => {
    await decide(approveVerification);
    expect(sendNotification.mock.calls[0][0].message).not.toMatch(/now (live|published)/i);
  });
});

describe("dealer journey stages are distinct and server-derived", () => {
  test.each([
    [false, undefined, "email_unverified"],
    [false, { verificationStatus: "approved" }, "email_unverified"], // email unverified always wins
    [true, undefined, "application_not_submitted"],
    [true, { verificationStatus: "pending" }, "pending_approval"],
    [true, { verificationStatus: "approved" }, "approved"],
    [true, { verificationStatus: "rejected" }, "rejected"],
    [true, { verificationStatus: "suspended" }, "suspended"],
    ["true", undefined, "email_unverified"],
  ])("emailVerified=%j verification=%j ⇒ %s", async (emailVerified, verification, stage) => {
    const { deriveDealerOnboardingStage } = await import("../../services/dealerVerificationService.js");
    expect(deriveDealerOnboardingStage({ emailVerified, verification })).toBe(stage);
  });
  test("submitting an application sends an acknowledgement that does not claim approval", async () => {
    tables.dealer_verifications = [];
    db.create.mockImplementation(async (t, row) => { const r = { id: V, ...row }; tables[t].push(r); return r; });
    const { submitVerification } = await import("../../controllers/verificationController.js");
    const r = mkRes();
    await submitVerification({ user: { id: TARGET }, body: { documents: {} } }, r);
    expect(r.code).toBe(200);
    const msg = sendNotification.mock.calls.find((c) => /application received/i.test(c[0].title))?.[0].message;
    expect(msg).toMatch(/waiting for review/i);
    expect(msg).toMatch(/not mean/i);
  });
});
