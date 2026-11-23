// Multiple dealership memberships: the browser may only SELECT among the caller's own ACTIVE memberships (re-read per request).
import { describe, test, expect, beforeEach, jest } from "@jest/globals";

let rows = [];
const supabase = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ limit: async () => ({ data: rows.filter((r) => r.status === "active"), error: null }) }) }) }) }) };
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => supabase }));
jest.unstable_mockModule("../../config/owners.js", () => ({ isOwnerUser: () => false }));
const { resolveDealerOrg } = await import("../../middleware/dealerOrgAccess.js");

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const req = (header) => ({ user: { id: "u1", role: "user" }, headers: header ? { "x-dealer-org": header } : {} });
beforeEach(() => {
  rows = [
    { id: "m1", dealer: A, member: "u1", role: "sales_agent", permissions: { canListCars: true }, status: "active" },
    { id: "m2", dealer: B, member: "u1", role: "basic_staff", permissions: {}, status: "active" },
    { id: "m3", dealer: C, member: "u1", role: "manager", permissions: { canManageTeam: true }, status: "suspended" },
  ];
});

describe("dealership selection across several memberships", () => {
  test("without a selection two active memberships fail closed and list the choices", async () => {
    const org = await resolveDealerOrg(req());
    expect(org.ambiguous).toBe(true); expect(org.choices.sort()).toEqual([A, B]);
  });
  test("selecting one of the caller's active memberships authorises ONLY that dealership, with that membership's own permissions", async () => {
    const a = await resolveDealerOrg(req(A)); expect([a.dealerId, a.role, a.permissions.canListCars]).toEqual([A, "sales_agent", true]);
    const b = await resolveDealerOrg(req(B.toUpperCase())); expect([b.dealerId, b.role, b.permissions.canListCars]).toEqual([B, "basic_staff", undefined]);
  });
  test("naming a dealership the caller is not an ACTIVE member of (suspended, other, malformed) is refused, never ignored", async () => {
    for (const h of [C, "dddddddd-dddd-4ddd-8ddd-dddddddddddd", "not-a-uuid", "' or 1=1 --"]) expect(await resolveDealerOrg(req(h))).toBeNull();
  });
  test("a person with ONE membership who names another dealership is refused too (the header can never add access)", async () => {
    rows = [rows[0]];
    expect(await resolveDealerOrg(req(B))).toBeNull();
    expect((await resolveDealerOrg(req())).dealerId).toBe(A);
    expect((await resolveDealerOrg(req(A))).dealerId).toBe(A);
  });
  test("a removed membership grants nothing even when selected", async () => {
    rows = [{ ...rows[0], status: "removed" }];
    expect(await resolveDealerOrg(req(A))).toBeNull();
    expect(await resolveDealerOrg(req())).toBeNull();
  });
});
