// ============================================================
// Health-route composition + communications readiness exposure.
//
// Root cause being guarded (2026-10-13): server.js registers the shallow
// handler (utils/healthCheck.js: app.get("/health")) at line ~304, BEFORE
// app.use("/health", healthRoutes) at line ~882. The first handler answers and
// never calls next(), so anything added to routes/healthRoutes.js "GET /" is
// unreachable for GET /health. Communications readiness therefore lives on the
// admin-only /health/deep handler.
//
// This test imports the REAL Express app from server.js (NODE_ENV=test, so it
// does not bootstrap/listen) and drives it over HTTP through the REAL
// protect/adminOnly middleware. Only persistence, Redis/queue, and the
// readiness probe's database access are replaced. No network, no production
// credentials, no email. Mock-based: this is NOT live-provider evidence.
// ============================================================
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import http from "http";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "test";
process.env.DISABLE_REDIS = "true";
process.env.PORT = process.env.PORT || "0"; // server.js env validation requires PORT; not listened on under NODE_ENV=test
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-minimum-x";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
const SECRET = process.env.JWT_SECRET;
const CANARY = "SECRET-CANARY-do-not-leak";
process.env.BREVO_API_KEY = CANARY;
process.env.BREVO_FROM_EMAIL = "sender@example.test";

const chain = (value) => {
  const q = { select: vi.fn(() => q), lean: vi.fn(() => q), catch: vi.fn(() => q), then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return q;
};
const users = {};
vi.doMock("../../models/User.js", () => ({
  default: { findById: vi.fn((id) => chain(users[id] || null)), findByIdAndUpdate: vi.fn(() => chain({})), findOne: vi.fn(() => chain(null)), find: vi.fn(() => chain([])), countDocuments: vi.fn(async () => 0) },
}));
vi.doMock("../../models/UserAuth.js", () => ({ default: { findOne: vi.fn(() => chain({ tokenVersion: 0 })), findOneAndUpdate: vi.fn(() => chain({})) } }));
vi.doMock("../../models/RefreshToken.js", () => ({ default: { findActiveSessionById: vi.fn(async () => ({})) } }));

// Readiness probe: controlled per test (its own DB queries are unit-tested in communicationsLaunchReadiness).
let readiness;
const readinessMock = vi.fn(async () => readiness);
vi.doMock("../../services/communicationReadiness.service.js", () => ({
  checkCommunicationReadiness: readinessMock,
  providerConfigState: () => "env_present",
}));

// Infrastructure that would otherwise need Redis/Supabase: partial mocks keep every other export real.
const realCache = await import("../../utils/cache.js");
vi.doMock("../../utils/cache.js", () => ({ ...realCache, isRedisConnected: () => true }));
const realSupabase = await import("../../utils/supabase.js");
vi.doMock("../../utils/supabase.js", () => ({ ...realSupabase, isSupabaseConnected: () => true }));
const realQueue = await import("../../config/queue.js");
vi.doMock("../../config/queue.js", () => ({
  ...realQueue,
  connection: { status: "ready" },
  getQueueMetrics: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
}));

const { default: app } = await import("../../server.js");

const token = (id) => jwt.sign({ id, tokenVersion: 0 }, SECRET, { expiresIn: "1h" });
["user", "dealer", "marketing", "admin", "superadmin"].forEach((role) => {
  users[`u-${role}`] = { _id: `u-${role}`, email: `${role}@example.test`, name: role, role, status: "approved", emailVerified: true };
});

let server; let base;
beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));
beforeEach(() => {
  readinessMock.mockClear();
  readiness = { schema: "schema_ready", missingColumns: [], providerConfig: "env_present", providerAcceptance: "none_observed", mailboxDelivery: "none_observed" };
});

const call = (path, role) => fetch(base + path, { headers: role ? { authorization: `Bearer ${token(`u-${role}`)}` } : {} });

describe("route registration contract (real server.js composition)", () => {
  test("shallow handler is registered before the /health router, so router GET / can never answer GET /health", async () => {
    const stack = app.router?.stack || app._router?.stack || [];
    const healthGetIdx = stack.findIndex((l) => l.route && l.route.path === "/health" && l.route.methods.get);
    const healthRouterIdx = stack.findIndex((l) => l.name === "router" && String(l.matchers?.[0]?.("/health")?.path ?? l.regexp ?? "").length && l.matchers?.[0]?.("/health/detailed"));
    expect(healthGetIdx).toBeGreaterThan(-1);
    expect(healthRouterIdx).toBeGreaterThan(-1);
    expect(healthGetIdx).toBeLessThan(healthRouterIdx);
  });

  test("the router-root communications block is unreachable from GET /health (documented, intentionally not relied upon)", async () => {
    const res = await call("/health");
    const body = await res.json();
    expect(body.service).toBe("Kayad API");
    expect(body.checks).toEqual({ database: "ok" });
    expect(readinessMock).not.toHaveBeenCalled();
  });
});

describe("public GET /health stays minimal", () => {
  test("returns the existing minimal contract and no diagnostics", async () => {
    const res = await call("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["buildId", "checks", "env", "service", "status", "ts", "uptime", "version"]);
    expect(body.status).toBe("ok");
    expect(JSON.stringify(body)).not.toMatch(/communications|schema|missingColumns|provider|mailbox/i);
  });
});

describe("/health/deep authorization (real protect + adminOnly)", () => {
  test("anonymous -> 401, readiness never invoked", async () => {
    const res = await call("/health/deep");
    expect(res.status).toBe(401);
    expect(readinessMock).not.toHaveBeenCalled();
  });
  test.each(["user", "dealer"])("non-staff role %s -> 403", async (role) => {
    const res = await call("/health/deep", role);
    expect(res.status).toBe(403);
    expect(readinessMock).not.toHaveBeenCalled();
  });
  test.each(["admin", "superadmin"])("%s -> 200 with communications fields", async (role) => {
    const res = await call("/health/deep", role);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checks.communications).toEqual({
      status: "ok", schema: "schema_ready", missingColumns: [],
      providerConfig: "env_present", providerAcceptance: "none_observed", mailboxDelivery: "none_observed",
    });
  });
  test("/api/health/deep alias is protected the same way", async () => {
    expect((await call("/api/health/deep")).status).toBe(401);
    expect((await call("/api/health/deep", "admin")).status).toBe(200);
  });
});

describe("status aggregation", () => {
  test("schema_ready keeps overall status ok and existing checks intact", async () => {
    const body = await (await call("/health/deep", "admin")).json();
    expect(body.status).toBe("ok");
    expect(Object.keys(body.checks)).toEqual(expect.arrayContaining(["database", "redis", "posthog", "memory", "queue", "communications"]));
    expect(body.checks.database.status).toBe("ok");
  });

  test("schema_mismatch degrades overall status (503) and names the missing column", async () => {
    readiness = { schema: "schema_mismatch", missingColumns: ["idempotency_key"], providerConfig: "env_present", providerAcceptance: "unknown", mailboxDelivery: "unknown" };
    const res = await call("/health/deep", "admin");
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.communications.status).toBe("degraded");
    expect(body.checks.communications.missingColumns).toEqual(["idempotency_key"]);
  });

  test("unknown schema degrades overall status", async () => {
    readiness = { schema: "unknown", missingColumns: [], providerConfig: "env_present", providerAcceptance: "unknown", mailboxDelivery: "unknown" };
    const res = await call("/health/deep", "admin");
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.communications.status).toBe("degraded");
  });

  test("a throwing readiness check never reports healthy", async () => {
    readinessMock.mockRejectedValueOnce(new Error("db exploded"));
    const res = await call("/health/deep", "admin");
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.communications).toEqual({ status: "degraded", schema: "unknown" });
  });

  test("provider layers stay distinct: env present + observed acceptance does not imply mailbox delivery", async () => {
    readiness = { schema: "schema_ready", missingColumns: [], providerConfig: "env_present", providerAcceptance: "observed", mailboxDelivery: "none_observed" };
    const body = await (await call("/health/deep", "admin")).json();
    expect(body.checks.communications.providerAcceptance).toBe("observed");
    expect(body.checks.communications.mailboxDelivery).toBe("none_observed");
  });
});

describe("no secrets in responses", () => {
  test.each(["/health", "/health/deep"])("%s never contains configured secret values or free-text errors", async (path) => {
    const res = await call(path, path === "/health" ? undefined : "admin");
    const text = await res.text();
    expect(text).not.toContain(CANARY);
    expect(text).not.toContain("sender@example.test");
    expect(text).not.toMatch(/api[-_ ]?key|authorization|bearer|password|postgres(ql)?:\/\//i);
  });
});
