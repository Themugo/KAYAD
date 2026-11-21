// Phase 13I — saved-search notification job: operational gate, eligibility, consent isolation, dedupe, lock, audit.
// EVIDENCE TIER: unit with controlled in-memory doubles. No provider, no network, no database. The real-database behaviour
// (ledger dedupe, audit row, visibility) is certified by runbooks/phase13i-20261026/db/phase13i_saved_search_job_db.mjs.
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../../db/index.js", () => ({ findAll: jest.fn(), findById: jest.fn() }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({
  emitCommunication: jest.fn(),
  COMMUNICATION_EVENTS: { SAVED_SEARCH_MATCH: "marketplace.saved_search_match" },
}));
jest.unstable_mockModule("../../middleware/distributedLock.js", () => ({ acquireLock: jest.fn(), releaseLock: jest.fn() }));
jest.unstable_mockModule("../../utils/auditAfterCommit.js", () => ({ auditAfterCommit: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));

const { resolveSavedSearchConfig, runSavedSearchNotificationJob, isNotifiableListing } = await import("../../services/savedSearchNotificationJob.js");

const NOW = Date.parse("2026-10-26T09:00:00Z");
const car = (over = {}) => ({ id: `car-${Math.random().toString(36).slice(2, 8)}`, title: "Toyota Prado", brand: "Toyota", model: "Prado", price: 5000000, year: 2020, city: "Nairobi", status: "available", dealer: "seller-1", createdAt: "2026-10-26T08:30:00Z", ...over });
const search = (over = {}) => ({ id: "ss-1", user: "buyer-1", name: "Prado", filters: { brand: "toyota" }, notify: true, ...over });

const mkDeps = ({ searches = [search()], cars = [car()], ledger = [], users = { "buyer-1": { id: "buyer-1", status: "approved" } }, emit } = {}) => {
  const calls = { emit: [], audit: [], released: 0, lock: 0, findAll: [] };
  return {
    calls,
    deps: {
      now: () => NOW,
      findAll: async (table, opts) => { calls.findAll.push([table, opts]); if (table === "saved_searches") return searches; if (table === "cars") return cars; if (table === "communication_deliveries") return ledger; return []; },
      findById: async (_t, id) => users[id] ?? null,
      emit: emit || (async (p) => { calls.emit.push(p); return [{ id: "d1", channel: p.channels[0] }]; }),
      audit: async (e) => { calls.audit.push(e); return {}; },
      acquireLock: async () => { calls.lock += 1; return { acquired: true, id: "L1" }; },
      releaseLock: async () => { calls.released += 1; },
    },
  };
};
const ENABLED = { SAVED_SEARCH_JOB_MODE: "enabled" };

describe("resolveSavedSearchConfig — absent or invalid values fail safe", () => {
  it("defaults to off with no external delivery", () => {
    const c = resolveSavedSearchConfig({});
    expect(c).toMatchObject({ mode: "off", modeValid: true, externalDelivery: false });
  });
  it.each(["ON", "true", "1", "enable", "yes", "live", " enabled-ish "])("treats %p as off and reports it invalid", (v) => {
    const c = resolveSavedSearchConfig({ SAVED_SEARCH_JOB_MODE: v, SAVED_SEARCH_EXTERNAL_DELIVERY: "enabled" });
    expect(c.mode).toBe("off"); expect(c.modeValid).toBe(false); expect(c.externalDelivery).toBe(false);
  });
  it("accepts dry_run and enabled case-insensitively, but never enables external delivery in dry_run", () => {
    expect(resolveSavedSearchConfig({ SAVED_SEARCH_JOB_MODE: "DRY_RUN", SAVED_SEARCH_EXTERNAL_DELIVERY: "enabled" })).toMatchObject({ mode: "dry_run", externalDelivery: false });
    expect(resolveSavedSearchConfig({ SAVED_SEARCH_JOB_MODE: "Enabled" }).mode).toBe("enabled");
  });
  it("external delivery needs the exact opt-in value 'enabled'", () => {
    for (const v of [undefined, "", "true", "1", "yes", "on", "disabled"]) expect(resolveSavedSearchConfig({ ...ENABLED, SAVED_SEARCH_EXTERNAL_DELIVERY: v }).externalDelivery).toBe(false);
    expect(resolveSavedSearchConfig({ ...ENABLED, SAVED_SEARCH_EXTERNAL_DELIVERY: "enabled" }).externalDelivery).toBe(true);
  });
  it("a test runtime can never enable external delivery", () => {
    expect(resolveSavedSearchConfig({ ...ENABLED, SAVED_SEARCH_EXTERNAL_DELIVERY: "enabled", NODE_ENV: "test" }).externalDelivery).toBe(false);
  });
  it("clamps numeric limits", () => {
    expect(resolveSavedSearchConfig({ SAVED_SEARCH_LOOKBACK_HOURS: "9999" }).lookbackHours).toBe(168);
    expect(resolveSavedSearchConfig({ SAVED_SEARCH_LOOKBACK_HOURS: "0" }).lookbackHours).toBe(1);
    expect(resolveSavedSearchConfig({ SAVED_SEARCH_LOOKBACK_HOURS: "abc" }).lookbackHours).toBe(24);
    expect(resolveSavedSearchConfig({ SAVED_SEARCH_MAX_MESSAGES_PER_RUN: "-5" }).maxMessagesPerRun).toBe(1);
  });
});

describe("isNotifiableListing", () => {
  it("only an available, non-deleted listing is notifiable", () => {
    expect(isNotifiableListing({ status: "available" })).toBe(true);
    for (const status of ["pending", "hidden", "draft", "reserved", "sold", "rejected", undefined]) expect(isNotifiableListing({ status })).toBe(false);
    expect(isNotifiableListing({ status: "available", deletedAt: "2026-10-01" })).toBe(false);
    expect(isNotifiableListing(null)).toBe(false);
  });
});

describe("runSavedSearchNotificationJob", () => {
  it("off: touches nothing (no lock, no query, no emit, no audit)", async () => {
    const { deps, calls } = mkDeps();
    const s = await runSavedSearchNotificationJob({ env: {}, deps });
    expect(s.mode).toBe("off");
    expect(calls.lock + calls.findAll.length + calls.emit.length + calls.audit.length).toBe(0);
  });
  it("invalid mode behaves exactly like off", async () => {
    const { deps, calls } = mkDeps();
    await runSavedSearchNotificationJob({ env: { SAVED_SEARCH_JOB_MODE: "ON", SAVED_SEARCH_EXTERNAL_DELIVERY: "enabled" }, deps });
    expect(calls.emit.length + calls.findAll.length).toBe(0);
  });
  it("dry_run: plans and audits but never emits", async () => {
    const { deps, calls } = mkDeps();
    const s = await runSavedSearchNotificationJob({ env: { SAVED_SEARCH_JOB_MODE: "dry_run", SAVED_SEARCH_EXTERNAL_DELIVERY: "enabled" }, deps });
    expect(s).toMatchObject({ mode: "dry_run", notificationsPlanned: 1, delivered: 0, externalDelivery: false });
    expect(calls.emit).toHaveLength(0);
    expect(calls.audit).toHaveLength(1);
    expect(calls.released).toBe(1);
  });
  it("enabled without the external flag: in-app only, marketing category, stable idempotency key, ids captured", async () => {
    const c1 = car({ id: "c-1" }); const { deps, calls } = mkDeps({ cars: [c1] });
    const s = await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(s).toMatchObject({ notificationsPlanned: 1, delivered: 1, externalDelivery: false });
    expect(calls.emit).toHaveLength(1);
    expect(calls.emit[0]).toMatchObject({ userId: "buyer-1", channels: ["in_app"], category: "marketing", eventType: "marketplace.saved_search_match" });
    expect(calls.emit[0].metadata).toMatchObject({ savedSearchId: "ss-1", carIds: ["c-1"] });
    expect(calls.emit[0].metadata.idempotencyKey).toMatch(/^ss:ss-1:[0-9a-f]{24}$/);
    const again = mkDeps({ cars: [c1] }); await runSavedSearchNotificationJob({ env: ENABLED, deps: again.deps });
    expect(again.calls.emit[0].metadata.idempotencyKey).toBe(calls.emit[0].metadata.idempotencyKey);
  });
  it("hidden, pending, draft, sold and deleted listings are never notified", async () => {
    const good = car({ id: "ok" });
    const bad = ["hidden", "pending", "draft", "sold", "rejected"].map((status, i) => car({ id: `bad-${i}`, status }));
    bad.push(car({ id: "deleted", deletedAt: "2026-10-26T08:00:00Z" }));
    const { deps, calls } = mkDeps({ cars: [...bad, good] });
    const s = await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(s.candidateListings).toBe(1);
    expect(calls.emit[0].metadata.carIds).toEqual(["ok"]);
    const q = calls.findAll.find(([t]) => t === "cars")[1];
    expect(q.filters.status).toBe("available");
    expect(q.select.split(",")).toEqual(expect.arrayContaining(["id", "status", "dealer"]));
  });
  it("a seller is never notified about their own listing", async () => {
    const { deps, calls } = mkDeps({ searches: [search({ user: "seller-1" })], users: { "seller-1": { id: "seller-1" } }, cars: [car()] });
    const s = await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(s.notificationsPlanned).toBe(0); expect(calls.emit).toHaveLength(0);
  });
  it("searches with notifications switched off are not even loaded (filter notify:true)", async () => {
    const { deps, calls } = mkDeps();
    await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(calls.findAll.find(([t]) => t === "saved_searches")[1].filters).toEqual({ notify: true });
  });
  it.each([
    ["banned", { id: "buyer-1", isBanned: true }],
    ["deactivated", { id: "buyer-1", deactivatedAt: "2026-09-01" }],
    ["suspended", { id: "buyer-1", status: "suspended" }],
    ["missing", undefined],
  ])("skips a %s recipient", async (_n, user) => {
    const { deps, calls } = mkDeps({ users: user ? { "buyer-1": user } : {} });
    const s = await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(s.skippedRecipient).toBe(1); expect(calls.emit).toHaveLength(0);
  });
  it("dedupes against the delivery ledger: cars already notified for this search are not re-sent, new ones are", async () => {
    const old = car({ id: "old" }); const fresh = car({ id: "new" });
    const { deps, calls } = mkDeps({ cars: [old, fresh], ledger: [{ metadata: { savedSearchId: "ss-1", carIds: ["old"] } }] });
    const s = await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(calls.emit[0].metadata.carIds).toEqual(["new"]);
    expect(s.deduplicated).toBe(1);
    const all = mkDeps({ cars: [old], ledger: [{ metadata: { savedSearchId: "ss-1", carIds: ["old"] } }] });
    expect((await runSavedSearchNotificationJob({ env: ENABLED, deps: all.deps })).notificationsPlanned).toBe(0);
    expect(all.calls.emit).toHaveLength(0);
  });
  it("ledger rows of a different saved search do not suppress this one", async () => {
    const { deps, calls } = mkDeps({ cars: [car({ id: "c" })], ledger: [{ metadata: { savedSearchId: "OTHER", carIds: ["c"] } }] });
    await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(calls.emit).toHaveLength(1);
  });
  it("external delivery: one emit per channel; a disabled preference on one channel never blocks the others or other users", async () => {
    const seen = [];
    const emit = async (p) => {
      seen.push(`${p.userId}:${p.channels[0]}`);
      if (p.userId === "buyer-1" && p.channels[0] === "email") throw new Error("Communication channel email is disabled for marketing messages");
      return [{ id: "d" }];
    };
    const { deps } = mkDeps({ searches: [search(), search({ id: "ss-2", user: "buyer-2" })], users: { "buyer-1": { id: "buyer-1" }, "buyer-2": { id: "buyer-2" } }, emit });
    const s = await runSavedSearchNotificationJob({ env: { ...ENABLED, SAVED_SEARCH_EXTERNAL_DELIVERY: "enabled" }, deps });
    expect(seen).toEqual(["buyer-1:in_app", "buyer-1:email", "buyer-1:sms", "buyer-1:whatsapp", "buyer-2:in_app", "buyer-2:email", "buyer-2:sms", "buyer-2:whatsapp"]);
    expect(s).toMatchObject({ skippedPreference: 1, failed: 0, delivered: 7, externalDelivery: true });
  });
  it("a gateway that suppresses a channel (rollout control returns null) is counted as suppressed, not delivered", async () => {
    const { deps } = mkDeps({ emit: async () => [] });
    const s = await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(s).toMatchObject({ suppressed: 1, delivered: 0 });
  });
  it("a provider failure is recorded, does not throw, does not abort the next search", async () => {
    let n = 0;
    const emit = async () => { n += 1; if (n === 1) throw new Error("provider exploded"); return [{ id: "d" }]; };
    const { deps, calls } = mkDeps({ searches: [search(), search({ id: "ss-2", user: "buyer-2" })], users: { "buyer-1": { id: "buyer-1" }, "buyer-2": { id: "buyer-2" } }, emit });
    const s = await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(s.failed).toBe(1); expect(s.delivered).toBe(1); expect(s.errors[0]).toMatch(/provider exploded/);
    expect(calls.audit).toHaveLength(1);
  });
  it("cross-instance lock: not acquired -> nothing processed; lock error fails CLOSED", async () => {
    const a = mkDeps(); a.deps.acquireLock = async () => ({ acquired: false });
    expect((await runSavedSearchNotificationJob({ env: ENABLED, deps: a.deps })).lockSkipped).toBe(true);
    expect(a.calls.emit.length + a.calls.findAll.length).toBe(0);
    const b = mkDeps(); b.deps.acquireLock = async () => { throw new Error("rpc missing"); };
    const s = await runSavedSearchNotificationJob({ env: ENABLED, deps: b.deps });
    expect(s.lockSkipped).toBe(true); expect(s.errors[0]).toMatch(/lock_unavailable/); expect(b.calls.emit).toHaveLength(0);
  });
  it("the lock is released even when processing throws", async () => {
    const { deps, calls } = mkDeps(); deps.findAll = async () => { throw new Error("db down"); };
    const s = await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(s.failed).toBe(1); expect(calls.released).toBe(1); expect(calls.audit).toHaveLength(1);
  });
  it("per-run message cap truncates and says so", async () => {
    const searches = [1, 2, 3].map((i) => search({ id: `ss-${i}`, user: `b${i}` }));
    const users = Object.fromEntries([1, 2, 3].map((i) => [`b${i}`, { id: `b${i}` }]));
    const { deps, calls } = mkDeps({ searches, users });
    const s = await runSavedSearchNotificationJob({ env: { ...ENABLED, SAVED_SEARCH_MAX_MESSAGES_PER_RUN: "2" }, deps });
    expect(s.truncated).toBe(true); expect(calls.emit).toHaveLength(2);
  });
  it("a quiet run (nothing matched) writes no audit row; a run that planned or failed does", async () => {
    const quiet = mkDeps({ cars: [] });
    await runSavedSearchNotificationJob({ env: ENABLED, deps: quiet.deps });
    expect(quiet.calls.audit).toHaveLength(0);
    const busy = mkDeps();
    await runSavedSearchNotificationJob({ env: ENABLED, deps: busy.deps });
    expect(busy.calls.audit[0].details).toMatchObject({ mode: "enabled", notificationsPlanned: 1, delivered: 1 });
  });
  it("matching honours the existing filter semantics (brand, price ceiling) on eligible listings only", async () => {
    const { deps, calls } = mkDeps({ searches: [search({ filters: { brand: "toyota", priceMax: 4000000 } })], cars: [car({ id: "x", price: 5000000 }), car({ id: "y", price: 3000000 })] });
    const r = await runSavedSearchNotificationJob({ env: ENABLED, deps });
    expect(r.notificationsPlanned).toBe(1);
    expect(calls.emit[0].metadata.carIds).toEqual(["y"]);
  });
});
