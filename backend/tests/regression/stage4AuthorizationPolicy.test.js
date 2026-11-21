// ============================================================
// STAGE 4 (2026-10-18) — Workstreams E + F: authorization policy and dispute reads.
//
//   S4-F-01  DELETE /reviews/:id admin override tested the literal 'super_admin'
//            (not a storable role): superadmin + owner refused, plain admin allowed.
//   S4-F-02  dispute API returned the raw escrows row to buyer/seller: private
//            staff notes, mediator notes, resolver id and platform fee.
//   S4-F-03  GET /disputes and /disputes/stats relied on adminOnly, which admits
//            EVERY staff role (marketing, hr, ghost_checker...).
//   Plus the verified role/permission matrix (so access can only change on purpose)
//   and the characterization of decisions that need an owner (D5-D7, D10).
// Real controllers + real config/roles.js; only persistence is faked.
// ============================================================
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

// ---------- fakes ----------
let escrowRows = [];
const fakeSb = {
  from() {
    const st = { filters: [] };
    const q = {
      select() { return q; },
      eq(c, v) { st.filters.push([c, v]); return q; },
      or() { return q; },
      order() { return q; },
      single() { return Promise.resolve({ data: escrowRows.find((r) => st.filters.every(([c, v]) => r[c] === v)) ?? null, error: null }); },
      then(res, rej) { return Promise.resolve({ data: escrowRows, error: null }).then(res, rej); },
    };
    return q;
  },
  rpc: jest.fn(async () => ({ data: null, error: null })),
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => fakeSb }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));
jest.unstable_mockModule("../../middleware/evidenceUpload.js", () => ({ uploadEvidenceToCloudinary: jest.fn() }));
jest.unstable_mockModule("../../services/auditService.js", () => ({ logAuditEvent: jest.fn(async () => null) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(async () => {}), COMMUNICATION_EVENTS: {} }));
const deleteReview = jest.fn(async () => ({}));
jest.unstable_mockModule("../../services/review.service.js", () => ({
  createDealerReview: jest.fn(), deleteReview, listDealerReviews: jest.fn(), listMyReviews: jest.fn(),
}));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));

const dispute = await import("../../controllers/disputeController.js");
const { deleteOwnReview } = await import("../../controllers/reviewController.js");
const { projectDisputeForParty } = await import("../../utils/disputeView.js");
const roles = await import("../../config/roles.js");
const { PERM, ROLE_PERMISSIONS, STAFF_ROLES } = roles;

const mkRes = () => { const r = { code: 200 }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const EID = "e0000000-0000-4000-8000-0000000000e1";
const BUYER = "b0000000-0000-4000-8000-000000000001";
const SELLER = "50000000-0000-4000-8000-000000000002";
const row = () => ({
  id: EID, status: "disputed", buyer: BUYER, seller: SELLER, amount: 1000000, commission: 20000, sellerAmount: 980000,
  mpesaCheckoutRequestId: "ws_CO_SECRET", disputeWorkflowStatus: "mediation", disputeCategory: "vehicle_condition", disputePriority: "high",
  disputeReason: "r", disputeTitle: "t", disputeDescription: "d", disputeEvidence: [], disputeTimeline: [],
  disputeInternalNotes: [
    { id: "n1", note: "PRIVATE: suspected seller fraud", isPrivate: true, actor: "staff-1", createdAt: "2026-10-01" },
    { id: "n2", note: "Shared update", isPrivate: false, actor: "staff-1", createdAt: "2026-10-02" },
  ],
  disputeMediation: { scheduledAt: "s", startedAt: "st", completedAt: null, outcome: null, mediatorId: "staff-9", mediatorNotes: "MEDIATOR PRIVATE", buyerSatisfied: false },
  disputeResolution: { decision: "partial_refund", amount: 1, sellerAmount: 600000, buyerAmount: 400000, platformFee: 12000, reason: "split", decidedBy: "staff-1", decidedAt: "d", implemented: true },
  disputeAppeal: { reason: "unfair", additionalDetails: "x", submittedBy: SELLER, submittedAt: "t", status: "pending" },
});
const asUser = (id, role, extra = {}) => ({ id, role, ...extra });
beforeEach(() => { escrowRows = [row()]; });

describe("S4-F-02 parties never receive staff-only dispute data", () => {
  const get = async (user) => { const res = mkRes(); await dispute.getDispute({ params: { id: EID }, user }, res); return res; };
  const text = (o) => JSON.stringify(o);

  test("buyer: no private note, mediator notes, resolver id, platform fee, commission or provider refs", async () => {
    const res = await get(asUser(BUYER, "user"));
    expect(res.code).toBe(200);
    const t = text(res.body);
    for (const leak of ["PRIVATE: suspected seller fraud", "MEDIATOR PRIVATE", "staff-1", "staff-9", "platformFee", "12000", "ws_CO_SECRET", "disputeInternalNotes", "disputePriority"]) {
      expect(t).not.toContain(leak);
    }
    expect(res.body.dispute.commission).toBeUndefined();
    expect(res.body.dispute.sellerAmount).toBeUndefined();
  });
  test("buyer still sees what they are entitled to: status, own outcome, shared note, appeal", async () => {
    const d = (await get(asUser(BUYER, "user"))).body.dispute;
    expect(d.id).toBe(EID);
    expect(d.disputeWorkflowStatus).toBe("mediation");
    expect(d.disputeResolution).toMatchObject({ decision: "partial_refund", buyerAmount: 400000, reason: "split" });
    expect(d.disputeResolution.sellerAmount).toBeUndefined();
    expect(d.disputeNotes).toEqual([{ id: "n2", note: "Shared update", createdAt: "2026-10-02" }]);
    expect(d.disputeMediation).toEqual({ scheduledAt: "s", startedAt: "st", completedAt: null, outcome: null });
    expect(d.disputeAppeal.reason).toBe("unfair");
  });
  test("seller additionally sees their amount and the platform fee, never the resolver id or private notes", async () => {
    const d = (await get(asUser(SELLER, "dealer"))).body.dispute;
    expect(d.disputeResolution).toMatchObject({ sellerAmount: 600000, platformFee: 12000 });
    const t = text(d);
    expect(t).not.toContain("staff-1");
    expect(t).not.toContain("PRIVATE");
  });
  test.each([["admin"], ["superadmin"], ["escrow_officer"]])("staff role %s keeps the full operational row (unchanged)", async (role) => {
    const d = (await get(asUser("staff-x", role))).body.dispute;
    expect(d.disputeInternalNotes).toHaveLength(2);
    expect(d.disputeMediation.mediatorNotes).toBe("MEDIATOR PRIVATE");
  });
  test("a stranger is still refused", async () => {
    expect((await get(asUser("stranger", "user"))).code).toBe(403);
  });
  test("GET /disputes/my projects every row for the party", async () => {
    const res = mkRes();
    await dispute.getUserDisputes({ user: asUser(BUYER, "user") }, res);
    expect(res.code).toBe(200);
    expect(text(res.body)).not.toContain("PRIVATE");
    expect(res.body.disputes[0].disputeNotes).toHaveLength(1);
  });
  test("projection is pure: the source row is not mutated", () => {
    const src = row();
    const before = JSON.stringify(src);
    projectDisputeForParty(src, asUser(BUYER, "user"));
    expect(JSON.stringify(src)).toBe(before);
  });
});

describe("S4-F-03 dispute listing and stats require the dispute staff set (not any staff role)", () => {
  const call = async (fn, role, extra = {}) => { const res = mkRes(); await fn({ user: asUser("u-" + role, role, extra), query: {} }, res); return res; };
  test.each(["marketing", "hr", "ghost_checker", "moderator", "ad_manager", "technical_support", "accounts", "dealer", "user"])("%s → 403 on list and stats", async (role) => {
    expect((await call(dispute.getAllDisputes, role)).code).toBe(403);
    expect((await call(dispute.getDisputeStats, role)).code).toBe(403);
  });
  test.each(["admin", "superadmin", "escrow_officer"])("%s → allowed", async (role) => {
    expect((await call(dispute.getAllDisputes, role)).code).toBe(200);
    expect((await call(dispute.getDisputeStats, role)).code).toBe(200);
  });
  test("the platform owner (role superadmin, effectiveRole webhoist) is allowed", async () => {
    expect((await call(dispute.getAllDisputes, "superadmin", { effectiveRole: "webhoist" })).code).toBe(200);
  });
});

describe("S4-F-01 review deletion: canonical admin override", () => {
  const del = async (user) => { deleteReview.mockClear(); const res = mkRes(); await deleteOwnReview({ params: { id: "r1" }, user }, res); return deleteReview.mock.calls[0][2]; };
  test.each([["admin", {}], ["superadmin", {}], ["superadmin", { effectiveRole: "webhoist" }]])("%s %j may delete another user's review", async (role, extra) => {
    expect(await del(asUser("a", role, extra))).toBe(true);
  });
  test.each(["user", "dealer", "moderator", "accounts", "marketing", "escrow_officer", "super_admin", "staff", "executive"])("%s may delete only their own review", async (role) => {
    expect(await del(asUser("a", role))).toBe(false);
  });
});

describe("Verified permission matrix (finance / escrow separation)", () => {
  const holders = (perm) => Object.entries(ROLE_PERMISSIONS).filter(([, p]) => p.includes(perm)).map(([r]) => r).sort();
  test("escrow release and refund approval are held only by admin / superadmin (and the owner via webhoist)", () => {
    expect(holders(PERM.APPROVE_ESCROW_RELEASE).filter((r) => r !== "superadmin")).toEqual(["admin"]);
    expect(holders(PERM.APPROVE_ESCROW_REFUND).filter((r) => r !== "superadmin")).toEqual(["admin"]);
  });
  test("operating escrow never implies approving it; accounts settle and reconcile but cannot approve", () => {
    expect(ROLE_PERMISSIONS.escrow_officer).toContain(PERM.OPERATE_ESCROW);
    expect(ROLE_PERMISSIONS.escrow_officer).not.toContain(PERM.APPROVE_ESCROW_RELEASE);
    expect(ROLE_PERMISSIONS.escrow_officer).not.toContain(PERM.MANAGE_FINANCE);
    expect(ROLE_PERMISSIONS.accounts).toEqual(expect.arrayContaining([PERM.SETTLE_ESCROW_PAYOUT, PERM.RECONCILE_ESCROW, PERM.MANAGE_FINANCE]));
    expect(ROLE_PERMISSIONS.accounts).not.toContain(PERM.APPROVE_ESCROW_RELEASE);
    expect(ROLE_PERMISSIONS.accounts).not.toContain(PERM.APPROVE_ESCROW_REFUND);
  });
  test("MANAGE_FINANCE is held only by accounts / admin / superadmin", () => {
    expect(holders(PERM.MANAGE_FINANCE)).toEqual(["accounts", "admin", "superadmin"]);
  });
  test("a seller (dealer / individual_seller) holds no escrow permission at all", () => {
    for (const r of ["dealer", "individual_seller"]) {
      expect(ROLE_PERMISSIONS[r].filter((p) => /escrow|finance/.test(p))).toEqual([]);
    }
  });
});

describe("Role aliases: evidence that executive / staff / super_admin / manager / engineer cannot be held", () => {
  const dead = ["executive", "staff", "super_admin", "manager", "engineer"];
  test("none is a hierarchy or staff role", () => {
    for (const a of dead) {
      expect(roles.ROLE_HIERARCHY).not.toContain(a);
      expect(STAFF_ROLES).not.toContain(a);
    }
  });
  test("the final profiles_role_check allowlist excludes them (so users.role can never carry them)", () => {
    const sql = fs.readFileSync(path.join(repoRoot, "supabase/migrations/20260824070000_fix_profiles_role_check_constraint.sql"), "utf8");
    const list = sql.slice(sql.lastIndexOf("ADD CONSTRAINT profiles_role_check"));
    for (const a of dead) expect(list).not.toContain(`'${a}'`);
    expect(list).toContain("'superadmin'");
  });
  test("admin staff-creation and role-change allowlists exclude them", () => {
    const src = fs.readFileSync(path.join(repoRoot, "backend/routes/adminRoutes.js"), "utf8");
    const m = src.match(/const staffRoles = \[([\s\S]*?)\];/);
    expect(m).toBeTruthy();
    for (const a of dead) expect(m[1]).not.toContain(`"${a}"`);
  });
  test("isRoleAllowed is a plain string match plus the owner bypass: an alias grants nothing it was not given", () => {
    expect(roles.isRoleAllowed({ role: "user" }, ["admin", "superadmin"])).toBe(false);
    expect(roles.isRoleAllowed({ role: "super_admin" }, ["admin", "superadmin"])).toBe(false);
    expect(roles.isRoleAllowed({ role: "superadmin", effectiveRole: "webhoist" }, ["admin"])).toBe(true);
  });
});

describe("Characterization of open owner decisions (changing these must be a deliberate decision)", () => {
  test("D5/D6: the adminOnly guard admits EVERY staff role - it is not an 'admin' check", async () => {
    const { adminOnly } = await import("../../middleware/auth.js");
    for (const r of STAFF_ROLES) {
      const next = jest.fn();
      adminOnly({ user: { role: r } }, mkRes(), next);
      expect(next).toHaveBeenCalled();
    }
    const next = jest.fn(); const res = mkRes();
    adminOnly({ user: { role: "dealer" } }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.code).toBe(403);
  });
  test("D6 (closed in Phase 16): ledger reads AND writes need MANAGE_FINANCE through the staff access policy (no new permission was invented)", () => {
    const src = fs.readFileSync(path.join(repoRoot, "backend/routes/ledgerRoutes.js"), "utf8");
    expect(src).toMatch(/router\.get\("\/balance-sheet", protect, adminOnly, financeRead, ledgerController/);
    expect(src).toMatch(/router\.post\("\/", protect, adminOnly, financeWrite/);
    expect(Object.values(PERM)).not.toContain("view_finance");
  });
  test("D10 (Stage 4A: implemented minimal consistent fix): lead checks admit admin AND superadmin via isRoleAllowed", () => {
    const lead = fs.readFileSync(path.join(repoRoot, "backend/controllers/leadController.js"), "utf8");
    expect([...lead.matchAll(/req\.user\.role !== "admin"/g)]).toHaveLength(0);
    expect([...lead.matchAll(/isRoleAllowed\(req\.user, \["admin", "superadmin"\]\)/g)]).toHaveLength(6);
  });

});
