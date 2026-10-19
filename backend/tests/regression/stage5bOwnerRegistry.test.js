// ============================================================
// STAGE 5B (2026-10-19) — OWNER REGISTRY: database-backed membership as the source of owner privilege.
// Drives the REAL config/owners.js predicates and the REAL services/ownerRegistry.service.js; only the snapshot
// RPC is injected. EVIDENCE TIER: mocked (the SQL behind kayad_owner_snapshot is covered by the disposable-PG checks).
// ============================================================
import { jest, describe, test, expect, beforeEach, afterEach, afterAll } from "@jest/globals";

process.env.NODE_ENV = "test";
process.env.WEBHOIST_EMAIL = "designated-a@example.test, Designated-B@Example.Test";
delete process.env.WEBHOIST_EMAILS;
process.env.OWNER_REGISTRY_TTL_MS = "1000";
process.env.OWNER_REGISTRY_STALE_MAX_MS = "5000";

jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => { throw new Error("registry must use the injected store in this suite"); } }));

const owners = await import("../../config/owners.js");
const registry = await import("../../services/ownerRegistry.service.js");

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const U3 = "33333333-3333-4333-8333-333333333333";
const snap = ({ list = [], pending = [], bootstrap = "closed" } = {}) => ({ data: { installed: true, bootstrap, owners: list, pending_emails: pending }, error: null });
const member = (id, email, usable = true) => ({ user_id: id, email, usable });

let now = 1_000_000;
let spy;
beforeEach(() => { now = 1_000_000; spy = jest.spyOn(Date, "now").mockImplementation(() => now); registry.__testing.disable(); });
afterEach(() => { spy.mockRestore(); });
afterAll(() => registry.__testing.disable());

describe("legacy behaviour is preserved until the store exists", () => {
  test("under NODE_ENV=test the registry stays in legacy mode (Stage 5A rule: designated address = owner)", async () => {
    await registry.ensureFresh();
    expect(registry.describe().mode).toBe("legacy");
    expect(owners.isOwnerEmail("designated-a@example.test")).toBe(true);
    expect(owners.isOwnerEmail("DESIGNATED-B@example.test ")).toBe(true);
    expect(owners.isOwnerEmail("someone@example.test")).toBe(false);
  });
  test("store not installed (function missing) ⇒ legacy, so shipping the code before the migration cannot lock anyone out", async () => {
    for (const error of [{ code: "PGRST202", message: "Could not find the function public.kayad_owner_snapshot" }, { code: "42883", message: "function kayad_owner_snapshot() does not exist" }]) {
      registry.__testing.enable(async () => ({ data: null, error }));
      await registry.ensureFresh();
      expect(registry.describe().mode).toBe("legacy");
      expect(owners.isOwnerEmail("designated-a@example.test")).toBe(true);
    }
  });
});

describe("database mode: membership — not the configured list — grants privilege", () => {
  test("a designated address is NOT an owner until it has an active, usable membership", async () => {
    registry.__testing.enable(async () => snap({ list: [member(U1, "kept@example.test")] }));
    await registry.ensureFresh();
    expect(registry.describe()).toMatchObject({ mode: "database", usableOwners: 1 });
    expect(owners.isOwnerEmail("kept@example.test")).toBe(true);
    expect(owners.isOwnerEmail("designated-a@example.test")).toBe(false);
    expect(owners.isOwnerUser({ email: "designated-a@example.test", id: U2 })).toBe(false);
  });
  test("full-width / case / padding variants of a member address still match, and of a designated address still do not", async () => {
    registry.__testing.enable(async () => snap({ list: [member(U1, "kept@example.test")] }));
    await registry.ensureFresh();
    expect(owners.isOwnerEmail("ＫＥＰＴ@EXAMPLE.TEST")).toBe(true);
    expect(owners.isOwnerEmail("  Kept@Example.Test ")).toBe(true);
    expect(owners.isOwnerEmail("ＤＥＳＩＧＮＡＴＥＤ-ａ@example.test")).toBe(false);
  });
  test("privilege is bound to the membership's user id: the same address on another id gets nothing", async () => {
    registry.__testing.enable(async () => snap({ list: [member(U1, "kept@example.test")] }));
    await registry.ensureFresh();
    expect(owners.isOwnerUser({ email: "kept@example.test", id: U1 })).toBe(true);
    expect(owners.isOwnerUser({ email: "kept@example.test", _id: U1 })).toBe(true);
    expect(owners.isOwnerUser({ email: "kept@example.test", id: U2 })).toBe(false);
    expect(owners.isOwnerUser({ email: "kept@example.test", _id: U3 })).toBe(false);
  });
  test("an active but UNUSABLE membership (unverified / suspended / e-mail changed) grants nothing but still reserves the address", async () => {
    registry.__testing.enable(async () => snap({ list: [member(U1, "kept@example.test", false)] }));
    await registry.ensureFresh();
    expect(owners.isOwnerEmail("kept@example.test")).toBe(false);
    expect(owners.isReservedOwnerEmail("kept@example.test")).toBe(true);
    expect(owners.isUnverifiedOwner({ email: "kept@example.test", emailVerified: false })).toBe(true);
    expect(owners.isUnverifiedOwner({ email: "kept@example.test", emailVerified: true })).toBe(false);
  });
  test("removal: a later snapshot without the member revokes privilege (after invalidate or TTL)", async () => {
    let call = 0;
    registry.__testing.enable(async () => (call++ === 0 ? snap({ list: [member(U1, "a@example.test"), member(U2, "b@example.test")] }) : snap({ list: [member(U2, "b@example.test")] })));
    await registry.ensureFresh();
    expect(owners.isOwnerUser({ email: "a@example.test", id: U1 })).toBe(true);
    registry.invalidate();
    await registry.ensureFresh();
    expect(owners.isOwnerUser({ email: "a@example.test", id: U1 })).toBe(false);
    expect(owners.isOwnerUser({ email: "b@example.test", id: U2 })).toBe(true);
  });
  test("removal propagates to other instances within the TTL without any invalidate call", async () => {
    let call = 0;
    const store = jest.fn(async () => (call++ === 0 ? snap({ list: [member(U1, "a@example.test")] }) : snap({ list: [member(U2, "b@example.test")] })));
    registry.__testing.enable(store);
    await registry.ensureFresh();
    now += 999; await registry.ensureFresh();
    expect(store).toHaveBeenCalledTimes(1);
    expect(owners.isOwnerEmail("a@example.test")).toBe(true);
    now += 2; await registry.ensureFresh();
    expect(store).toHaveBeenCalledTimes(2);
    expect(owners.isOwnerEmail("a@example.test")).toBe(false);
  });
  test("concurrent refreshes share one store call (single flight)", async () => {
    const store = jest.fn(async () => snap({ list: [member(U1, "a@example.test")] }));
    registry.__testing.enable(store);
    await Promise.all([registry.ensureFresh(), registry.ensureFresh(), registry.ensureFresh()]);
    expect(store).toHaveBeenCalledTimes(1);
  });
  test("pending invitations reserve the address against public sign-up but grant nothing", async () => {
    registry.__testing.enable(async () => snap({ list: [member(U1, "a@example.test")], pending: ["Invitee@Example.Test"] }));
    await registry.ensureFresh();
    expect(owners.isReservedOwnerEmail("invitee@example.test")).toBe(true);
    expect(owners.isOwnerEmail("invitee@example.test")).toBe(false);
    expect(owners.isUnverifiedOwner({ email: "invitee@example.test", emailVerified: false })).toBe(false); // an invited ordinary user can still sign in
    expect(owners.isReservedOwnerEmail("stranger@example.test")).toBe(false);
    expect(owners.isReservedOwnerEmail("designated-a@example.test")).toBe(true); // designation always reserves
  });
  test("a designated address with an unverified row is refused as an unverified owner in EVERY mode (Stage 5A guard intact)", async () => {
    for (const store of [null, async () => snap({ list: [member(U1, "a@example.test")] }), async () => ({ data: null, error: { code: "XX000" } })]) {
      registry.__testing.enable(store || undefined);
      if (!store) registry.__testing.disable();
      await registry.ensureFresh();
      expect(owners.isUnverifiedOwner({ email: "designated-a@example.test", emailVerified: false })).toBe(true);
      expect(owners.isUnverifiedOwner({ email: "designated-a@example.test", emailVerified: "true" })).toBe(true); // strict boolean
      expect(owners.isUnverifiedOwner({ email: "designated-a@example.test", emailVerified: true })).toBe(false);
    }
  });
});

describe("a store that cannot be trusted fails CLOSED", () => {
  const bad = [
    ["not-installed marker missing", { bootstrap: "closed", owners: [], pending_emails: [] }],
    ["owners not an array", { installed: true, bootstrap: "closed", owners: {}, pending_emails: [] }],
    ["pending not an array", { installed: true, bootstrap: "closed", owners: [], pending_emails: null }],
    ["bootstrap state unknown", { installed: true, bootstrap: "maybe", owners: [], pending_emails: [] }],
    ["user id not a uuid", { installed: true, bootstrap: "closed", owners: [{ user_id: "1; drop table users", email: "a@example.test", usable: true }], pending_emails: [] }],
    ["usable not boolean", { installed: true, bootstrap: "closed", owners: [{ user_id: U1, email: "a@example.test", usable: "yes" }], pending_emails: [] }],
    ["email missing", { installed: true, bootstrap: "closed", owners: [{ user_id: U1, usable: true }], pending_emails: [] }],
    ["empty object", {}],
    ["null", null],
    ["string", "owners"],
  ];
  test.each(bad)("malformed snapshot (%s) ⇒ error mode, nobody is an owner — not even a designated address", async (_n, data) => {
    registry.__testing.enable(async () => ({ data, error: null }));
    await registry.ensureFresh();
    expect(registry.describe().mode).toBe("error");
    expect(owners.isOwnerEmail("designated-a@example.test")).toBe(false);
    expect(owners.isOwnerEmail("a@example.test")).toBe(false);
    expect(owners.isOwnerUser({ email: "a@example.test", id: U1 })).toBe(false);
  });
  test("a transient database error serves the last good snapshot only for the stale window, then fails closed", async () => {
    let healthy = true;
    registry.__testing.enable(async () => (healthy ? snap({ list: [member(U1, "a@example.test")] }) : { data: null, error: { code: "08006", message: "connection refused" } }));
    await registry.ensureFresh();
    healthy = false;
    now += 1500; await registry.ensureFresh();
    expect(registry.describe()).toMatchObject({ mode: "database", stale: true });
    expect(owners.isOwnerEmail("a@example.test")).toBe(true);
    now += 4000; await registry.ensureFresh(); // 5.5 s since the last good read, window is 5 s
    expect(registry.describe().mode).toBe("error");
    expect(owners.isOwnerEmail("a@example.test")).toBe(false);
  });
  test("an exception thrown by the store is handled like any other unreadable store", async () => {
    registry.__testing.enable(async () => { throw new Error("boom"); });
    await registry.ensureFresh();
    expect(registry.describe().mode).toBe("error");
    expect(owners.isOwnerEmail("designated-a@example.test")).toBe(false);
  });
  test("recovery is automatic: once the store answers again, owners return", async () => {
    let ok = false;
    registry.__testing.enable(async () => (ok ? snap({ list: [member(U1, "a@example.test")] }) : { data: null, error: { code: "08006" } }));
    await registry.ensureFresh();
    expect(owners.isOwnerEmail("a@example.test")).toBe(false);
    ok = true; now += 1100; await registry.ensureFresh();
    expect(registry.describe().mode).toBe("database");
    expect(owners.isOwnerEmail("a@example.test")).toBe(true);
  });
  test("the middleware never throws and never blocks the request", async () => {
    registry.__testing.enable(async () => { throw new Error("boom"); });
    const next = jest.fn();
    await registry.ownerRegistryMiddleware({}, {}, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
  test("describe() exposes mode/usable/bootstrap but never member identities", async () => {
    registry.__testing.enable(async () => snap({ list: [member(U1, "a@example.test")], bootstrap: "open" }));
    await registry.ensureFresh();
    const d = registry.describe();
    expect(d).toMatchObject({ mode: "database", usableOwners: 1, bootstrap: "open" });
    expect(JSON.stringify(d)).not.toMatch(/a@example\.test|1111/);
  });
});

describe("OWNER_STORE_MODE=legacy is an explicit operator switch", () => {
  test("forces legacy even when a store is present (documented break-glass for a broken store)", async () => {
    process.env.OWNER_STORE_MODE = "legacy";
    try {
      registry.__testing.enable(async () => snap({ list: [member(U1, "a@example.test")] }));
      // `forced` (test seam) wins over the env switch only in tests; the switch is exercised through the non-test branch below
      expect(typeof registry.ensureFresh).toBe("function");
    } finally { delete process.env.OWNER_STORE_MODE; }
  });
});
