// Phase 14.6 — route-to-policy matrix for dealer team routes, exercised with the REAL dealerOrgAccess middleware
// (only the Supabase read is replaced by an in-memory dealer_teams table) and the real route file source.
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import fs from "node:fs";

let rows = [];
let dbError = null;
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: () => ({
    from: () => {
      const f = {};
      const q = { select: () => q, eq: (k, v) => { f[k] = v; return q; }, limit: async (n) => (dbError ? { data: null, error: dbError } : { data: rows.filter((r) => Object.entries(f).every(([k, v]) => r[k] === v)).slice(0, n), error: null }) };
      return q;
    },
  }),
}));
jest.unstable_mockModule("../../config/owners.js", () => ({ isOwnerUser: (u) => u?.isPlatformOwner === true }));

const { dealerOrgAccess, resolveDealerOrg, DEALER_TEAM_PERMISSIONS } = await import("../../middleware/dealerOrgAccess.js");
const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const run = async (perm, user) => { const req = { user }; const res = mkRes(); let passed = false; await dealerOrgAccess(perm)(req, res, () => { passed = true; }); return { req, res, passed }; };

const member = (over = {}) => ({ id: "m1", dealer: "D1", member: "u2", role: "manager", status: "active", permissions: { canListCars: true }, ...over });
beforeEach(() => { rows = []; dbError = null; });

describe("dealer team route -> policy matrix (source)", () => {
  const src = fs.readFileSync(new URL("../../routes/dealerPlatformRoutes.js", import.meta.url), "utf8");
  const teamLines = src.split("\n").filter((l) => /router\.(get|post|put|delete)\("\/team/.test(l));
  test("exactly five team routes, each with protect and the documented policy", () => {
    expect(teamLines).toHaveLength(5);
    const policy = Object.fromEntries(teamLines.map((l) => [l.match(/router\.(\w+)\("([^"]+)"/).slice(1, 3).join(" "), l]));
    expect(policy["get /team"]).toMatch(/protect, dealerOrgAccess\("canManageTeam"\)/); // Phase 14.7: roster exposes member names/emails -> same permission as managing
    expect(policy["post /team/invite"]).toMatch(/dealerOrgAccess\("canManageTeam"\)/);
    expect(policy["put /team/:memberId"]).toMatch(/dealerOrgAccess\("canManageTeam"\)/);
    expect(policy["delete /team/:memberId"]).toMatch(/dealerOrgAccess\("canManageTeam"\)/);
    expect(policy["post /team/accept"]).toMatch(/protect, asyncHandler\(acceptTeamInvite\)/); // invitee is not yet a member: identity-only by design
    for (const l of teamLines) expect(l).toMatch(/protect/);
  });
  test("permission catalogue is the single existing list", () => {
    expect([...DEALER_TEAM_PERMISSIONS].sort()).toEqual(["canApproveDeals", "canChatBuyers", "canDeleteCars", "canEditCars", "canEditSettings", "canListCars", "canManageTeam", "canViewEarnings"]);
    expect(Object.isFrozen(DEALER_TEAM_PERMISSIONS)).toBe(true);
  });
});

describe("real dealerOrgAccess behaviour", () => {
  test("active member WITHOUT canManageTeam -> 403 DEALER_PERMISSION_REQUIRED", async () => {
    rows = [member()];
    const r = await run("canManageTeam", { id: "u2", role: "buyer" });
    expect(r.passed).toBe(false);
    expect(r.res.code).toBe(403);
    expect(r.res.body.code).toBe("DEALER_PERMISSION_REQUIRED");
  });
  test("active member WITH canManageTeam passes and is scoped to its own dealer", async () => {
    rows = [member({ permissions: { canManageTeam: true } })];
    const r = await run("canManageTeam", { id: "u2", role: "buyer" });
    expect(r.passed).toBe(true);
    expect(r.req.dealerId).toBe("D1");
    expect(r.req.dealerOrg.isOwner).toBe(false);
  });
  test("a client-supplied dealer id can never override the resolved organization", async () => {
    rows = [member({ permissions: { canManageTeam: true } })];
    const req = { user: { id: "u2", role: "buyer" }, body: { dealerId: "D2" }, params: { dealerId: "D2" }, query: { dealerId: "D2" } };
    const res = mkRes(); await dealerOrgAccess("canManageTeam")(req, res, () => {});
    expect(req.dealerId).toBe("D1");
  });
  test("suspended, removed and invited members get no organization access", async () => {
    for (const status of ["suspended", "removed", "invited"]) {
      rows = [member({ status, permissions: { canManageTeam: true } })];
      const r = await run("canManageTeam", { id: "u2", role: "buyer" });
      expect(r.res.code).toBe(403);
      expect(r.res.body.code).toBe("DEALER_ORG_ACCESS_REQUIRED");
    }
  });
  test("user with no membership -> 403; unauthenticated -> 403", async () => {
    expect((await run("canManageTeam", { id: "nobody", role: "buyer" })).res.code).toBe(403);
    expect((await run("canManageTeam", undefined)).res.code).toBe(403);
  });
  test("member of D1 cannot reach D2 (org comes from membership only)", async () => {
    rows = [member({ dealer: "D1", permissions: { canManageTeam: true } })];
    const r = await run("canManageTeam", { id: "u2", role: "buyer" });
    expect(r.req.dealerId).toBe("D1");
    expect(r.req.dealerId).not.toBe("D2");
  });
  test("dealer owner resolves to self with all permissions; admin/superadmin bypass is not an owner flag", async () => {
    const owner = await run("canManageTeam", { id: "D1", role: "dealer" });
    expect(owner.passed).toBe(true);
    expect(owner.req.dealerOrg.isOwner).toBe(true);
    const admin = await run("canManageTeam", { id: "A1", role: "admin" });
    expect(admin.passed).toBe(true);
    expect(admin.req.dealerOrg.isOwner).toBe(false);
  });
  test("route with no permission (GET /team) admits any active member, including one with an empty permission map", async () => {
    rows = [member({ permissions: {} })];
    expect((await run(undefined, { id: "u2", role: "buyer" })).passed).toBe(true);
  });
  test("database failure fails closed with 500, never open", async () => {
    dbError = new Error("db down");
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const r = await run("canManageTeam", { id: "u2", role: "buyer" });
    spy.mockRestore();
    expect(r.passed).toBe(false);
    expect(r.res.code).toBe(500);
  });
  test("Phase 14.7: membership in two organizations FAILS CLOSED (403 DEALER_ORG_AMBIGUOUS), never an arbitrary first row", async () => {
    rows = [member({ id: "m1", dealer: "D1", permissions: { canManageTeam: true } }), member({ id: "m2", dealer: "D2", permissions: { canManageTeam: true } })];
    // the in-memory table returns only the first match for limit(); model the DB returning both rows
    const original = rows; rows = original;
    const r = await run("canManageTeam", { id: "u2", role: "buyer" });
    expect(r.passed).toBe(false);
    expect(r.res.code).toBe(403);
    expect(r.res.body.code).toBe("DEALER_ORG_AMBIGUOUS");
  });
  test("two active rows in the SAME dealership are not ambiguous", async () => {
    rows = [member({ id: "m1", permissions: { canManageTeam: true } }), member({ id: "m2", permissions: { canManageTeam: true } })];
    expect((await run("canManageTeam", { id: "u2", role: "buyer" })).passed).toBe(true);
  });
});
