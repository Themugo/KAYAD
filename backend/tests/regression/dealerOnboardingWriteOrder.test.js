// 14.7: onboarding must not write profile/payment data for dealers whose verification is approved or suspended.
import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from "@jest/globals";
import http from "http";
import jwt from "jsonwebtoken";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
process.env.NODE_ENV = "test";
const SECRET = process.env.JWT_SECRET;

const D1 = "11111111-1111-4111-8111-111111111111"; // dealer owner
const D2 = "22222222-2222-4222-8222-222222222222"; // unrelated dealer
const M1 = "33333333-3333-4333-8333-333333333333"; // active team member of D1 (role user)
const B1 = "44444444-4444-4444-8444-444444444444"; // buyer
const S_PENDING = "55555555-5555-4555-8555-555555555551";
const S_APPROVED = "55555555-5555-4555-8555-555555555552";
const S_SUSPENDED = "55555555-5555-4555-8555-555555555553";
const S_REJECTED = "55555555-5555-4555-8555-555555555554";
const U_REVOKED = "66666666-6666-4666-8666-666666666666"; // future capability model: role user, seller capability revoked
const ADMIN = "77777777-7777-4777-8777-777777777777";
const MARKETING = "88888888-8888-4888-8888-888888888888";
const NOBODY = "99999999-9999-4999-8999-999999999999"; // valid UUID, no such dealer

const fixtures = {
  [D1]: { role: "dealer", status: "approved" },
  [D2]: { role: "dealer", status: "approved" },
  [M1]: { role: "user", status: "approved" },
  [B1]: { role: "user", status: "approved" },
  [S_PENDING]: { role: "individual_seller", status: "pending" },
  [S_APPROVED]: { role: "individual_seller", status: "approved" },
  [S_SUSPENDED]: { role: "individual_seller", status: "suspended" },
  [S_REJECTED]: { role: "individual_seller", status: "rejected" },
  [U_REVOKED]: { role: "user", status: "approved", privateSellerStatus: "revoked" },
  [ADMIN]: { role: "admin", status: "approved" },
  [MARKETING]: { role: "marketing", status: "approved" },
};
const users = {};
Object.entries(fixtures).forEach(([id, f]) => { users[id] = { _id: id, id, email: `${id.slice(0, 4)}@example.test`, name: id.slice(0, 4), emailVerified: true, ...f }; });

const chain = (value) => {
  const q = { select: jest.fn(() => q), lean: jest.fn(() => q), catch: jest.fn(() => q), then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return q;
};
const userModel = { findById: jest.fn((id) => chain(users[id] || null)), findByIdAndUpdate: jest.fn(() => chain({})), findOne: jest.fn(() => chain(null)), find: jest.fn(() => chain([])), countDocuments: jest.fn(async () => 0) };

// generic PostgREST-like builder: every call chains, awaiting yields an empty successful result; dealer_teams membership is real fixture data
const TEAMS = [{ id: "t1", dealer: D1, member: M1, role: "sales_agent", permissions: { canListCars: true }, status: "active" }];
const sb = {
  from: jest.fn((table) => {
    const f = {};
    const q = new Proxy({}, {
      get: (_t, prop) => {
        if (prop === "then") {
          const rows = table === "dealer_teams" ? TEAMS.filter((t) => Object.entries(f).every(([k, v]) => t[k] === v)) : [];
          return (res, rej) => Promise.resolve({ data: rows, count: rows.length, error: null }).then(res, rej);
        }
        if (prop === "eq") return (k, v) => { f[k] = v; return q; };
        if (prop === "single" || prop === "maybeSingle") return () => Promise.resolve({ data: null, error: null });
        return () => q;
      },
    });
    return q;
  }),
  rpc: jest.fn(async () => ({ data: null, error: null })),
};
const verif = { current: null };
const dbUpdate = jest.fn(async (t, id, d) => ({ id, ...d }));
const stub = (name) => jest.fn((req, res) => res.json({ success: true, handler: name }));

jest.unstable_mockModule("../../models/User.js", () => ({ default: userModel }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true, getSupabase: () => sb }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../db/index.js", () => ({
  findAll: jest.fn(async () => []), findById: jest.fn(async () => null), findOne: jest.fn(async (t) => (t === "dealer_verifications" ? verif.current : { id: "dl1", user: D1, businessName: "Old" })),
  create: jest.fn(async (t, d) => ({ id: "new", ...d })), update: dbUpdate, remove: jest.fn(async () => ({})),
  paginate: jest.fn(async () => ({ data: [], total: 0 })), count: jest.fn(async () => 0),
}));
jest.unstable_mockModule("../../middleware/apiCache.js", () => ({
  cacheDealerData: (q, s, n) => n(), cacheAnalytics: (q, s, n) => n(), cacheUserData: (q, s, n) => n(), invalidateCache: () => (q, s, n) => n(),
}));
jest.unstable_mockModule("../../services/paymentService.js", () => ({ initiatePayment: jest.fn() }));
jest.unstable_mockModule("../../services/pricingRecommendationService.js", () => ({ getPricingRecommendations: jest.fn(async () => []) }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../services/dealerSubscription.service.js", () => ({ initiateDealerUpgrade: jest.fn(async () => { throw new Error("must not be reached by non-dealers"); }) }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../services/auctionLifecycle.service.js", () => ({ startAuction: jest.fn(), extendAuction: jest.fn(), closeAuction: jest.fn() }));
jest.unstable_mockModule("../../services/mpesaB2C.service.js", () => ({ disburseB2C: jest.fn() }));
const submit = jest.fn(async () => ({ verification: { verificationStatus: "pending" }, progress: {} }));
jest.unstable_mockModule("../../services/dealerVerificationService.js", () => ({ submitDealerVerification: submit }));
jest.unstable_mockModule("../../services/onboardingPolicy.service.js", () => ({
  sellerMayPublishDirectly: jest.fn(() => false), PUBLICATION_REVIEW_REQUIRED: "review", getOnboardingPolicy: jest.fn(async () => ({ source: "default", policy: { dealerOnboardingMode: "self_onboarding" } })),
}));


jest.unstable_mockModule("../../controllers/dealerPlatformController.js", () => new Proxy({}, { get: (_t, n) => (n === "then" ? undefined : stub(String(n))) }));
jest.unstable_mockModule("../../services/listingQualityService.js", () => new Proxy({}, { get: (_t, n) => (n === "then" ? undefined : jest.fn()) }));
const { default: dealerRoutes } = await import("../../routes/dealerRoutes.js");
const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
let server; let base;
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use("/api/dealer", dealerRoutes);
  app.use((err, _q, res, _n) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }));
beforeEach(() => { dbUpdate.mockClear(); submit.mockClear(); verif.current = null; });

const BODY = { businessName: "Acme Motors", location: "Nairobi", bio: "x", paymentDetails: { bankName: "KCB", accountName: "Acme Ltd", accountNumber: "123456", mpesaPhone: "0712345678" }, documents: { governmentId: { type: "national_id", documentNumber: "12345678" }, kraPin: { pinNumber: "A123456789Z" } } };
const put = async (who) => { const r = await fetch(`${base}/api/dealer/onboarding`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token(who)}` }, body: JSON.stringify(BODY) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };

describe("14.7 PUT /api/dealer/onboarding decides before it writes", () => {
  test.each(["approved", "suspended"])("a %s dealer gets 409 and NOTHING is written", async (status) => {
    verif.current = { verificationStatus: status };
    const r = await put(D1);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("DEALER_ONBOARDING_LOCKED");
    expect(dbUpdate).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
  test.each([null, "pending", "rejected"])("a dealer with verification %s may submit", async (status) => {
    verif.current = status ? { verificationStatus: status } : null;
    const r = await put(D1);
    expect(r.status).toBe(200);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(dbUpdate).toHaveBeenCalled();
  });
  test("a non-dealer role is refused before any lookup", async () => {
    const r = await put(B1);
    expect([401, 403]).toContain(r.status);
    expect(dbUpdate).not.toHaveBeenCalled();
  });
});
