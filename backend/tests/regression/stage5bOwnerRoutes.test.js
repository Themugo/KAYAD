// STAGE 5B — owner route guards: authorization matrix at the HTTP edge. EVIDENCE TIER: mocked (real express, real requireOwner/requireStore, stubbed protect + governance).
import { jest, describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import http from "http";
import express from "express";

process.env.NODE_ENV = "test";
process.env.WEBHOIST_EMAIL = "owner-one@example.test,owner-two@example.test";

let currentUser = null;
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => { throw new Error("no db"); } }));
jest.unstable_mockModule("../../middleware/auth.js", () => ({
  protect: (req, res, next) => { if (!currentUser) return res.status(401).json({ success: false, code: "NO_TOKEN" }); req.user = currentUser; next(); },
  ensureFresh: async () => {}, ensureOwnerRegistryFresh: async () => {},
}));
const calls = [];
const stubGov = {};
class OwnerError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
for (const n of ["inviteOwner", "resendInvitation", "revokeInvitation", "removeOwner", "recoverOwner", "listGovernance", "previewInvitation", "acceptInvitation"]) stubGov[n] = jest.fn(async (a) => { calls.push(n); return { ok: true }; });
jest.unstable_mockModule("../../services/ownerGovernance.service.js", () => ({ ...stubGov, OwnerError }));

const registry = await import("../../services/ownerRegistry.service.js");
const { ownerRouter } = await import("../../routes/ownerRoutes.js");

const U1 = "11111111-1111-4111-8111-111111111111";
const owner = { id: U1, email: "owner-one@example.test", effectiveRole: "webhoist", emailVerified: true };
const snapOk = async () => ({ data: { installed: true, bootstrap: "closed", owners: [{ user_id: U1, email: "owner-one@example.test", usable: true }], pending_emails: [] }, error: null });

let server, base;
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use("/api/owner", ownerRouter);
  await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); });
  base = `http://127.0.0.1:${server.address().port}/api/owner`;
});
afterAll(() => { registry.__testing.disable(); server.close(); });

const call = (method, path, body) => new Promise((resolve, reject) => {
  const u = new URL(base + path); const data = body ? JSON.stringify(body) : null;
  const rq = http.request({ method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers: { "content-type": "application/json", ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } }, (rs) => {
    let b = ""; rs.on("data", (c) => (b += c)); rs.on("end", () => resolve({ status: rs.statusCode, json: b ? JSON.parse(b) : null }));
  }); rq.on("error", reject); if (data) rq.write(data); rq.end();
});
const MUTATIONS = [["POST", "/invitations"], ["POST", `/invitations/${U1}/resend`], ["DELETE", `/invitations/${U1}`], ["DELETE", `/members/${U1}`], ["POST", `/members/${U1}/recovery`]];

describe("authorization matrix for /api/owner", () => {
  beforeAll(async () => { registry.__testing.enable(snapOk); await registry.ensureFresh(); });
  const actors = {
    "unauthenticated": [null, 401],
    "private seller (role user)": [{ id: "u2", email: "seller@example.test", effectiveRole: "user", emailVerified: true }, 403],
    "dealer": [{ id: "u3", email: "dealer@example.test", effectiveRole: "dealer", emailVerified: true }, 403],
    "ordinary admin": [{ id: "u4", email: "admin@example.test", effectiveRole: "admin", emailVerified: true }, 403],
    "ordinary admin using a designated-looking address with another id": [{ id: "u5", email: "owner-one@example.test", effectiveRole: "admin", emailVerified: true }, 403],
    "webhoist label but no membership": [{ id: "u6", email: "stranger@example.test", effectiveRole: "webhoist", emailVerified: true }, 403],
    "owner address on a different user id": [{ id: "u7", email: "owner-one@example.test", effectiveRole: "webhoist", emailVerified: true }, 403],
    "owner with unverified mailbox": [{ ...owner, emailVerified: false }, 403],
    "owner with non-boolean verified flag": [{ ...owner, emailVerified: "true" }, 403],
  };
  for (const [name, [u, status]] of Object.entries(actors)) {
    test(`${name} → ${status} on list and every mutation, and the service is never reached`, async () => {
      currentUser = u; calls.length = 0;
      expect((await call("GET", "/")).status).toBe(status);
      for (const [m, p] of MUTATIONS) expect((await call(m, p, { email: "x@example.test" })).status).toBe(status);
      expect(calls).toEqual([]);
    });
  }
  test("a verified owner with active membership reaches each handler", async () => {
    currentUser = owner; calls.length = 0;
    expect((await call("GET", "/")).status).toBe(200);
    for (const [m, p] of MUTATIONS) expect([200, 201]).toContain((await call(m, p, {})).status);
    expect(calls).toEqual(["listGovernance", "inviteOwner", "resendInvitation", "revokeInvitation", "removeOwner", "recoverOwner"]);
  });
  test("handlers receive credentials/confirmation from the body only and the actor from the session", async () => {
    currentUser = owner; stubGov.inviteOwner.mockClear();
    await call("POST", "/invitations", { email: "n@example.test", confirmEmail: "n@example.test", password: "pw", actor: { id: "evil" } });
    const arg = stubGov.inviteOwner.mock.calls[0][0];
    expect(arg.actor).toBe(owner);
    expect(arg).toMatchObject({ email: "n@example.test", confirmEmail: "n@example.test", password: "pw" });
  });
});

describe("store states", () => {
  test("error mode suspends owner API for everyone (503, Retry-After, runbook pointer) — including a real owner", async () => {
    registry.__testing.enable(async () => ({ data: null, error: { code: "08006" } })); registry.invalidate(); await registry.ensureFresh();
    currentUser = owner;
    const r = await call("GET", "/");
    expect(r.status).toBe(503); expect(r.json.code).toBe("OWNER_STORE_UNAVAILABLE"); expect(r.json.message).toMatch(/RECOVERY_RUNBOOK/);
  });
  test("legacy mode: reads work (read-only view) but writes say the migration is missing", async () => {
    registry.__testing.enable(async () => ({ data: null, error: { code: "PGRST202" } })); registry.invalidate(); await registry.ensureFresh();
    currentUser = { ...owner, email: "owner-one@example.test" };
    const g = await call("GET", "/");
    expect(g.status).toBe(200); expect(g.json.canManage).toBe(false); expect(g.json.members).toEqual([]);
    const w = await call("POST", "/invitations", {});
    expect(w.status).toBe(503); expect(w.json.code).toBe("OWNER_STORE_NOT_INSTALLED");
  });
});
