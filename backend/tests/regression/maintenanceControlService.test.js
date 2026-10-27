// Maintenance control service: atomic (compare-and-swap) writes, idempotency, concurrency, audit, honest store errors.
// The data layer is an in-memory emulation of exactly the PostgREST calls the service makes (select/eq/is/update/insert + jsonb ->> filters).
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

let store; let failMode; let audits; let invalidations; let hooks;
const getPath = (value, path) => { const k = path.replace(/^value->>/, ""); const v = value?.[k]; return v === undefined || v === null ? null : String(v); };
const builder = (table) => {
  const st = { op: "select", filters: [], payload: null };
  const run = async () => {
    if (hooks.beforeRun) await hooks.beforeRun(st);
    if (failMode === "read" && st.op === "select") return { data: null, error: { code: "57P01", message: "connection terminated" } };
    if (failMode === "write" && st.op !== "select") return { data: null, error: { code: "57P01", message: "connection terminated" } };
    if (failMode === "missing") return { data: null, error: { code: "PGRST205", message: "Could not find the table" } };
    const match = (row) => st.filters.every((f) => (f.k === "key" ? row.key === f.v : f.isNull ? getPath(row.value, f.k) === null : getPath(row.value, f.k) === f.v));
    if (st.op === "select") { const row = store.find(match); return { data: row ? { value: structuredClone(row.value) } : null, error: null }; }
    if (st.op === "update") { const rows = store.filter(match); rows.forEach((r) => { r.value = structuredClone(st.payload.value); }); return { data: rows.map((r) => ({ value: structuredClone(r.value) })), error: null }; }
    if (st.op === "insert") { if (store.some((r) => r.key === st.payload.key)) return { data: null, error: { code: "23505", message: "duplicate" } }; store.push(structuredClone(st.payload)); return { data: [structuredClone(st.payload)], error: null }; }
    return { data: null, error: null };
  };
  const b = {
    select() { return b; }, eq(k, v) { st.filters.push({ k, v }); return b; }, is(k, v) { st.filters.push({ k, isNull: v === null }); return b; },
    update(p) { st.op = "update"; st.payload = p; return b; }, insert(p) { st.op = "insert"; st.payload = p; return b; },
    maybeSingle() { return run(); }, then(res, rej) { return run().then(res, rej); },
  };
  return b;
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: builder }), isSupabaseConnected: () => true }));
jest.unstable_mockModule("../../utils/auditAfterCommit.js", () => ({ auditAfterCommit: async (e) => { audits.push(e); return e; } }));
jest.unstable_mockModule("../../middleware/systemCheck.js", () => ({ invalidateSystemStatusCache: () => { invalidations += 1; } }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: () => {}, logWarn: () => {}, logInfo: () => {} }));
const svc = await import("../../services/maintenanceControl.service.js");

const owner = { id: "owner-1", name: "Owner One", email: "o@example.test", isOwner: true };
const tech = { id: "tech-1", name: "Tech One", email: "t@example.test", isOwner: false };
const base = () => ({ key: "system_status", value: { isAuctionActive: true, isPaymentsActive: true, isGhostCheckActive: true, isMaintenanceMode: false, emergencyMessage: "System under scheduled maintenance." } });
const REASON = "Emergency database failover";
beforeEach(() => { store = [base()]; failMode = null; audits = []; invalidations = 0; hooks = {}; });

describe("activation, scope change, recovery", () => {
  test("activate -> state read back from the store, audited, cache invalidated", async () => {
    const r = await svc.activate({ actor: owner, scope: "dealers", reason: REASON, incidentRef: "INC-42", ip: "1.2.3.4" });
    expect(r.changed).toBe(true); expect(r.transition).toBe("activated");
    expect(r.state).toMatchObject({ active: true, scope: "dealers", reason: REASON, incidentRef: "INC-42", operatorName: "Owner One", operatorRole: "system_owner", version: 1 });
    expect(store[0].value.isMaintenanceMode).toBe(true); expect(store[0].value.maintenanceScope).toBe("dealers");
    expect(store[0].value.isAuctionActive).toBe(true); // other switches preserved
    expect(audits).toHaveLength(1); expect(audits[0].action).toBe("Maintenance activated: dealers");
    expect(audits[0].details).toMatchObject({ scope: "dealers", reason: REASON, incidentRef: "INC-42", version: 1 }); expect(audits[0].adminId).toBe("owner-1");
    expect(invalidations).toBeGreaterThan(0);
  });
  test("activating the same scope and message again is an idempotent no-op (no write, no audit, same version)", async () => {
    await svc.activate({ actor: owner, scope: "dealers", reason: REASON });
    const again = await svc.activate({ actor: owner, scope: "dealers", reason: "second click on the button" });
    expect(again.changed).toBe(false); expect(again.transition).toBe("unchanged"); expect(again.state.version).toBe(1); expect(audits).toHaveLength(1);
  });
  test("changing scope while active is recorded as a scope change and keeps the original activation time", async () => {
    const a = await svc.activate({ actor: owner, scope: "dealers", reason: REASON });
    const b = await svc.activate({ actor: owner, scope: "global", reason: "Escalating to full outage" });
    expect(b.transition).toBe("scope_changed"); expect(b.state.scope).toBe("global"); expect(b.state.version).toBe(2); expect(b.state.activatedAt).toBe(a.state.activatedAt);
    expect(audits[1].action).toBe("Maintenance scope changed: dealers -> global"); expect(audits[1].details.previousScope).toBe("dealers");
  });
  test("recover is idempotent, audited, and records who ended it", async () => {
    await svc.activate({ actor: owner, scope: "global", reason: REASON });
    const r = await svc.recover({ actor: tech, reason: "Failover complete, verified healthy" });
    expect(r.changed).toBe(true); expect(r.state.active).toBe(false); expect(r.state.scope).toBeNull();
    expect(r.state.lastRecovery).toMatchObject({ by: "Tech One", role: "technical_recovery", previousScope: "global" });
    expect(audits.at(-1).action).toBe("Maintenance recovered: global");
    const again = await svc.recover({ actor: owner });
    expect(again.changed).toBe(false); expect(audits).toHaveLength(2);
  });
  test("the hosted legacy row (flag on, no scope, no version) is readable as global and can be recovered", async () => {
    store = [{ key: "system_status", value: { isMaintenanceMode: true, emergencyMessage: "System under scheduled maintenance.", isAuctionActive: true, isPaymentsActive: true, isGhostCheckActive: true } }];
    expect((await svc.readState()).maintenanceScope).toBe("global");
    const r = await svc.recover({ actor: owner });
    expect(r.changed).toBe(true); expect(store[0].value.isMaintenanceMode).toBe(false); expect(store[0].value.maintenanceVersion).toBe(1);
    expect(store[0].value.emergencyMessage).toBe("System under scheduled maintenance."); // untouched
  });
  test("a missing row is created on first activation", async () => {
    store = [];
    const r = await svc.activate({ actor: owner, scope: "buyers_sellers", reason: REASON });
    expect(r.changed).toBe(true); expect(store).toHaveLength(1);
  });
});

describe("validation", () => {
  test("scope, reason and incident reference are validated", () => {
    expect(() => svc.validateActivation({ scope: "everyone", reason: REASON })).toThrow(/scope/i);
    expect(() => svc.validateActivation({ scope: "global", reason: "short" })).toThrow(/reason/i);
    expect(() => svc.validateActivation({ scope: "global", reason: REASON, incidentRef: "<script>" })).toThrow(/incident/i);
    expect(svc.validateActivation({ scope: "dealers", reason: `  ${REASON}  `, incidentRef: "INC-9" })).toMatchObject({ scope: "dealers", reason: REASON, incidentRef: "INC-9" });
    expect(() => svc.validateRecovery({}, { reasonRequired: true })).toThrow(/why/i);
    expect(svc.validateRecovery({}, { reasonRequired: false }).reason).toBe("");
  });
});

describe("concurrency (compare-and-swap)", () => {
  test("parallel activations with different scopes are serialised: nothing lost, version counts every effective change, one audit row each", async () => {
    const scopes = ["dealers", "buyers_sellers", "ordinary_users", "global", "dealers", "buyers_sellers"];
    const results = await Promise.all(scopes.map((s) => svc.activate({ actor: owner, scope: s, reason: `parallel ${s} activation` })));
    const final = store[0].value;
    expect(scopes).toContain(final.maintenanceScope);
    const effective = results.filter((r) => r.changed).length;
    expect(final.maintenanceVersion).toBe(effective); // every effective write bumped the version exactly once
    expect(audits).toHaveLength(effective);
    expect(final.isMaintenanceMode).toBe(true);
  });
  test("parallel recovers: exactly one effective, the rest idempotent", async () => {
    await svc.activate({ actor: owner, scope: "global", reason: REASON });
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => svc.recover({ actor: owner })));
    expect(rs.filter((r) => r.changed)).toHaveLength(1); expect(store[0].value.isMaintenanceMode).toBe(false);
    expect(audits.filter((a) => /recovered/.test(a.action))).toHaveLength(1);
  });
  test("activate racing recover never produces a half state (flag and scope always agree)", async () => {
    await svc.activate({ actor: owner, scope: "global", reason: REASON });
    await Promise.all([svc.recover({ actor: owner }), svc.activate({ actor: owner, scope: "dealers", reason: "racing activation" }), svc.recover({ actor: tech, reason: "racing recovery" })]);
    const v = store[0].value;
    expect(v.isMaintenanceMode ? ["dealers", "global"].includes(v.maintenanceScope) : !v.maintenanceScope).toBe(true);
  });
  test("legacy feature switches share the writer and never clobber maintenance state", async () => {
    await Promise.all([svc.activate({ actor: owner, scope: "dealers", reason: REASON }), svc.setFeatureSwitch("isAuctionActive", false), svc.setFeatureSwitch("isPaymentsActive", false)]);
    const v = store[0].value;
    expect(v.isMaintenanceMode).toBe(true); expect(v.maintenanceScope).toBe("dealers"); expect(v.isAuctionActive).toBe(false); expect(v.isPaymentsActive).toBe(false);
  });
  test("expectedVersion mismatch is an honest 409 carrying the current state; nothing is written", async () => {
    await svc.activate({ actor: owner, scope: "dealers", reason: REASON });
    await expect(svc.activate({ actor: owner, scope: "global", reason: "stale screen", expectedVersion: 0 })).rejects.toMatchObject({ code: "MAINTENANCE_STATE_CONFLICT", status: 409 });
    expect(store[0].value.maintenanceScope).toBe("dealers"); expect(audits).toHaveLength(1);
    const ok = await svc.activate({ actor: owner, scope: "global", reason: "fresh screen now", expectedVersion: 1 });
    expect(ok.state.scope).toBe("global");
  });
  test("persistent contention gives up honestly instead of reporting success", async () => {
    hooks.beforeRun = async (st) => { if (st.op === "update") store[0].value.maintenanceVersion = (store[0].value.maintenanceVersion || 0) + 1000; };
    await expect(svc.activate({ actor: owner, scope: "global", reason: REASON })).rejects.toMatchObject({ code: "MAINTENANCE_STATE_CONTENDED", status: 503 });
    expect(audits).toHaveLength(0);
  });
});

describe("honest errors when the store is unavailable", () => {
  test("read failure -> 503 MAINTENANCE_STORE_UNAVAILABLE (never a fabricated 'operational' state)", async () => {
    failMode = "read";
    await expect(svc.readState()).rejects.toMatchObject({ code: "MAINTENANCE_STORE_UNAVAILABLE", status: 503 });
    await expect(svc.activate({ actor: owner, scope: "global", reason: REASON })).rejects.toMatchObject({ status: 503 });
  });
  test("write failure -> 503, state unchanged, no audit row, cache not invalidated as if it succeeded", async () => {
    failMode = "write";
    const before = structuredClone(store[0].value);
    await expect(svc.activate({ actor: owner, scope: "dealers", reason: REASON })).rejects.toMatchObject({ code: "MAINTENANCE_STORE_UNAVAILABLE", status: 503 });
    expect(store[0].value).toEqual(before); expect(audits).toHaveLength(0); expect(invalidations).toBe(0);
  });
  test("missing table is reported as such", async () => {
    failMode = "missing";
    await expect(svc.readState()).rejects.toMatchObject({ code: "MAINTENANCE_STORE_UNAVAILABLE", message: expect.stringMatching(/not available/i) });
  });
});
