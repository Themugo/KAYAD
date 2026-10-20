// ============================================================
// STAGE 5E.1 — resend verification, END TO END through the REAL canonical Brevo path.
//   resendVerification -> communicationGateway.deliver -> email.service.sendRawEmail -> emailProvider.sendBrevoEmail -> fetch
// Only the network (global fetch), storage (models / delivery ledger), logging sinks and the retry sleeper are replaced.
// EVIDENCE TIER: M (mocked HTTP). Nothing is sent; no live Brevo call is made; this proves source behaviour, not mailbox delivery.
// ============================================================
import { jest, describe, test, expect, beforeEach, afterAll } from "@jest/globals";
import crypto from "crypto";

process.env.JWT_SECRET = "j".repeat(48);
process.env.NODE_ENV = "test";
process.env.FRONTEND_URL = "https://app.example.test";
process.env.REQUIRE_EMAIL_VERIFICATION = "true";
// Synthetic opaque fixture (no provider prefix, not a credential). Tests only need a non-empty, distinctive string.
const FIXTURE = "fixture-not-a-credential-0002";
process.env.BREVO_API_KEY = FIXTURE;
process.env.BREVO_FROM_EMAIL = "sender@example.test";
delete process.env.EMAIL_FROM; delete process.env.BREVO_FROM_NAME; delete process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS;

const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");
const users = new Map();
const auths = new Map(); // persisted view: { user, emailVerifyToken, emailVerifyExpire }
const thenable = (get) => { const q = { select: () => q, lean: async () => get(), then: (r, j) => Promise.resolve(get()).then(r, j) }; return q; };

// A UserAuth document double whose save() persists ONLY what it is told to; a failing save() leaves the persisted view untouched.
let failSave = false;
const makeAuthDoc = (persisted) => {
  const doc = { user: persisted.user, emailVerifyToken: persisted.emailVerifyToken, emailVerifyExpire: persisted.emailVerifyExpire };
  doc.save = jest.fn(async () => { if (failSave) throw new Error("db write failed"); Object.assign(persisted, { emailVerifyToken: doc.emailVerifyToken, emailVerifyExpire: doc.emailVerifyExpire }); return doc; });
  return doc;
};
jest.unstable_mockModule("../../models/User.js", () => ({ default: {
  findOne: jest.fn((f) => thenable(() => [...users.values()].find((u) => u.email === f?.email) ?? null)),
  findById: jest.fn((id) => thenable(() => users.get(id) ?? null)),
} }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: {
  findOne: jest.fn((f) => thenable(() => { const p = auths.get(String(f?.user)); return p ? makeAuthDoc(p) : null; })),
  // verifyEmail contract: atomically match hash + unexpired, null the token (single use), return the doc
  findOneAndUpdate: jest.fn(async (q, patch) => {
    const p = [...auths.values()].find((a) => a.emailVerifyToken && a.emailVerifyToken === q.emailVerifyToken && a.emailVerifyExpire && a.emailVerifyExpire > q.emailVerifyExpire.$gt);
    if (!p) return null; Object.assign(p, patch); return { user: p.user };
  }),
} }));
for (const m of ["RefreshToken", "Dealer", "PlatformConfig", "Referral"]) jest.unstable_mockModule(`../../models/${m}.js`, () => ({ default: {} }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../middleware/accountLockout.js", () => ({ recordFailedAttempt: jest.fn(), recordSuccessfulAttempt: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc: jest.fn() }), isSupabaseConnected: () => false }));
jest.unstable_mockModule("../../middleware/distributedLock.js", () => ({ withLock: async (_k, fn) => fn() }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));
jest.unstable_mockModule("../../services/communicationRollout.service.js", () => ({ isCommunicationEnabled: async () => true }));

// Delivery ledger (communication_deliveries) — in memory
const ledger = new Map(); let seq = 0;
const realDb = await import("../../db/index.js");
jest.unstable_mockModule("../../db/index.js", () => ({
  ...realDb,
  create: jest.fn(async (table, data) => { if (table !== "communication_deliveries") return { id: `x${++seq}`, ...data };
    if (data.idempotencyKey && [...ledger.values()].some((r) => r.idempotencyKey === data.idempotencyKey && r.provider === data.provider)) { const e = new Error("dup"); e.code = "23505"; throw e; }
    const row = { id: `d${++seq}`, ...data }; ledger.set(row.id, row); return row; }),
  update: jest.fn(async (table, id, patch) => { if (table !== "communication_deliveries") return null; const row = ledger.get(id); Object.assign(row, patch); return row; }),
  findById: jest.fn(async (table, id) => (table === "communication_deliveries" ? ledger.get(id) ?? null : null)),
  findOne: jest.fn(async (table, filter) => (table === "communication_deliveries" ? [...ledger.values()].find((r) => Object.entries(filter).every(([k, v]) => r[k] === v)) ?? null : null)),
  findAll: jest.fn(async () => []),
}));

// Logging sinks are captured so we can prove no secret ever reaches a log line.
const logs = [];
const rec = (lvl) => jest.fn((...a) => logs.push([lvl, JSON.stringify(a, (k, v) => (v instanceof Error ? { message: v.message, code: v.code } : v))]));
const realLogger = await import("../../utils/logger.js");
jest.unstable_mockModule("../../utils/logger.js", () => ({ ...realLogger, logError: rec("error"), logWarn: rec("warn"), logInfo: rec("info"), logDebug: rec("debug") }));
const realInfra = await import("../../infrastructure/logging/index.js");
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ ...realInfra, logError: rec("error"), logWarn: rec("warn"), logInfo: rec("info"), logDebug: rec("debug") }));

// Retry sleeper: keep the REAL withRetry/circuit code path semantic (single attempt) so each scenario is isolated and fast.
// The real retry policy (3 retries, back-off, 4xx also retried) is covered by stage5e1BrevoAdapterRetry.test.js.
const realRetry = await import("../../utils/retry.js");
jest.unstable_mockModule("../../utils/retry.js", () => ({ ...realRetry, createServiceConfig: (name, o) => ({ ...realRetry.createServiceConfig(name, o), retries: 0, circuitBreaker: false }) }));

const { resendVerification, verifyEmail } = await import("../../controllers/authController.js");
const { handleProviderStatus } = await import("../../services/communicationGateway.service.js");

const realFetch = global.fetch;
let calls = [];
const stubFetch = (impl) => { calls = []; global.fetch = jest.fn(async (url, init) => { calls.push({ url, init }); return impl(url, init); }); };
const ok = (body = { messageId: "<msg-1@brevo.test>" }) => () => ({ ok: true, status: 201, json: async () => body });
const http = (status, body = { code: "err", message: "provider says no" }) => () => ({ ok: false, status, json: async () => body });
afterAll(() => { global.fetch = realFetch; });

const mkRes = () => { const r = { code: 200, body: null }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const settle = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r)); };
const resend = async (email) => { const res = mkRes(); await resendVerification({ body: { email }, headers: {}, ip: "127.0.0.1" }, res); await settle(); return res; };
const verify = async (token) => { const res = mkRes(); await verifyEmail({ params: { token } }, res); return res; };
const DAY = 24 * 60 * 60 * 1000;
const OLD = "old-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const seed = ({ id = "u1", email = "buyer@example.test", verified = false, issuedAgoMs = 10 * 60 * 1000, oldToken = OLD } = {}) => {
  users.set(id, { _id: id, id, email, name: "Buyer", emailVerified: verified, save: jest.fn(async function () { return this; }) });
  auths.set(id, { user: id, emailVerifyToken: sha(oldToken), emailVerifyExpire: new Date(Date.now() - issuedAgoMs + DAY) });
};
const sentBody = () => JSON.parse(calls[0].init.body);
const tokenFromBody = () => { const m = /verify-email\?token=([0-9a-f]{64})/.exec(sentBody().textContent || sentBody().htmlContent || ""); return m && m[1]; };
const allLogs = () => logs.map((l) => l[1]).join("\n");
const ledgerRows = () => [...ledger.values()];

beforeEach(() => {
  users.clear(); auths.clear(); ledger.clear(); logs.length = 0; calls = []; failSave = false;
  process.env.BREVO_API_KEY = FIXTURE; process.env.BREVO_FROM_EMAIL = "sender@example.test";
  delete process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS; stubFetch(ok());
});

describe("E1 — Brevo accepts: replacement committed once, via the canonical adapter", () => {
  test("one POST to the Brevo transactional endpoint, hashed token stored, raw token only in the outbound message", async () => {
    seed(); const res = await resend("buyer@example.test");
    expect(res.code).toBe(202);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(calls[0].init.headers["api-key"]).toBe(FIXTURE);
    expect(sentBody().sender.email).toBe("sender@example.test");
    expect(sentBody().to).toEqual([{ email: "buyer@example.test" }]);
    const raw = tokenFromBody();
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(auths.get("u1").emailVerifyToken).toBe(sha(raw)); // stored = SHA-256 of the emailed token
    expect(auths.get("u1").emailVerifyToken).not.toBe(sha(OLD));
    expect(auths.get("u1").emailVerifyExpire.getTime()).toBeGreaterThan(Date.now() + DAY - 60_000);
    const row = ledgerRows()[0];
    expect(row.provider).toBe("brevo"); expect(row.status).toBe("sent");
  });
  test("the delivery ledger and logs never contain the raw token, the verification URL or the API key", async () => {
    seed(); await resend("buyer@example.test");
    const raw = tokenFromBody();
    const persisted = JSON.stringify(ledgerRows());
    for (const secret of [raw, `verify-email?token=${raw}`, FIXTURE]) { expect(persisted).not.toContain(secret); expect(allLogs()).not.toContain(secret); }
    expect(ledgerRows()[0].metadata.sensitiveBodyOmitted).toBe(true);
    expect(ledgerRows()[0].metadata.html).toBeUndefined(); expect(ledgerRows()[0].metadata.text).toBeUndefined();
    expect(ledgerRows()[0].idempotencyKey).not.toContain(raw);
  });
});

describe("E2 — Brevo rejects / is unreachable / times out: the previous usable token survives and the answer stays generic", () => {
  const cases = [
    ["400 bad request (e.g. sender not validated)", () => stubFetch(http(400, { code: "invalid_parameter", message: "sender not valid" }))],
    ["401 invalid API key", () => stubFetch(http(401, { code: "unauthorized", message: "Key not found" }))],
    ["402/403 account or IP blocked", () => stubFetch(http(403, { code: "permission_denied", message: "IP not allowed" }))],
    ["429 provider rate limit", () => stubFetch(http(429))],
    ["503 provider unavailable", () => stubFetch(http(503, {}))],
    ["network failure (fetch rejects)", () => stubFetch(() => { throw new TypeError("fetch failed"); })],
    ["timeout (AbortSignal TimeoutError)", () => stubFetch(() => { const e = new Error("The operation was aborted due to timeout"); e.name = "TimeoutError"; throw e; })],
    ["unparseable provider body", () => stubFetch(() => ({ ok: false, status: 502, json: async () => { throw new Error("bad json"); } }))],
  ];
  test.each(cases)("%s", async (_n, arrange) => {
    seed(); const before = { ...auths.get("u1") };
    arrange();
    const res = await resend("buyer@example.test");
    expect(res.code).toBe(202);
    expect(res.body.success).toBe(true); // generic, no oracle
    expect(auths.get("u1").emailVerifyToken).toBe(before.emailVerifyToken);
    expect(auths.get("u1").emailVerifyExpire.getTime()).toBe(before.emailVerifyExpire.getTime());
    const row = ledgerRows()[0];
    expect(row.status === "failed" || row.status === "dead_letter").toBe(true);
    expect(JSON.stringify(row) + allLogs()).not.toContain(FIXTURE);
    // the previous link is still redeemable
    const v = await verify(OLD); expect(v.code).toBe(200);
  });
});

describe("E3 — configuration missing or invalid: no false success, no premature rotation, no network call", () => {
  test("BREVO_API_KEY missing: provider never called, token unchanged, ledger row failed with a safe reason", async () => {
    seed(); delete process.env.BREVO_API_KEY; const before = auths.get("u1").emailVerifyToken;
    const res = await resend("buyer@example.test");
    expect(res.code).toBe(202); expect(calls).toHaveLength(0);
    expect(auths.get("u1").emailVerifyToken).toBe(before);
    expect(ledgerRows()[0].status).toBe("failed"); expect(ledgerRows()[0].lastError).toMatch(/not configured/i);
  });
  test("the sender is bound when the process starts: changing BREVO_FROM_EMAIL afterwards does not change the From address (a restart is required)", async () => {
    seed(); delete process.env.BREVO_FROM_EMAIL;
    await resend("buyer@example.test");
    expect(calls).toHaveLength(1);
    expect(sentBody().sender.email).toBe("sender@example.test"); // email.service.js captures FROM at import time
  });
  test("REQUIRE_EMAIL_VERIFICATION=false changes nothing about the commit point", async () => {
    seed(); process.env.REQUIRE_EMAIL_VERIFICATION = "false"; stubFetch(http(401));
    const before = auths.get("u1").emailVerifyToken; await resend("buyer@example.test");
    process.env.REQUIRE_EMAIL_VERIFICATION = "true";
    expect(auths.get("u1").emailVerifyToken).toBe(before);
  });
});

describe("E4 — database persistence fails AFTER provider acceptance: safe, logged, recoverable, never reported as completed", () => {
  test("old token stays valid, the response is still the generic 202, the failure is logged without secrets, and a later resend recovers", async () => {
    seed(); failSave = true; const oldHash = auths.get("u1").emailVerifyToken;
    const res = await resend("buyer@example.test");
    expect(res.code).toBe(202);
    expect(calls).toHaveLength(1); // the provider DID accept
    const strandedRaw = tokenFromBody();
    expect(auths.get("u1").emailVerifyToken).toBe(oldHash); // persisted state unchanged
    expect(ledgerRows()[0].status).toBe("sent"); // the ledger honestly records provider acceptance only
    expect(logs.some(([lvl, line]) => lvl === "error" && /Verification resend failed/.test(line) && /db write failed/.test(line))).toBe(true);
    expect(allLogs()).not.toContain(strandedRaw); expect(allLogs()).not.toContain(FIXTURE);
    // the emailed link is dead (documented residual: the user holds an unusable email) ...
    expect((await verify(strandedRaw)).code).toBe(400);
    // ... but the account is not stranded: the old link works, and a new resend commits cleanly
    failSave = false; stubFetch(ok({ messageId: "<msg-2@brevo.test>" }));
    await resend("buyer@example.test");
    const fresh = tokenFromBody();
    expect(fresh).not.toBe(strandedRaw);
    expect((await verify(fresh)).code).toBe(200);
  });
});

describe("E5 — links: expired, replayed, malformed, rotated-out and wrong-identity tokens are all refused", () => {
  test("a valid link verifies exactly once; replay is refused", async () => {
    seed(); expect((await verify(OLD)).code).toBe(200); expect(users.get("u1").emailVerified).toBe(true);
    expect((await verify(OLD)).code).toBe(400);
  });
  test("an expired link is refused and does not verify the account", async () => {
    seed(); auths.get("u1").emailVerifyExpire = new Date(Date.now() - 1000);
    expect((await verify(OLD)).code).toBe(400); expect(users.get("u1").emailVerified).toBe(false);
  });
  test.each([["empty", ""], ["short", "abc"], ["non-hex", "zz".repeat(32)], ["oversized", "a".repeat(10_000)], ["sql/nosql-looking", "{\"$ne\":null}"], ["unicode", "ключ-проверки"]])("a malformed token (%s) is refused without error", async (_n, tok) => {
    seed(); const r = await verify(tok); expect([400]).toContain(r.code); expect(users.get("u1").emailVerified).toBe(false);
  });
  test("wrong identity: user B's token cannot verify user A", async () => {
    seed({ id: "u1", email: "a@example.test" }); seed({ id: "u2", email: "b@example.test", oldToken: "token-for-b-".padEnd(64, "b") });
    expect((await verify("token-for-b-".padEnd(64, "b"))).code).toBe(200);
    expect(users.get("u2").emailVerified).toBe(true); expect(users.get("u1").emailVerified).toBe(false);
  });
  test("after a committed resend the superseded link no longer works and the new one does", async () => {
    seed(); await resend("buyer@example.test"); const fresh = tokenFromBody();
    expect((await verify(OLD)).code).toBe(400); expect((await verify(fresh)).code).toBe(200);
  });
});

describe("E6 — account enumeration and cooldown", () => {
  test("unknown, already-verified and unverified addresses receive byte-identical responses", async () => {
    seed({ id: "u1", email: "unverified@example.test" }); seed({ id: "u2", email: "verified@example.test", verified: true });
    const a = await resend("unverified@example.test"); const b = await resend("verified@example.test"); const c = await resend("nobody@example.test");
    expect(JSON.stringify([a.code, a.body])).toBe(JSON.stringify([b.code, b.body])); expect(JSON.stringify([b.code, b.body])).toBe(JSON.stringify([c.code, c.body]));
    expect(calls).toHaveLength(1); // only the unverified account produced a provider call
  });
  test("a second resend inside the cooldown produces no second provider call", async () => {
    seed({ issuedAgoMs: 10 * 60 * 1000 }); await resend("buyer@example.test");
    await resend("buyer@example.test"); expect(calls).toHaveLength(1);
  });
});

describe("E7 — provider ACCEPTANCE is not mailbox DELIVERY and is not link consumption", () => {
  test("acceptance leaves the ledger at 'sent'; the account stays unverified; only a webhook can advance the ledger to 'delivered'; only the link verifies", async () => {
    seed(); await resend("buyer@example.test");
    const row = ledgerRows()[0]; expect(row.status).toBe("sent"); expect(users.get("u1").emailVerified).toBe(false);
    expect(row.providerMessageId).toBeTruthy();
    await handleProviderStatus({ provider: "brevo", providerMessageId: row.providerMessageId, status: "delivered", providerEventId: "evt-1" });
    expect(ledgerRows()[0].status).toBe("delivered"); expect(users.get("u1").emailVerified).toBe(false); // delivered != clicked
    const tok = tokenFromBody(); expect((await verify(tok)).code).toBe(200); expect(users.get("u1").emailVerified).toBe(true);
  });
});
