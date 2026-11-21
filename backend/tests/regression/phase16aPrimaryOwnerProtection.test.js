// PHASE 16A - the primary owner (first designated address) cannot be removed by a peer owner; the refusal is audited; the switch can be turned off;
// the primary may remove a peer. EVIDENCE TIER: mocked store (real governance service, injected supabase builder + rpc recorder). The disposable-DB
// E2E (runbooks/phase16a-20261026/e2e_phase16a_arrangement.cjs) proves the same rule end to end against PostgreSQL.
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

process.env.NODE_ENV = "test";
process.env.WEBHOIST_EMAIL = "primary@example.test,second@example.test";
const rpcCalls = [];
let member = { id: "m", user_id: "u-target", email: "primary@example.test", status: "active" };
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn(), logRequest: jest.fn(), logResponse: jest.fn(), generateRequestId: () => "t", maskLogValue: (v) => v, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: {} }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn(async () => ({})) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ COMMUNICATION_EVENTS: new Proxy({}, { get: () => "x" }) }));
jest.unstable_mockModule("../../middleware/auth.js", () => ({ invalidateUserCache: jest.fn(), protect: jest.fn(), ensureFresh: jest.fn() }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));
const builder = () => { const b = { select: () => b, eq: () => b, maybeSingle: async () => ({ data: member, error: null }) }; return b; };
jest.unstable_mockModule("../../utils/supabase.js", () => ({
  getSupabase: () => ({ from: () => builder(), rpc: async (fn, args) => { rpcCalls.push({ fn, args }); return { data: fn === "kayad_owner_revoke_membership_atomic" ? { usable_after: 1 } : null, error: null }; } }),
}));
jest.unstable_mockModule("../../services/ownerRegistry.service.js", () => ({ invalidate: jest.fn(), ensureFresh: jest.fn(async () => {}), snapshot: jest.fn() }));
jest.unstable_mockModule("../../services/ownerMfa.service.js", () => ({
  getStatus: jest.fn(async () => ({ enrolled: false })), verifyChallenge: jest.fn(async () => true), isEnrolled: jest.fn(async () => false), policy: () => "off",
}));
const gov = await import("../../services/ownerGovernance.service.js");

const second = { id: "u-second", email: "second@example.test" };
const primary = { id: "u-primary", email: "primary@example.test" };
beforeEach(() => { rpcCalls.length = 0; delete process.env.OWNER_PRIMARY_PROTECTION; member = { id: "m", user_id: "u-target", email: "primary@example.test", status: "active" }; });

describe("removeOwner: primary-owner protection", () => {
  test("a peer owner is refused with OWNER_PRIMARY_PROTECTED before any password/typed-confirmation work, and the refusal is audited", async () => {
    await expect(gov.removeOwner({ actor: second, targetUserId: "u-target", confirmEmail: "primary@example.test", password: "x", reason: "attempt" })).rejects.toMatchObject({ code: "OWNER_PRIMARY_PROTECTED", status: 403 });
    expect(rpcCalls.map((c) => c.fn)).toEqual(["kayad_owner_log_event"]);
    expect(rpcCalls[0].args).toMatchObject({ p_action: "owner.remove", p_result: "denied", p_actor: "u-second" });
    expect(rpcCalls.some((c) => c.fn === "kayad_owner_revoke_membership_atomic")).toBe(false);
  });
  test("the same refusal applies regardless of address casing/whitespace of the stored member email", async () => {
    member = { ...member, email: " Primary@Example.test " };
    await expect(gov.removeOwner({ actor: second, targetUserId: "u-target", confirmEmail: "x", password: "x", reason: "attempt" })).rejects.toMatchObject({ code: "OWNER_PRIMARY_PROTECTED" });
  });
  test("a non-primary owner stays removable by the primary owner (proceeds past the guard to the typed-confirmation step)", async () => {
    member = { ...member, user_id: "u-second", email: "second@example.test" };
    await expect(gov.removeOwner({ actor: primary, targetUserId: "u-second", confirmEmail: "wrong@example.test", password: "x", reason: "because" })).rejects.not.toMatchObject({ code: "OWNER_PRIMARY_PROTECTED" });
  });
  test("a non-primary owner is also removable by another non-primary owner (peer rule unchanged for everyone but the primary)", async () => {
    member = { ...member, user_id: "u-third", email: "third@example.test" };
    await expect(gov.removeOwner({ actor: second, targetUserId: "u-third", confirmEmail: "wrong@example.test", password: "x", reason: "because" })).rejects.not.toMatchObject({ code: "OWNER_PRIMARY_PROTECTED" });
  });
  test("the primary can remove itself (it is allowed to leave) - guard only blocks a PEER", async () => {
    await expect(gov.removeOwner({ actor: primary, targetUserId: "u-target", confirmEmail: "wrong@example.test", password: "x", reason: "leaving" })).rejects.not.toMatchObject({ code: "OWNER_PRIMARY_PROTECTED" });
  });
  test("OWNER_PRIMARY_PROTECTION=off disables the rule (documented escape hatch)", async () => {
    process.env.OWNER_PRIMARY_PROTECTION = "off";
    await expect(gov.removeOwner({ actor: second, targetUserId: "u-target", confirmEmail: "wrong@example.test", password: "x", reason: "because" })).rejects.not.toMatchObject({ code: "OWNER_PRIMARY_PROTECTED" });
  });
});
