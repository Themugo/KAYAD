// Phase 14.8 - dealerOrgAccess must only select columns that exist on dealer_teams (14.7 selected a nonexistent
// "invite_email" alias and 500'd every team-member request on a real PostgREST database).
import { jest } from "@jest/globals";

const REAL_COLUMNS = new Set(["id", "dealer", "member", "role", "permissions", "status", "invite_email", "invite_token_hash", "invite_expires_at", "invited_by"]);
let selectList; let rowsOut;
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: () => ({
    from: () => {
      const q = { select(cols) { selectList = cols; return q; }, eq() { return q; }, limit: async () => {
        const bad = selectList.split(",").filter((c) => !REAL_COLUMNS.has(c.trim()));
        if (bad.length) return { data: null, error: { code: "42703", message: `column dealer_teams.${bad[0]} does not exist` } };
        return { data: rowsOut, error: null };
      } };
      return q;
    },
  }),
}));
const { dealerOrgAccess } = await import("../../middleware/dealerOrgAccess.js");
const run = async (user, perm) => { const res = { code: 0, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } }; let nexted = false; const req = { user }; await dealerOrgAccess(perm)(req, res, () => { nexted = true; }); return { res, nexted, req }; };
const member = { id: "m1", role: "buyer", effectiveRole: "buyer" };

test("selects only real dealer_teams columns", async () => { rowsOut = []; await run(member, "canManageTeam"); expect(selectList.split(",").every((c) => REAL_COLUMNS.has(c))).toBe(true); });
test("a non-member gets 403, not a 500", async () => { rowsOut = []; const { res } = await run(member, "canManageTeam"); expect(res.code).toBe(403); });
test("a member lacking the permission gets 403", async () => { rowsOut = [{ id: "t1", dealer: "d1", member: "m1", role: "sales_agent", permissions: { canListCars: true }, status: "active" }]; const { res } = await run(member, "canManageTeam"); expect(res.code).toBe(403); expect(res.body.code).toBe("DEALER_PERMISSION_REQUIRED"); });
test("a member with the permission is scoped to the membership's own dealer", async () => { rowsOut = [{ id: "t1", dealer: "d1", member: "m1", role: "manager", permissions: { canManageTeam: true }, status: "active" }]; const { nexted, req } = await run(member, "canManageTeam"); expect(nexted).toBe(true); expect(req.dealerId).toBe("d1"); });
test("memberships in two dealerships fail closed", async () => { rowsOut = [{ id: "t1", dealer: "d1", permissions: { canManageTeam: true } }, { id: "t2", dealer: "d2", permissions: { canManageTeam: true } }]; const { res } = await run(member, "canManageTeam"); expect(res.code).toBe(403); expect(res.body.code).toBe("DEALER_ORG_AMBIGUOUS"); });
