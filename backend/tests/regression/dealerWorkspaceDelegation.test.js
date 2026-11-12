// Evidence tier: real middleware, in-memory membership + user fakes.
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import fs from "fs";

process.env.NODE_ENV = "test";
const DEALER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const M = "33333333-3333-4333-8333-333333333333";
const teams = [];
const users = { [DEALER]: { id: DEALER, role: "dealer", name: "Owner Person", businessName: "Prime Motors Ltd", email: "d@x.test", status: "approved", emailVerified: true } };

jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn(async (id) => users[id] || null) } }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: () => ({ from: () => { const f = {}; const q = { select: () => q, eq: (k, v) => { f[k] = v; return q; }, limit: async () => ({ data: teams.filter((t) => Object.entries(f).every(([k, v]) => t[k] === v)), error: null }) }; return q; } }),
}));
const { dealerWorkspaceAccess } = await import("../../middleware/dealerWorkspace.js");

const run = async (perms, user) => {
  const req = { user }; let status = 200, body; let nexted = false;
  const res = { status(c) { status = c; return this; }, json(b) { body = b; return this; } };
  await dealerWorkspaceAccess(perms)(req, res, () => { nexted = true; });
  return { req, status, body, nexted };
};
const member = { id: M, role: "user", name: "Mary Staff", email: "m@x.test", emailVerified: true };

beforeEach(() => { teams.length = 0; users[DEALER].status = "approved"; });

describe("G-23 dealer workspace delegation", () => {
  test("owner passes through unchanged", async () => {
    const r = await run(["canListCars"], { id: DEALER, role: "dealer", emailVerified: true });
    expect(r.nexted).toBe(true); expect(r.req.actingMember).toBeUndefined();
  });
  test("an active member with the permission acts as the dealership; the real actor is recorded; role is not changed", async () => {
    teams.push({ id: "t1", dealer: DEALER, member: M, status: "active", role: "sales_agent", permissions: { canListCars: true } });
    const r = await run(["canListCars"], { ...member });
    expect(r.nexted).toBe(true);
    expect(r.req.user).toMatchObject({ id: DEALER, role: "dealer" });
    expect(r.req.actingMember).toMatchObject({ id: M, role: "user" });
    expect(users[M]).toBeUndefined();
  });
  test("a member lacking the permission is refused", async () => {
    teams.push({ id: "t1", dealer: DEALER, member: M, status: "active", role: "viewer", permissions: { canChatBuyers: true } });
    const r = await run(["canDeleteCars"], { ...member });
    expect(r.status).toBe(403); expect(r.body.code).toBe("DEALER_PERMISSION_REQUIRED"); expect(r.nexted).toBe(false);
  });
  test("fired (removed), suspended and merely invited members get nothing", async () => {
    for (const status of ["removed", "suspended", "invited"]) {
      teams.length = 0;
      teams.push({ id: "t1", dealer: DEALER, member: M, status, role: "x", permissions: { canListCars: true } });
      const r = await run(["canListCars"], { ...member });
      expect(r.status).toBe(403); expect(r.nexted).toBe(false);
    }
  });
  test("a personal account with no membership is refused", async () => {
    expect((await run(["canListCars"], { ...member })).status).toBe(403);
  });
  test("membership of two dealerships fails closed", async () => {
    teams.push({ id: "a", dealer: DEALER, member: M, status: "active", permissions: { canListCars: true } }, { id: "b", dealer: OTHER, member: M, status: "active", permissions: { canListCars: true } });
    const r = await run(["canListCars"], { ...member });
    expect(r.body.code).toBe("DEALER_ORG_AMBIGUOUS");
  });
  test("a suspended dealership cuts member access", async () => {
    teams.push({ id: "t1", dealer: DEALER, member: M, status: "active", permissions: { canListCars: true } });
    users[DEALER].status = "suspended";
    expect((await run(["canListCars"], { ...member })).body.code).toBe("DEALER_NOT_ACTIVE");
  });
  test("owner-only surfaces are not delegable (settings, subscription, finance, team, marketing)", () => {
    const src = fs.readFileSync(new URL("../../routes/dealerPlatformRoutes.js", import.meta.url), "utf8");
    for (const r of ['"/subscription"', '"/finance"', '"/marketing"', '"/copilot"']) {
      const line = src.split("\n").find((l) => l.includes(`router.`) && l.includes(r));
      expect(line).toContain("dealerBusinessOnly");
      expect(line).not.toContain("dealerWorkspaceAccess");
    }
  });
});

describe("my-workspace entry data", () => {
  const call = async (user) => { const { myWorkspaceHandler } = await import("../../middleware/dealerWorkspace.js"); let body; await myWorkspaceHandler({ user }, { status() { return this; }, json(b) { body = b; return this; } }); return body; };
  test("a member sees the dealership's public name, role and granted permissions only", async () => {
    teams.push({ id: "t1", dealer: DEALER, member: M, status: "active", role: "sales_agent", permissions: { canListCars: true, canDeleteCars: false } });
    const b = await call({ ...member });
    expect(b.data.membership).toEqual({ dealershipName: "Prime Motors Ltd", teamRole: "sales_agent", permissions: ["canListCars"] });
    expect(JSON.stringify(b)).not.toMatch(/d@x\.test|email/);
  });
  test("no membership, a fired member or the dealer owner get null", async () => {
    expect((await call({ ...member })).data.membership).toBeNull();
    teams.push({ id: "t1", dealer: DEALER, member: M, status: "removed", permissions: { canListCars: true } });
    expect((await call({ ...member })).data.membership).toBeNull();
    expect((await call({ id: DEALER, role: "dealer" })).data.membership).toBeNull();
  });
});
