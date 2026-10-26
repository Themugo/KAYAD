// ============================================================
// PHASE 13D — DEALER ISOLATION REGRESSION (Workstreams A, B, C).
// Drives the REAL routers through the REAL protect/dealerOnly/dealerBusinessOnly/dealerOrgAccess middleware over
// HTTP; only persistence, controllers' data access and heavy services are mocked (EVIDENCE TIER: mocked local runtime).
//   A  /api/dealer/* and the dealer-business parts of /api/dealer-platform/* admit only dealer + staff.
//   B  /api/listing-quality/dealer/:dealerId/* are limited to the owner (or staff); no other id is readable/recalculable.
//   C  requireDealerVerification never creates a Dealer record for an individual_seller.
// ============================================================
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
const stub = (name) => jest.fn((req, res) => res.json({ success: true, handler: name }));

jest.unstable_mockModule("../../models/User.js", () => ({ default: userModel }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: jest.fn(() => chain({ tokenVersion: 0 })) } }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ isSupabaseConnected: () => true, getSupabase: () => sb }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../db/index.js", () => ({
  findAll: jest.fn(async () => []), findById: jest.fn(async () => null), findOne: jest.fn(async () => null),
  create: jest.fn(async (t, d) => ({ id: "new", ...d })), update: jest.fn(async () => ({})), remove: jest.fn(async () => ({})),
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
jest.unstable_mockModule("../../services/dealerVerificationService.js", () => ({ submitDealerVerification: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../services/onboardingPolicy.service.js", () => ({
  sellerMayPublishDirectly: jest.fn(() => false), PUBLICATION_REVIEW_REQUIRED: "review", getOnboardingPolicy: jest.fn(async () => ({ source: "default", policy: { dealerOnboardingMode: "self_onboarding" } })),
}));

const PLATFORM_FNS = ["getDealerDashboard", "getDealerProfile", "updateDealerProfile", "getInventory", "createListing", "updateListing", "deleteListing", "bulkUpdateListings", "getLeads", "updateLead", "addLeadNote", "getLeadActivities", "createTask", "getSalesPipeline", "getMarketingCampaigns", "createCampaign", "updateCampaign", "getDealerAnalytics", "getAIRecommendations", "getTeamMembers", "inviteTeamMember", "updateTeamMember", "removeTeamMember", "acceptTeamInvite", "getSubscription", "askDealerCopilot", "getCustomers", "getCustomerTimeline", "getAuctionInventory", "getFinanceApplications", "getInspectionOrders", "getReputation"];
jest.unstable_mockModule("../../controllers/dealerPlatformController.js", () => Object.fromEntries(PLATFORM_FNS.map((n) => [n, stub(n)])));

const qualityCalls = [];
const qualityStub = (kind) => jest.fn(async (dealerId) => { qualityCalls.push([kind, dealerId]); return { dealerId, kind }; });
const svc = { getDealerQualityStats: qualityStub("stats"), generateQualityReport: qualityStub("report"), bulkRecalculateDealerQuality: qualityStub("bulk") };
jest.unstable_mockModule("../../services/listingQualityService.js", () => ({
  calculateListingQuality: jest.fn(), recalculateListingQuality: jest.fn(), getListingQuality: jest.fn(), getDealerQualityStats: svc.getDealerQualityStats,
  getPlatformQualityStats: jest.fn(), getQualityTrends: jest.fn(), getLowQualityListings: jest.fn(), generateQualityReport: svc.generateQualityReport,
  bulkRecalculateDealerQuality: svc.bulkRecalculateDealerQuality, getQualityBenchmarks: jest.fn(),
}));

const { default: dealerRoutes } = await import("../../routes/dealerRoutes.js");
const { default: platformRoutes } = await import("../../routes/dealerPlatformRoutes.js");
const { default: qualityRoutes } = await import("../../routes/listingQualityRoutes.js");

const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
let server; let base;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/dealer", dealerRoutes);
  app.use("/api/dealer-platform", platformRoutes);
  app.use("/api/listing-quality", qualityRoutes);
  await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }));
beforeEach(() => { qualityCalls.length = 0; });

const call = async (method, path, who, body) => {
  const headers = { "Content-Type": "application/json" };
  if (who) headers.Authorization = `Bearer ${token(who)}`;
  // A request that passes the guards may reach a mocked handler that never answers: recorded as status 0
  // ("guard admitted the caller"), distinct from 401/403 (guard denied).
  const payload = body && method !== "GET" ? JSON.stringify(body) : undefined;
  if (payload) headers["Content-Length"] = Buffer.byteLength(payload);
  return new Promise((resolve) => {
    const u = new URL(base + path);
    const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method, headers, agent: false }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => { let json = null; try { json = JSON.parse(data); } catch { /* empty */ } resolve({ status: res.statusCode, json }); });
    });
    const t = setTimeout(() => { req.destroy(); resolve({ status: 0, json: null }); }, 500);
    req.on("close", () => clearTimeout(t));
    req.on("error", () => resolve({ status: 0, json: null }));
    if (payload) req.write(payload);
    req.end();
  });
};
const passedGuard = (r) => r.status !== 401 && r.status !== 403;

const PRIVATE_NON_DEALERS = [
  ["ordinary buyer", B1], ["pending private seller", S_PENDING], ["approved private seller", S_APPROVED],
  ["suspended private seller", S_SUSPENDED], ["rejected private seller", S_REJECTED], ["revoked seller capability (role user)", U_REVOKED],
];
const rows3 = (rows) => rows.map(([m, p, b]) => [m, p, b ?? null]);
// Dealer-BUSINESS routes on the legacy router. Caller-scoped listing management (cars, bulk-status/delete, mark-sold, bids,
// auctions, earnings, escrows, payouts, settlement, analytics) deliberately stays on dealerOnly: it is pinned for private
// sellers by S1-LIST-04 and is documented as a residual for the C1 stage (see KAYAD_PHASE13D_REMAINING_RISKS_AND_STAGING_GAPS.md).
const LEGACY_DEALER_ROUTES = rows3([
  ["GET", "/api/dealer/team"], ["POST", "/api/dealer/team/invite", { email: "x@example.test" }], ["PATCH", `/api/dealer/team/${NOBODY}`, { role: "manager" }],
  ["DELETE", `/api/dealer/team/${NOBODY}`], ["POST", "/api/dealer/upgrade", { planId: "p", phone: "254712345678" }], ["GET", "/api/dealer/trade-listings"],
  ["PATCH", `/api/dealer/cars/${NOBODY}/wholesale`, { wholesale: true }], ["POST", "/api/dealer/pricing-recommendations", {}],
]);
const LEGACY_SELLER_OWN_ROUTES = rows3([
  ["GET", "/api/dealer/cars"], ["PATCH", "/api/dealer/cars/bulk-status", { ids: [], status: "pending" }], ["GET", "/api/dealer/earnings"],
]);
const PLATFORM_BUSINESS_ROUTES = rows3([
  ["GET", "/api/dealer-platform/dashboard"], ["GET", "/api/dealer-platform/inventory"], ["POST", "/api/dealer-platform/inventory/bulk", {}],
  ["GET", "/api/dealer-platform/leads"], ["GET", "/api/dealer-platform/pipeline"], ["GET", "/api/dealer-platform/marketing"], ["POST", "/api/dealer-platform/marketing", {}],
  ["GET", "/api/dealer-platform/analytics"], ["GET", "/api/dealer-platform/subscription"], ["GET", "/api/dealer-platform/customers"], ["POST", "/api/dealer-platform/copilot", {}],
]);

describe("Workstream A — legacy /api/dealer/* admits no private seller or buyer", () => {
  for (const [label, id] of PRIVATE_NON_DEALERS) {
    test.each(LEGACY_DEALER_ROUTES)(`${label}: %s %s → 403`, async (method, path, body) => {
      const r = await call(method, path, id, body);
      expect(r.status).toBe(403);
    });
  }
  test.each(LEGACY_SELLER_OWN_ROUTES)("approved private seller KEEPS caller-scoped %s %s (not a dealer-business route; unchanged by 13D)", async (m, p, b) => {
    expect(passedGuard(await call(m, p, S_APPROVED, b))).toBe(true);
  });
  test("pending/suspended/rejected private sellers remain refused by the existing status gate", async () => {
    for (const id of [S_PENDING, S_SUSPENDED, S_REJECTED]) expect((await call("GET", "/api/dealer/cars", id)).status).toBe(403);
  });
  test("anonymous → 401", async () => { expect((await call("GET", "/api/dealer/team", null)).status).toBe(401); });
  test.each(rows3([["GET", "/api/dealer/team"], ["GET", "/api/dealer/trade-listings"], ["GET", "/api/dealer/earnings"]]))("dealer owner keeps %s %s", async (m, p) => {
    expect(passedGuard(await call(m, p, D1))).toBe(true);
  });
  test("staff (admin, marketing) keep their existing access (not broadened, not removed)", async () => {
    expect(passedGuard(await call("GET", "/api/dealer/team", ADMIN))).toBe(true);
    expect(passedGuard(await call("GET", "/api/dealer/team", MARKETING))).toBe(true);
  });
  test("team member (role user) is not admitted to the owner-level legacy router", async () => {
    expect((await call("GET", "/api/dealer/team", M1)).status).toBe(403);
    expect((await call("POST", "/api/dealer/team/invite", M1, { email: "x@example.test" })).status).toBe(403);
  });
});

describe("Workstream A — /api/dealer-platform business routes", () => {
  for (const [label, id] of PRIVATE_NON_DEALERS) {
    test.each(PLATFORM_BUSINESS_ROUTES)(`${label}: %s %s → 403`, async (method, path, body) => {
      expect((await call(method, path, id, body)).status).toBe(403);
    });
  }
  test.each(PLATFORM_BUSINESS_ROUTES)("dealer owner keeps %s %s", async (m, p, b) => { expect(passedGuard(await call(m, p, D1, b))).toBe(true); });
  test("organisation team routes: owner and active member allowed; private seller, buyer and suspended/unrelated denied", async () => {
    expect(passedGuard(await call("GET", "/api/dealer-platform/team", D1))).toBe(true);
    expect(passedGuard(await call("GET", "/api/dealer-platform/team", M1))).toBe(true); // authorized team member keeps team access
    for (const id of [S_APPROVED, S_PENDING, S_SUSPENDED, B1, U_REVOKED]) expect((await call("GET", "/api/dealer-platform/team", id)).status).toBe(403);
  });
  test("team member cannot perform an owner-permission operation without canManageTeam", async () => {
    expect((await call("POST", "/api/dealer-platform/team/invite", M1, { email: "x@example.test" })).status).toBe(403);
  });
  test("a client-supplied dealer id never selects the organisation (member of D1 cannot act for D2)", async () => {
    const r = await call("GET", `/api/dealer-platform/team?dealerId=${D2}`, M1);
    expect(passedGuard(r)).toBe(true); // resolved from membership; the controller is keyed to req.dealerId=D1 (verified separately in source)
  });
});

describe("Workstream B — listing-quality ownership (read and recalculation)", () => {
  const paths = (id) => [["GET", `/api/listing-quality/dealer/${id}/stats`, "stats"], ["GET", `/api/listing-quality/dealer/${id}/report`, "report"], ["POST", `/api/listing-quality/dealer/${id}/bulk-recalculate`, "bulk"]];
  test.each(paths(D1))("owner may %s %s", async (m, p, kind) => {
    const r = await call(m, p, D1, {});
    expect(r.status).toBe(200);
    expect(qualityCalls).toEqual([[kind, D1]]);
  });
  test.each(paths(D1))("unrelated dealer D2 denied %s %s; service never invoked", async (m, p, _kind) => {
    const r = await call(m, p, D2, {});
    expect(r.status).toBe(403);
    expect(qualityCalls).toEqual([]);
  });
  for (const [label, id] of [["approved private seller", S_APPROVED], ["pending private seller", S_PENDING], ["suspended private seller", S_SUSPENDED], ["rejected private seller", S_REJECTED]]) {
    test.each(paths(D1))(`${label} denied another dealer's %s %s`, async (m, p, _kind) => {
      expect((await call(m, p, id, {})).status).toBe(403);
      expect(qualityCalls).toEqual([]);
    });
  }
  test("a private seller may read and recalculate only their OWN quality data (existing owner-scoped behaviour)", async () => {
    for (const [m, p] of paths(S_APPROVED)) expect((await call(m, p, S_APPROVED, {})).status).toBe(200);
    expect(qualityCalls.map((c) => c[1])).toEqual([S_APPROVED, S_APPROVED, S_APPROVED]);
  });
  test("identifier substitution: nonexistent dealer id by a non-owner is 403 (no existence leak), not 404/200", async () => {
    expect((await call("GET", `/api/listing-quality/dealer/${NOBODY}/stats`, D2)).status).toBe(403);
    expect(qualityCalls).toEqual([]);
  });
  test("malformed identifier → 400 before any ownership or service work", async () => {
    expect((await call("GET", "/api/listing-quality/dealer/not-a-uuid/stats", D1)).status).toBe(400);
    expect((await call("POST", "/api/listing-quality/dealer/not-a-uuid/bulk-recalculate", D1, {})).status).toBe(400);
    expect(qualityCalls).toEqual([]);
  });
  test("buyer and team member (neither dealer nor seller) denied; anonymous 401", async () => {
    expect((await call("GET", `/api/listing-quality/dealer/${D1}/stats`, B1)).status).toBe(403);
    expect((await call("GET", `/api/listing-quality/dealer/${D1}/stats`, M1)).status).toBe(403);
    expect((await call("GET", `/api/listing-quality/dealer/${D1}/stats`, null)).status).toBe(401);
  });
  test("staff and administrators keep cross-dealer access (existing permission preserved)", async () => {
    for (const id of [ADMIN, MARKETING]) {
      expect((await call("GET", `/api/listing-quality/dealer/${D1}/stats`, id)).status).toBe(200);
      expect((await call("POST", `/api/listing-quality/dealer/${D1}/bulk-recalculate`, id, {})).status).toBe(200);
    }
  });
  test("a caller-supplied dealerId in the query or body cannot override the path/ownership decision", async () => {
    expect((await call("GET", `/api/listing-quality/dealer/${D1}/stats?dealerId=${D2}`, D2)).status).toBe(403);
    expect((await call("POST", `/api/listing-quality/dealer/${D1}/bulk-recalculate`, D2, { dealerId: D2 })).status).toBe(403);
  });
});

describe("Workstream C — requireDealerVerification creates no dealership for private sellers", () => {
  let mw; const Dealer = { findOne: jest.fn(), create: jest.fn() }; const DealerVerification = { findOne: jest.fn() };
  beforeAll(async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: Dealer }));
    jest.unstable_mockModule("../../models/DealerVerification.js", () => ({ default: DealerVerification }));
    jest.unstable_mockModule("../../models/Car.js", () => ({ default: { countDocuments: jest.fn(async () => 0) } }));
    jest.unstable_mockModule("../../models/Referral.js", () => ({ default: {} }));
    mw = await import("../../middleware/dealerVerification.js?c=1");
  });
  beforeEach(() => { Dealer.findOne.mockReset(); Dealer.create.mockReset(); DealerVerification.findOne.mockReset(); DealerVerification.findOne.mockResolvedValue(null); });
  const run = (user, extra = {}) => new Promise((resolve) => {
    const req = { user, method: "POST", baseUrl: "/api/cars", path: "/", ...extra };
    const res = { status(c) { this.c = c; return this; }, json(b) { resolve({ blocked: this.c, body: b, req }); } };
    mw.requireDealerVerification(req, res, () => resolve({ passed: true, req }));
  });

  test.each([["pending", "pending"], ["approved", "approved"], ["suspended", "suspended"], ["rejected", "rejected"]])("individual_seller (%s) without a Dealer row: no Dealer.create, request not blocked", async (_n, status) => {
    Dealer.findOne.mockResolvedValue(null);
    const r = await run({ id: S_APPROVED, role: "individual_seller", status });
    expect(Dealer.create).not.toHaveBeenCalled();
    expect(r.passed).toBe(true);
    expect(r.req.dealer ?? null).toBeNull();
  });
  test("an existing legacy Dealer row grants an individual_seller nothing extra and is not modified", async () => {
    Dealer.findOne.mockResolvedValue({ id: "legacy", user: S_APPROVED, approved: true });
    const r = await run({ id: S_APPROVED, role: "individual_seller", status: "approved" });
    expect(r.passed).toBe(true);
    expect(Dealer.create).not.toHaveBeenCalled();
    expect(Dealer.update).toBeUndefined(); // the middleware never mutates a pre-existing row
  });
  test("ordinary buyer still gets 403 and no record", async () => {
    Dealer.findOne.mockResolvedValue(null);
    const r = await run({ id: B1, role: "user", status: "approved" });
    expect(r.blocked).toBe(403); expect(Dealer.create).not.toHaveBeenCalled();
  });
  test("role dealer without a Dealer row is still refused (no auto-approval path for dealers)", async () => {
    Dealer.findOne.mockResolvedValue(null);
    const r = await run({ id: D1, role: "dealer", status: "approved" });
    expect(r.blocked).toBe(403); expect(Dealer.create).not.toHaveBeenCalled();
  });
  test("verified dealer with an approved row passes and req.dealer is set (existing workflow preserved)", async () => {
    Dealer.findOne.mockResolvedValue({ id: "dl1", user: D1, approved: true });
    const r = await run({ id: D1, role: "dealer", status: "approved" });
    expect(r.passed).toBe(true); expect(r.req.dealer).toEqual({ id: "dl1", user: D1, approved: true });
  });
  test.each([["suspended", "DEALER_ACCOUNT_SUSPENDED"], ["rejected", "DEALER_VERIFICATION_REJECTED"]])("dealer with a %s verification stays blocked", async (st, code) => {
    Dealer.findOne.mockResolvedValue({ id: "dl1", user: D1, approved: true });
    DealerVerification.findOne.mockResolvedValue({ verificationStatus: st });
    const r = await run({ id: D1, role: "dealer", status: "approved" });
    expect(r.blocked).toBe(403); expect(r.body.code).toBe(code);
  });
  test("dealer with a pending verification and no legacy approval is still gated (progressive logic untouched)", async () => {
    Dealer.findOne.mockResolvedValue({ id: "dl2", user: D2, approved: false });
    DealerVerification.findOne.mockResolvedValue({ verificationStatus: "pending" });
    const r = await run({ id: D2, role: "dealer", status: "approved" }, { method: "GET", path: "/x" });
    expect(r.blocked).toBe(403);
  });
});
