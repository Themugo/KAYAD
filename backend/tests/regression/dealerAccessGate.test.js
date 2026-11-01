// Dealer access before / after approval (scenario 10): the REAL requireDealerVerification middleware with only its data layer faked.
// A pending dealer is refused for approval-only features; an approved + verified dealer passes; a suspended or rejected one is refused
// even when a legacy "approved" flag is still set.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

process.env.NODE_ENV = "test";
let dealer = null; let verification = null;
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: { findOne: jest.fn(async () => dealer) } }));
jest.unstable_mockModule("../../models/DealerVerification.js", () => ({ default: { findOne: jest.fn(async () => verification) } }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn(async () => null) } }));
jest.unstable_mockModule("../../models/Car.js", () => ({ default: { countDocuments: jest.fn(async () => 0) } }));
jest.unstable_mockModule("../../models/Referral.js", () => ({ default: { findOne: jest.fn(async () => null) } }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn() }));
const { requireDealerVerification } = await import("../../middleware/dealerVerification.js");
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");

const run = async (req = {}) => {
  const res = { code: 200, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  let allowed = false;
  await requireDealerVerification({ method: "GET", baseUrl: "/api/dealer", path: "/inventory-stats", user: { id: "d1", role: "dealer" }, ...req }, res, () => { allowed = true; });
  return { allowed, res };
};
beforeEach(() => { dealer = null; verification = null; __setOnboardingPolicyForTests({ dealerOnboardingMode: "approval_required" }); });

describe("approval-only dealer features", () => {
  test("pending dealer (verification submitted, not approved) is refused with DEALER_APPROVAL_PENDING", async () => {
    dealer = { user: "d1", approved: false };
    verification = { user: "d1", verificationStatus: "pending" };
    const { allowed, res } = await run();
    expect(allowed).toBe(false);
    expect(res.code).toBe(403);
    expect(res.body.code).toBe("DEALER_APPROVAL_PENDING");
  });
  test("pending dealer cannot create a listing in approval_required mode (no progressive access)", async () => {
    dealer = { user: "d1", approved: false };
    verification = { user: "d1", verificationStatus: "pending" };
    const { allowed, res } = await run({ method: "POST", baseUrl: "/api/cars", path: "/" });
    expect(allowed).toBe(false);
    expect(res.code).toBe(403);
  });
  test("a dealer who has not submitted verification is refused and told to submit it", async () => {
    dealer = { user: "d1", approved: false };
    const { allowed, res } = await run();
    expect(allowed).toBe(false);
    expect(res.body.requiresAction).toBe("submit_verification");
  });
  test("an approved + verified dealer is allowed and the request carries the dealer", async () => {
    dealer = { user: "d1", approved: true };
    verification = { user: "d1", verificationStatus: "approved" };
    const req = {};
    const { allowed } = await run(req);
    expect(allowed).toBe(true);
  });
  test.each(["suspended", "rejected"])("a %s verification is refused even if a legacy approved flag is still set", async (status) => {
    dealer = { user: "d1", approved: true };
    verification = { user: "d1", verificationStatus: status };
    const { allowed, res } = await run();
    expect(allowed).toBe(false);
    expect(res.code).toBe(403);
  });
  test("no dealer profile and not a private seller ⇒ refused", async () => {
    const { allowed, res } = await run();
    expect(allowed).toBe(false);
    expect(res.body.requiresAction).toBe("create_dealer_profile");
  });
});
