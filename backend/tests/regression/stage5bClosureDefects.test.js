// STAGE 5B CLOSURE — regression tests for defects found by the independent owner-governance audit.
// EVIDENCE TIER: mocked/static (real predicates + real registry; only the snapshot RPC is injected). Each test names the defect it pins.
import { jest, describe, test, expect, beforeEach, afterEach, afterAll } from "@jest/globals";
import fs from "fs"; import path from "path";

process.env.NODE_ENV = "test";
process.env.WEBHOIST_EMAIL = "designated-a@example.test,designated-b@example.test";
process.env.OWNER_REGISTRY_TTL_MS = "1000";
process.env.OWNER_REGISTRY_STALE_MAX_MS = "30000";
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => { throw new Error("injected store only"); } }));

const owners = await import("../../config/owners.js");
const registry = await import("../../services/ownerRegistry.service.js");
const root = path.resolve(process.cwd(), "..");
const rd = (p) => fs.readFileSync(path.join(root, p), "utf8");

const U1 = "11111111-1111-4111-8111-111111111111", U2 = "22222222-2222-4222-8222-222222222222";
const snap = (list) => ({ data: { installed: true, bootstrap: "closed", owners: list.map(([id, email, usable = true]) => ({ user_id: id, email, usable })), pending_emails: [] }, error: null });
let now = 5_000_000, spy;
beforeEach(() => { now = 5_000_000; spy = jest.spyOn(Date, "now").mockImplementation(() => now); registry.__testing.disable(); });
afterEach(() => spy.mockRestore());
afterAll(() => registry.__testing.disable());

describe("CL-1 registry race: a read that started before a revocation must never become the cache", () => {
  test("in-flight stale read is discarded and the post-invalidation read wins", async () => {
    let release; let call = 0;
    registry.__testing.enable(() => {
      call += 1;
      if (call === 1) return new Promise((r) => { release = () => r(snap([[U1, "a@example.test"], [U2, "b@example.test"]])); }); // old view (both owners), slow
      return Promise.resolve(snap([[U2, "b@example.test"]])); // after the revocation committed
    });
    const first = registry.ensureFresh();               // request A starts reading the OLD membership
    await Promise.resolve();
    registry.invalidate();                              // revocation committed on this instance
    const second = registry.ensureFresh();              // the post-revocation refresh the governance service awaits
    release();                                          // the slow old read finally returns
    await Promise.all([first, second]);
    expect(owners.isOwnerUser({ email: "a@example.test", id: U1 })).toBe(false);
    expect(owners.isOwnerUser({ email: "b@example.test", id: U2 })).toBe(true);
    expect(call).toBeGreaterThanOrEqual(2);
  });
});

describe("CL-2 a local revocation followed by a database hiccup must fail closed, not serve the revoked snapshot", () => {
  test("invalidate() taints the last good snapshot: unreadable store ⇒ error mode immediately", async () => {
    let healthy = true;
    registry.__testing.enable(async () => (healthy ? snap([[U1, "a@example.test"]]) : { data: null, error: { code: "08006" } }));
    await registry.ensureFresh();
    expect(owners.isOwnerEmail("a@example.test")).toBe(true);
    registry.invalidate();           // e.g. afterRevocation()
    healthy = false;
    await registry.ensureFresh();
    expect(registry.describe().mode).toBe("error");
    expect(owners.isOwnerEmail("a@example.test")).toBe(false);
  });
  test("invitation-only changes (taint:false) keep the documented stale grace", async () => {
    let healthy = true;
    registry.__testing.enable(async () => (healthy ? snap([[U1, "a@example.test"]]) : { data: null, error: { code: "08006" } }));
    await registry.ensureFresh();
    registry.invalidate({ taint: false });
    healthy = false;
    await registry.ensureFresh();
    expect(registry.describe()).toMatchObject({ mode: "database", stale: true });
    expect(owners.isOwnerEmail("a@example.test")).toBe(true);
  });
});

describe("CL-3 'not installed' must not downgrade to the env list once the store has been seen", () => {
  test("PGRST202 after a good read ⇒ fail closed; the removed designated owner does NOT regain privilege", async () => {
    let installed = true;
    registry.__testing.enable(async () => (installed ? snap([[U2, "someone@example.test"]]) : { data: null, error: { code: "PGRST202", message: "Could not find the function public.kayad_owner_snapshot in the schema cache" } }));
    await registry.ensureFresh();
    expect(owners.isOwnerEmail("designated-a@example.test")).toBe(false);
    installed = false; now += 1500; registry.invalidate({ taint: false });
    await registry.ensureFresh();
    // within the stale window the last good (membership) view is served — never the env list
    expect(owners.isOwnerEmail("designated-a@example.test")).toBe(false);
    now += 40_000; await registry.ensureFresh();
    expect(registry.describe().mode).toBe("error");
    expect(owners.isOwnerEmail("designated-a@example.test")).toBe(false);
  });
  test("a process that never saw the store still starts in legacy mode (code-before-migration stays safe)", async () => {
    registry.__testing.enable(async () => ({ data: null, error: { code: "PGRST202" } }));
    await registry.ensureFresh();
    expect(registry.describe().mode).toBe("legacy");
    expect(owners.isOwnerEmail("designated-a@example.test")).toBe(true);
  });
});

describe("CL-4 predicate strictness in database mode", () => {
  beforeEach(async () => { registry.__testing.enable(async () => snap([[U1, "a@example.test"]])); await registry.ensureFresh(); });
  test("an object without an id carries no owner privilege", () => {
    expect(owners.isOwnerUser({ email: "a@example.test" })).toBe(false);
    expect(owners.isOwnerUser({ email: "a@example.test", id: U1 })).toBe(true);
  });
  test("real-time facts on the object override the TTL-bounded snapshot (banned / deactivated / unverified)", () => {
    expect(owners.isOwnerUser({ email: "a@example.test", id: U1, isBanned: true })).toBe(false);
    expect(owners.isOwnerUser({ email: "a@example.test", id: U1, deactivatedAt: new Date() })).toBe(false);
    expect(owners.isOwnerUser({ email: "a@example.test", id: U1, emailVerified: false })).toBe(false);
    expect(owners.isOwnerUser({ email: "a@example.test", id: U1, emailVerified: true, isBanned: false })).toBe(true);
  });
});

describe("CL-5 owner ACCOUNT protection survives a store outage", () => {
  test("designated and active-member addresses stay protected in error mode and for unusable memberships", async () => {
    registry.__testing.enable(async () => snap([[U1, "a@example.test", false]]));
    await registry.ensureFresh();
    expect(owners.isOwnerEmail("a@example.test")).toBe(false);            // no privilege (unusable)
    expect(owners.isOwnerAccountEmail("a@example.test")).toBe(true);     // …but still protected from ordinary admins
    registry.__testing.enable(async () => { throw new Error("db down"); });
    await registry.ensureFresh();
    expect(registry.describe().mode).toBe("error");
    expect(owners.isOwnerAccountEmail("designated-a@example.test")).toBe(true);
    expect(owners.isOwnerAccountEmail("stranger@example.test")).toBe(false);
  });
  test("protectAccount and reportController use the protection predicate, not the privilege predicate", () => {
    expect(rd("backend/middleware/protectAccount.js")).toMatch(/targetIsOwner = isOwnerAccountEmail\(/);
    expect(rd("backend/controllers/reportController.js")).toMatch(/isOwnerAccountEmail\(targetUser\.email\)/);
  });
});

describe("CL-6 every other account-creating path refuses owner-reserved addresses", () => {
  test("admin staff creation", () => { expect(rd("backend/routes/adminRoutes.js")).toMatch(/isReservedOwnerEmail\(email\)[\s\S]{0,200}reserved for platform-owner provisioning/); });
  test("inspector approval (marks emailVerified=true without mailbox proof) is refused BEFORE either the create or the update branch", () => {
    const s = rd("backend/controllers/inspectorApplicationController.js");
    const guard = s.indexOf("isReservedOwnerEmail(application.email)");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(s.indexOf("if (!user) {", guard));
    // STAGE 5C: the existing-user branch no longer sets emailVerified at all; only the new-account branch does.
    expect(guard).toBeLessThan(s.indexOf("emailVerified: true"));
    expect(s).not.toMatch(/user\.emailVerified\s*=\s*true/);
  });
});

describe("CL-7 governance uses public registry accessors (no test seam in production code)", () => {
  test("ownerGovernance no longer reads registry.__testing", () => { expect(rd("backend/services/ownerGovernance.service.js")).not.toMatch(/__testing\.state/); });
  test("recovery can be resumed after an interrupted second step", () => {
    const s = rd("backend/services/ownerGovernance.service.js");
    expect(s).toMatch(/OWNER_RECOVERY_INCOMPLETE/); expect(s).toMatch(/interruptedRecovery/);
  });
});
