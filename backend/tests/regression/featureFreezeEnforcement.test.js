// Feature freezes: route inventory, enforcement under every maintenance scope, re-enable, persistence across a restart, audit, idempotency.
// Real systemCheck + real service over an in-memory emulation of the PostgREST calls (same emulation shape as maintenanceControlService.test.js).
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

let store; let audits; let readFails;
const getPath = (value, path) => { const k = path.replace(/^value->>/, ""); const v = value?.[k]; return v === undefined || v === null ? null : String(v); };
const builder = () => {
  const st = { op: "select", filters: [], payload: null };
  const run = async () => {
    if (readFails && st.op === "select") return { data: null, error: { code: "57P01", message: "connection terminated" } };
    const match = (row) => st.filters.every((f) => (f.k === "key" ? row.key === f.v : f.isNull ? getPath(row.value, f.k) === null : getPath(row.value, f.k) === f.v));
    if (st.op === "select") { const row = store.find(match); return { data: row ? { value: structuredClone(row.value) } : null, error: null }; }
    if (st.op === "update") { const rows = store.filter(match); rows.forEach((r) => { r.value = structuredClone(st.payload.value); }); return { data: rows.map((r) => ({ value: structuredClone(r.value) })), error: null }; }
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
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: () => {}, logWarn: () => {}, logInfo: () => {} }));
const svc = await import("../../services/maintenanceControl.service.js");
const { checkSystemStatus, __resetSystemStatusState } = await import("../../middleware/systemCheck.js");
const policy = await import("../../config/featureFreezePolicy.js");

const admin = { id: "sa-1", name: "James Mugo", email: "sa@example.test", role: "superadmin" };
const REASON = "Suspected bid manipulation incident";
const legacyRow = (over = {}) => ({ key: "system_status", value: { isAuctionActive: true, isPaymentsActive: true, isGhostCheckActive: true, isMaintenanceMode: false, emergencyMessage: "m", ...over } });
beforeEach(() => { store = [legacyRow()]; audits = []; readFails = false; __resetSystemStatusState(); });

const gate = async (method, path) => {
  const res = { code: 200, body: null, headers: {}, setHeader(k, v) { res.headers[k] = v; }, status(c) { res.code = c; return res; }, json(b) { res.body = b; return res; } };
  let passed = false;
  await checkSystemStatus({ method, path, originalUrl: `/api${path}` }, res, () => { passed = true; });
  return { passed, res };
};

// FREEZE -> every route it must stop, and the neighbours it must NOT stop.
const BLOCKED = {
  auctions: [["POST", "/bids/abc123/bid"], ["POST", "/v1/bids/abc123/bid"], ["POST", "/sms-bidding/webhook/inbound"]],
  payments: [["POST", "/payments/initiate"], ["POST", "/v1/payments/initiate"], ["POST", "/auctions/a1/outcome/payment"], ["POST", "/auctions/a1/registration/commitment"], ["POST", "/auctions/a1/registration/high-value-deposit"], ["POST", "/subscriptions/upgrade"], ["POST", "/subscriptions/reactivate"], ["POST", "/dealer/upgrade"]],
  registrations: [["POST", "/auth/register"], ["POST", "/v1/auth/register"]],
  messaging: [["POST", "/chat"], ["POST", "/chat/c1/message"]],
};
const UNTOUCHED = [
  ["GET", "/bids/abc123/bids"], ["GET", "/bids/my"], ["GET", "/bids/admin/all"], ["POST", "/bids/abc123/end"], ["POST", "/bids/admin/b1/set-winner"], ["POST", "/bids/mpesa/callback"],
  ["GET", "/payments/my"], ["GET", "/payments/status/p1"], ["POST", "/payments/callback"], ["POST", "/v1/payments/callback"], ["POST", "/payments/b2c/callback"], ["POST", "/payments/b2c/timeout"],
  ["GET", "/admin/payments"], ["GET", "/admin/bids"], ["POST", "/escrow/e1/release"], ["POST", "/escrow/e1/refund"], ["POST", "/escrow/e1/dispute"], ["POST", "/escrow/e1/verify-funding"], ["POST", "/subscriptions/cancel"], ["POST", "/auctions/a1/registration"], ["GET", "/auctions/a1/registration/authorization"], ["POST", "/dealer/payouts/e1/initiate"],
  ["POST", "/auth/login"], ["POST", "/auth/refresh"], ["GET", "/auth/me"], ["POST", "/auth/forgot-password"],
  ["GET", "/chat"], ["GET", "/chat/c1/messages"], ["POST", "/chat/c1/seen"], ["DELETE", "/chat/c1"], ["GET", "/cars"],
];

describe("route inventory (exact, method-aware; never a substring match)", () => {
  test.each(Object.entries(BLOCKED).flatMap(([f, rs]) => rs.map((r) => [f, ...r])))("%s freeze classifies %s %s", (f, m, p) => {
    expect(policy.classifyFreezeRoute(m, p)?.feature).toBe(f);
  });
  test.each(UNTOUCHED)("%s %s is never a freezable route", (m, p) => { expect(policy.classifyFreezeRoute(m, p)).toBeNull(); });
  test("same path, wrong method is not frozen", () => {
    expect(policy.classifyFreezeRoute("GET", "/bids/abc/bid")).toBeNull();
    expect(policy.classifyFreezeRoute("DELETE", "/payments/initiate")).toBeNull();
  });
  test("a path that merely CONTAINS /bid or /payment is not frozen", () => {
    expect(policy.classifyFreezeRoute("POST", "/admin/payments/refund-all")).toBeNull();
    expect(policy.classifyFreezeRoute("POST", "/x/bids/abc/bid")).toBeNull();
    expect(policy.classifyFreezeRoute("POST", "/payments/initiate/extra")).toBeNull();
  });
  test("unavailable controls are listed and have no enforcement", () => {
    expect(Object.keys(policy.UNAVAILABLE_FREEZES).sort()).toEqual(["escrows", "inspection"]);
    for (const k of Object.keys(policy.UNAVAILABLE_FREEZES)) expect(policy.FEATURE_FREEZES[k]).toBeUndefined();
  });
});

describe.each([null, "global", "ordinary_users", "buyers_sellers", "dealers"])("enforcement with maintenance scope = %s", (scope) => {
  const maint = scope ? { isMaintenanceMode: true, maintenanceScope: scope, maintenanceVersion: 3 } : {};
  test.each(Object.keys(BLOCKED))("%s: frozen operation is refused, everything else behaves as without the freeze", async (feature) => {
    const field = policy.FEATURE_FREEZES[feature].field;
    for (const [m, p] of BLOCKED[feature]) {
      store = [legacyRow({ ...maint, [field]: false })]; __resetSystemStatusState();
      const r = await gate(m, p);
      if (scope === "global") expect(r.res.code).toBe(503); // maintenance refuses it first (pre-auth)
      if (scope === "global") continue;
      // Anonymous pre-auth view: scoped maintenance may itself pause anonymous registration; otherwise the FREEZE must be what stops it.
      if (r.res.body?.code === "SYSTEM_MAINTENANCE") { expect(feature).toBe("registrations"); continue; }
      expect(r.passed).toBe(false);
      expect(r.res.code).toBe(p === "/sms-bidding/webhook/inbound" ? 200 : 503);
      expect(r.res.body).toMatchObject({ success: false, code: "FEATURE_FROZEN", feature });
      expect(r.res.headers["Retry-After"]).toBe("60");
    }
    if (scope === "global") return;
    for (const [m, p] of UNTOUCHED) {
      store = [legacyRow({ ...maint, [field]: false })]; __resetSystemStatusState();
      const r = await gate(m, p);
      if (r.res.body?.code === "FEATURE_FROZEN") throw new Error(`${m} ${p} wrongly frozen by ${feature}`);
    }
  });
  test("no freeze set: nothing is frozen", async () => {
    store = [legacyRow(maint)]; __resetSystemStatusState();
    for (const rs of Object.values(BLOCKED)) for (const [m, p] of rs) expect((await gate(m, p)).res.body?.code).not.toBe("FEATURE_FROZEN");
  });
});

describe("freeze -> enforce -> re-enable -> restored (persisted, audited, idempotent)", () => {
  test.each(Object.keys(BLOCKED))("%s", async (feature) => {
    const [m, p] = BLOCKED[feature][0];
    expect((await gate(m, p)).passed).toBe(true);

    const f = await svc.applyFeatureFreeze({ type: feature, enabled: false, reason: REASON, actor: admin, ip: "9.9.9.9" });
    expect(f.changed).toBe(true); expect(f.state.featureSwitches[feature]).toBe(false);
    expect(store[0].value[policy.FEATURE_FREEZES[feature].field]).toBe(false); // persisted
    expect((await gate(m, p)).res.body?.code).toBe("FEATURE_FROZEN");
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: `Kill-switch activated: ${feature}`, adminId: "sa-1", actorRole: "superadmin", ipAddress: "9.9.9.9" });
    expect(audits[0].details).toMatchObject({ type: feature, enabled: false, reason: REASON });

    const again = await svc.applyFeatureFreeze({ type: feature, enabled: false, reason: REASON, actor: admin });
    expect(again.changed).toBe(false); expect(audits).toHaveLength(1); // idempotent: no write, no second audit

    const r = await svc.applyFeatureFreeze({ type: feature, enabled: true, reason: "Incident resolved, reopening", actor: admin });
    expect(r.changed).toBe(true); expect(r.state.featureSwitches[feature]).toBe(true);
    expect((await gate(m, p)).passed).toBe(true); // operation restored
    expect(audits).toHaveLength(2); expect(audits[1].action).toBe(`System recovered: ${feature}`);
    expect((await svc.applyFeatureFreeze({ type: feature, enabled: true, reason: "Incident resolved, reopening", actor: admin })).changed).toBe(false);
  });
  test("re-enable all restores every freeze in one audited write; one freeze never touches the others", async () => {
    await svc.applyFeatureFreeze({ type: "auctions", enabled: false, reason: REASON, actor: admin });
    await svc.applyFeatureFreeze({ type: "messaging", enabled: false, reason: REASON, actor: admin });
    expect(store[0].value.isPaymentsActive).toBe(true); expect(store[0].value.isRegistrationsActive === undefined || store[0].value.isRegistrationsActive === true).toBe(true);
    const all = await svc.applyFeatureFreeze({ type: "all", enabled: true, reason: "Reopening everything", actor: admin });
    expect(all.changed).toBe(true); expect(all.state.featureSwitches).toMatchObject({ auctions: true, payments: true, registrations: true, messaging: true });
    expect(audits).toHaveLength(3);
  });
  test("freeze state survives an application restart (cold cache re-reads the store)", async () => {
    await svc.applyFeatureFreeze({ type: "payments", enabled: false, reason: REASON, actor: admin });
    __resetSystemStatusState(); // "restart": no cache, no last-known-good
    expect((await gate("POST", "/payments/initiate")).res.body?.code).toBe("FEATURE_FROZEN");
  });
  test("an unreadable store keeps enforcing the last known freeze (fail-static), never silently re-opens it", async () => {
    await svc.applyFeatureFreeze({ type: "auctions", enabled: false, reason: REASON, actor: admin });
    __resetSystemStatusState();
    expect((await gate("POST", "/bids/x/bid")).res.body?.code).toBe("FEATURE_FROZEN"); // primes last-known-good
    readFails = true;
    jest.useFakeTimers({ now: Date.now() + 60_000 });
    try { expect((await gate("POST", "/bids/x/bid")).res.body?.code).toBe("FEATURE_FROZEN"); } finally { jest.useRealTimers(); }
  });
});

describe("validation and unavailable controls", () => {
  test("reason is required for a freeze and for a re-enable; nothing is written or audited", async () => {
    for (const enabled of [false, true]) {
      await expect(svc.applyFeatureFreeze({ type: "auctions", enabled, reason: "short", actor: admin })).rejects.toMatchObject({ code: "FREEZE_REASON_REQUIRED", status: 400 });
      await expect(svc.applyFeatureFreeze({ type: "auctions", enabled, actor: admin })).rejects.toMatchObject({ code: "FREEZE_REASON_REQUIRED" });
    }
    expect(audits).toHaveLength(0); expect(store[0].value.maintenanceVersion).toBeUndefined();
  });
  test.each(["escrows", "inspection"])("%s is refused as unavailable (409) and changes nothing", async (type) => {
    await expect(svc.applyFeatureFreeze({ type, enabled: false, reason: REASON, actor: admin })).rejects.toMatchObject({ code: "FREEZE_UNAVAILABLE", status: 409 });
    await expect(svc.applyFeatureFreeze({ type, enabled: true, reason: REASON, actor: admin })).rejects.toMatchObject({ code: "FREEZE_UNAVAILABLE", status: 409 });
    expect(audits).toHaveLength(0); expect(store[0].value.isGhostCheckActive).toBe(true);
  });
  test("unknown type is rejected; 'all' cannot be used to freeze", async () => {
    await expect(svc.applyFeatureFreeze({ type: "bogus", enabled: false, reason: REASON, actor: admin })).rejects.toMatchObject({ code: "FREEZE_INVALID_TYPE" });
    await expect(svc.applyFeatureFreeze({ type: "all", enabled: false, reason: REASON, actor: admin })).rejects.toMatchObject({ code: "FREEZE_INVALID_TYPE" });
  });
  test("a freeze change never alters maintenance state; public state reports unavailable controls", async () => {
    store = [legacyRow({ isMaintenanceMode: true })]; __resetSystemStatusState();
    const r = await svc.applyFeatureFreeze({ type: "auctions", enabled: false, reason: REASON, actor: admin });
    expect(r.state).toMatchObject({ active: true, scope: "global" });
    expect(r.state.unavailableControls.map((c) => c.id).sort()).toEqual(["escrows", "inspection"]);
    expect(store[0].value.isMaintenanceMode).toBe(true);
  });
});

describe("route inventory guard: every money / bid / registration / message POST in routes/ is either frozen or consciously exempt", () => {
  // A new route matching these words must be classified here (frozen) or listed as exempt WITH a reason, so a freeze cannot silently miss it.
  const EXEMPT = {
    "aiPlatformRoutes.js POST /conversations/:conversationId/message": "AI assistant, not user-to-user chat",
    "auctionRegistrationRoutes.js POST /:id/registration": "registration without payment; the commitment / deposit calls are frozen",
    "bidRoutes.js POST /admin/:bidId/set-winner": "admin settlement action",
    "dealerRoutes.js POST /cars/:id/accept-bid": "seller decision on an existing bid",
    "dealerRoutes.js POST /cars/:id/reject-bid": "seller decision on an existing bid",
    "dealerRoutes.js POST /payouts/:escrowId/initiate": "outbound payout of already-held funds; must stay available",
    "escrowRoutes.js POST /operations/case/:id/payout": "outbound escrow payout; must stay available",
    "escrowRoutes.js POST /:id/refund": "refund of held funds; must stay available",
    "escrowRoutes.js POST /:id/refund/:refundId/complete": "refund of held funds; must stay available",
    "escrowRoutes.js POST /:id/verify-funding": "confirms funds already sent; must stay available",
    "walletRoutes.js POST /refunds/:holdId": "refund of held bidder commitment to the bidder's own wallet/M-Pesa; must stay available during a freeze",
    "automationRoutes.js POST /approvals/initiate": "internal approval workflow, no customer payment",
    "eventRoutes.js POST /bid": "analytics event only; places no bid",
    "queueRoutes.js POST /dlq/retry/:jobId": "operator queue retry",
    "smsBiddingRoutes.js POST /register": "SMS bidder profile, no bid",
    "supportRoutes.js POST /staff/:id/messages": "support ticket thread, not chat",
    "supportRoutes.js POST /:id/messages": "support ticket thread, not chat",
    "supportTicketAdminRoutes.js POST /:id/messages": "support ticket thread, not chat",
    "heroPlacementRoutes.js POST /": "route file is not mounted anywhere in server.js / v1.js",
  };
  const FROZEN_FILES = new Set(["bidRoutes.js POST /:id/bid", "paymentRoutes.js POST /initiate", "auctionSettlementRoutes.js POST /:id/outcome/payment", "authRoutes.js POST /register", "chatRoutes.js POST /:chatId/message", "dealerRoutes.js POST /upgrade", "subscriptionRoutes.js POST /upgrade", "subscriptionRoutes.js POST /reactivate", "auctionRegistrationRoutes.js POST /:id/registration/commitment", "auctionRegistrationRoutes.js POST /:id/registration/high-value-deposit"]);
  test("no unclassified candidate route exists", async () => {
    const fs = await import("node:fs"); const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const dir = fileURLToPath(new URL("../../routes", import.meta.url));
    const unclassified = [];
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js"))) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      for (const m of src.matchAll(/router\.(post|put|patch)\(\s*["'`]([^"'`]+)["'`]/g)) {
        if (!/bid|pay|stk|initiate|regist|message|upgrade|reactivate|fund|deposit|checkout/i.test(m[2])) continue;
        const key = `${f} ${m[1].toUpperCase()} ${m[2]}`;
        if (!FROZEN_FILES.has(key) && !EXEMPT[key] && !/callback|timeout/.test(m[2])) unclassified.push(key);
      }
    }
    expect(unclassified).toEqual([]);
  });
  test("chat start (POST /) and the sms inbound webhook are covered even though their path words differ", () => {
    expect(policy.classifyFreezeRoute("POST", "/chat")?.feature).toBe("messaging");
    expect(policy.classifyFreezeRoute("POST", "/sms-bidding/webhook/inbound")?.feature).toBe("auctions");
  });
});

describe("wiring contract", () => {
  test("adminRoutes kill-switch / recover delegate to the audited service and no longer use substring checks", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("../../routes/adminRoutes.js", import.meta.url), "utf8");
    expect(src).toMatch(/applyFeatureFreeze\(\{ type, enabled: false/);
    expect(src).toMatch(/applyFeatureFreeze\(\{ type, enabled: true/);
    const sc = fs.readFileSync(new URL("../../middleware/systemCheck.js", import.meta.url), "utf8");
    expect(sc).not.toMatch(/includes\("\/bid"\)|includes\("\/payment"\)/);
    expect(sc).toMatch(/frozenFor\(settings, req\.method, req\.path\)/);
  });
});
