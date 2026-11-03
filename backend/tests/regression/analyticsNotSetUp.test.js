// Traffic analytics on a database where the analytics tables have not been created (migration 20261101120000 not applied).
// Before: every page view posted to /collect returned 500 and the Super Admin report returned a generic 500.
import { describe, test, expect, beforeAll, afterAll, jest } from "@jest/globals";
import http from "http";
import express from "express";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";
process.env.NODE_ENV = "test";

const missing = { code: "42P01", message: 'relation "public.analytics_sessions" does not exist' };
let failure = missing;
const builder = () => {
  const q = {
    select: () => q, insert: () => q, update: () => q, delete: () => q, eq: () => q, lt: () => q, gte: () => q, order: () => q, range: () => q,
    maybeSingle: async () => ({ data: null, error: failure }),
    then: (res, rej) => Promise.resolve({ data: null, error: failure }).then(res, rej),
  };
  return q;
};
const client = { from: (t) => (t === "system_settings" ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) } : builder()) };
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => client, initSupabase: jest.fn(), isSupabaseConnected: () => true, checkSupabaseReadiness: async () => ({ ok: true }), default: null }));
jest.unstable_mockModule("../../middleware/auth.js", () => ({ protect: (req, res, next) => { req.user = { id: "u1", role: "superadmin" }; next(); }, optionalAuth: (req, res, next) => next() }));
jest.unstable_mockModule("../../middleware/role.js", () => ({ authorize: () => (req, res, next) => next() }));
jest.unstable_mockModule("../../utils/securityLogger.js", () => ({ logActionFromReq: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../db/index.js", () => ({ findAll: jest.fn(async () => []), count: jest.fn(async () => 0), default: {} }));

const { isAnalyticsStoreMissing } = await import("../../services/analytics.service.js");
const collect = (await import("../../routes/analyticsRoutes.js")).default;
const admin = (await import("../../routes/analyticsAdminRoutes.js")).default;

let server; let base;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/analytics", collect);
  app.use("/api/admin/analytics", admin);
  app.use((err, req, res, _next) => res.status(err.statusCode || 500).json({ success: false, message: err.message }));
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const event = { visitorId: "11111111-1111-4111-8111-111111111111", sessionId: "22222222-2222-4222-8222-222222222222", eventId: "33333333-3333-4333-8333-333333333333", type: "page_view", path: "/" };
const post = (body) => fetch(`${base}/api/analytics/collect`, { method: "POST", headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (X11; Linux) Chrome/120" }, body: JSON.stringify(body) });

describe("analytics tables missing", () => {
  test("detects the missing-table errors from Postgres and PostgREST, and nothing else", () => {
    expect(isAnalyticsStoreMissing({ code: "42P01", message: 'relation "x" does not exist' })).toBe(true);
    expect(isAnalyticsStoreMissing({ code: "PGRST205", message: "Could not find the table 'public.analytics_events' in the schema cache" })).toBe(true);
    expect(isAnalyticsStoreMissing({ message: 'relation "public.analytics_sessions" does not exist' })).toBe(true);
    expect(isAnalyticsStoreMissing({ code: "08006", message: "connection failure" })).toBe(false);
    expect(isAnalyticsStoreMissing({ message: 'relation "orders" does not exist' })).toBe(false);
    expect(isAnalyticsStoreMissing(null)).toBe(false);
  });
  test("page-view collection is a quiet no-op (202), not a 500 for every visitor", async () => {
    const r = await post(event);
    expect(r.status).toBe(202);
    expect((await r.json()).counted).toBe(false);
  });
  test.each(["summary", "live"])("admin %s answers 503 ANALYTICS_NOT_SET_UP with an actionable message", async (route) => {
    const r = await fetch(`${base}/api/admin/analytics/${route}`);
    expect(r.status).toBe(503);
    const body = await r.json();
    expect(body.code).toBe("ANALYTICS_NOT_SET_UP");
    expect(body.message).toMatch(/setup SQL/i);
  });
  test("an unrelated database failure is still a real error, not disguised as 'not set up'", async () => {
    failure = { code: "08006", message: "connection failure" };
    const r = await fetch(`${base}/api/admin/analytics/summary`);
    expect(r.status).toBe(500);
    failure = missing;
  });
});
