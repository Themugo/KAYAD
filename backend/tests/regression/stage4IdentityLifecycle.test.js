// ============================================================
// STAGE 4 (2026-10-18) — Workstream D: identity registration + session lifecycle.
//
// REAL controllers/authController.js (register, login) and middleware code.
// The database is represented by an in-memory emulation of the CONTRACT of
// public.kayad_register_identity_atomic (role allowlist, lower(btrim(email))
// uniqueness, 23505 on duplicates) and of users/user_auth rows. Nothing here
// proves the hosted database; the SQL itself is checked statically below.
// ============================================================
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

process.env.JWT_SECRET = "j".repeat(48);
process.env.REFRESH_TOKEN_SECRET = "r".repeat(48);
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

// ---------- emulated persistence ----------
const store = { users: new Map(), auth: new Map() };
const rpcCalls = [];
const ALLOWED = new Set(["user", "individual_seller", "dealer"]);
const norm = (e) => String(e).trim().toLowerCase();

const thenable = (get) => { const q = { select: () => q, lean: async () => get(), then: (r, j) => Promise.resolve(get()).then(r, j) }; return q; };
const byEmail = (e) => [...store.users.values()].find((u) => norm(u.email) === norm(e)) ?? null;
const User = {
  findOne: jest.fn((f) => thenable(() => (f?.email ? byEmail(f.email) : null))),
  findById: jest.fn((id) => thenable(() => store.users.get(id) ?? null)),
  findByIdAndUpdate: jest.fn(async () => null),
  find: jest.fn(() => thenable(() => [])),
};
const mkAuthDoc = (row) => ({
  ...row,
  matchPassword: async (p) => bcrypt.compare(p, row.password),
  save: jest.fn(async function () { store.auth.set(row.user, { ...this }); }),
});
const UserAuth = {
  findOne: jest.fn(({ user }) => thenable(() => (store.auth.has(user) ? mkAuthDoc(store.auth.get(user)) : null))),
  findOneAndUpdate: jest.fn(async () => null),
};
const sessions = [];
const RefreshToken = {
  createSession: jest.fn(async (s) => { sessions.push(s); return { sessionId: `sess-${sessions.length}` }; }),
};
const rpc = jest.fn(async (fn, args) => {
  rpcCalls.push({ fn, args });
  if (!ALLOWED.has(args.p_role)) return { data: null, error: { code: "22023", message: "Invalid self-registration role" } };
  if (byEmail(args.p_email)) return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
  const id = `u-${store.users.size + 1}`;
  const row = { id, name: args.p_name, email: norm(args.p_email), role: args.p_role, status: args.p_role === "user" ? "approved" : "pending", email_verified: false };
  store.users.set(id, { ...row, _id: id, emailVerified: false });
  store.auth.set(id, { user: id, password: args.p_password_hash, tokenVersion: 0 });
  return { data: row, error: null };
});

jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: UserAuth }));
jest.unstable_mockModule("../../models/RefreshToken.js", () => ({ default: RefreshToken }));
jest.unstable_mockModule("../../models/Dealer.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/PlatformConfig.js", () => ({ default: {} }));
jest.unstable_mockModule("../../models/Referral.js", () => ({ default: { create: jest.fn(async () => ({})) } }));
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../services/communicationGateway.service.js", () => ({ deliver: jest.fn(async () => ({ status: "sent" })) }));
jest.unstable_mockModule("../../services/communicationEvents.service.js", () => ({ emitCommunication: jest.fn(), COMMUNICATION_EVENTS: { EMAIL_VERIFICATION: "ev", REGISTRATION: "reg" } }));
const recordFailedAttempt = jest.fn();
jest.unstable_mockModule("../../middleware/accountLockout.js", () => ({ recordFailedAttempt, recordSuccessfulAttempt: jest.fn() }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ rpc }) }));

const { register, login } = await import("../../controllers/authController.js");
const { __setOnboardingPolicyForTests } = await import("../../services/onboardingPolicy.service.js");
beforeEach(() => __setOnboardingPolicyForTests({})); // STAGE 5: launch defaults (sellers enabled, dealers approval_required)

const mkRes = () => {
  const r = { code: 200, body: null, cookies: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.cookie = (n, v) => { r.cookies[n] = v; return r; };
  r.clearCookie = () => r; r.set = () => r;
  return r;
};
const GOOD_PW = "Str0ng!Passw0rd";
const reg = async (body) => { const res = mkRes(); await register({ body: { name: "N", email: "New@Example.test", password: GOOD_PW, ...body }, query: {} }, res); return res; };
const doLogin = async (email, password) => { const res = mkRes(); await login({ body: { email, password }, headers: {}, ip: "127.0.0.1" }, res); return res; };

let hash;
const seedUser = (over = {}, auth = {}) => {
  const id = over.id ?? `u-${store.users.size + 1}`;
  store.users.set(id, { id, _id: id, name: "S", email: `${id}@example.test`, role: "user", status: "approved", isBanned: false, emailVerified: true, deactivatedAt: null, save: jest.fn(async () => {}), ...over });
  if (auth !== null) store.auth.set(id, { user: id, password: hash, tokenVersion: 0, loginAttempts: 0, lockUntil: null, ...auth });
  return store.users.get(id);
};
beforeEach(async () => {
  hash = hash ?? (await bcrypt.hash(GOOD_PW, 4));
  store.users.clear(); store.auth.clear(); rpcCalls.length = 0; sessions.length = 0;
  jest.clearAllMocks();
  process.env.REQUIRE_EMAIL_VERIFICATION = "false";
});

describe("S4-D-01 registration: role escalation is impossible from the public endpoint", () => {
  test.each(["admin", "superadmin", "webhoist", "owner", "moderator", "escrow_officer", "accounts", "staff", "executive", "super_admin", "", null, undefined, 42, ["admin"], { $ne: 1 }])(
    "requested role %j is downgraded to 'user' before the database call",
    async (role) => {
      const res = await reg({ role });
      expect(res.code).toBe(201);
      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].args.p_role).toBe("user");
      expect(res.body.user.role).toBe("user");
    },
  );
  test("dealer and individual_seller are the only elevated self-registrations and start pending", async () => {
    const d = await reg({ role: "dealer", businessName: "B", location: "Nairobi", email: "d@example.test" });
    const s = await reg({ role: "individual_seller", email: "s@example.test" });
    expect([d.code, s.code]).toEqual([201, 201]);
    expect(rpcCalls.map((c) => c.args.p_role)).toEqual(["dealer", "individual_seller"]);
    expect(d.body.user.status).toBe("pending");
  });
  test("dealer without business name or location is refused before the database", async () => {
    expect((await reg({ role: "dealer", location: "x" })).code).toBe(400);
    expect((await reg({ role: "dealer", businessName: "x" })).code).toBe(400);
    expect(rpcCalls).toHaveLength(0);
  });
  test("privileged / state fields in the body never reach the RPC (exact 10-argument contract)", async () => {
    await reg({ isBanned: false, status: "approved", emailVerified: true, tokenVersion: 99, mustChangePassword: false, permissions: ["*"], grantedPermissions: ["manage_finance"], userId: "x", id: "x" });
    expect(Object.keys(rpcCalls[0].args).sort()).toEqual(
      ["p_name", "p_email", "p_role", "p_phone", "p_business_name", "p_location", "p_referred_by", "p_password_hash", "p_email_verify_token", "p_email_verify_expire"].sort(),
    );
  });
  test("the password is hashed and the verification token is stored as a hash, never in clear", async () => {
    await reg({});
    const a = rpcCalls[0].args;
    expect(a.p_password_hash).not.toContain(GOOD_PW);
    expect(await bcrypt.compare(GOOD_PW, a.p_password_hash)).toBe(true);
    expect(a.p_email_verify_token).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("S4-D-02 registration: duplicate identities", () => {
  test("case / whitespace / compatibility variants of an existing email → 409, no RPC call", async () => {
    seedUser({ email: "new@example.test" });
    for (const email of ["New@Example.test", "  new@example.test ", "NEW@EXAMPLE.TEST"]) {
      const res = await reg({ email });
      expect(res.code).toBe(409);
    }
    expect(rpcCalls).toHaveLength(0);
  });
  test("lookup uses the canonical (trimmed, lower-cased) email", async () => {
    await reg({ email: "  Mixed@Example.TEST " });
    expect(User.findOne).toHaveBeenCalledWith({ email: "mixed@example.test" });
    expect(rpcCalls[0].args.p_email).toBe("mixed@example.test");
  });
  test("race: the lookup misses but the unique index fires (23505) → 409, not 500", async () => {
    User.findOne.mockImplementationOnce(() => thenable(() => null));
    store.users.set("pre", { id: "pre", email: "new@example.test" });
    const res = await reg({});
    expect(res.code).toBe(409);
    expect(res.body.message).toMatch(/already exists/);
  });
  test("weak passwords are refused before any lookup or write", async () => {
    for (const password of ["Sh0rt!A", "alllowercase1!", "ALLUPPERCASE1!", "NoDigits!!!", "NoSpecial1234"]) {
      expect((await reg({ password })).code).toBe(400);
    }
    expect(User.findOne).not.toHaveBeenCalled();
    expect(rpcCalls).toHaveLength(0);
  });
});

describe("S4-D-03 login: account state, inconsistent mappings and lockout", () => {
  test("control: an active, verified account signs in and the role comes from the database", async () => {
    seedUser({ id: "ok", email: "ok@example.test", role: "dealer" });
    const res = await doLogin("OK@example.test", GOOD_PW);
    expect(res.code).toBe(200);
    expect(res.body.user.role).toBe("dealer");
    expect(res.cookies.refreshToken && res.cookies.token).toBeTruthy();
  });
  test("suspended: correct password → 403, no cookies, no session row", async () => {
    seedUser({ id: "b", email: "b@example.test", isBanned: true });
    const res = await doLogin("b@example.test", GOOD_PW);
    expect(res.code).toBe(403);
    expect(Object.keys(res.cookies)).toHaveLength(0);
    expect(sessions).toHaveLength(0);
  });
  test("suspended: WRONG password → generic 401 (account state is not an oracle)", async () => {
    seedUser({ id: "b2", email: "b2@example.test", isBanned: true });
    const res = await doLogin("b2@example.test", "Wrong!Passw0rd1");
    expect(res.code).toBe(401);
  });
  test("deactivated: correct password → 403, no tokens", async () => {
    seedUser({ id: "d", email: "d@example.test", deactivatedAt: new Date() });
    const res = await doLogin("d@example.test", GOOD_PW);
    expect(res.code).toBe(403);
    expect(sessions).toHaveLength(0);
  });
  test("users row without a user_auth row (inconsistent mapping) → generic 401, never 500", async () => {
    seedUser({ id: "orph", email: "orph@example.test" }, null);
    const res = await doLogin("orph@example.test", GOOD_PW);
    expect(res.code).toBe(401);
    expect(sessions).toHaveLength(0);
  });
  test("unknown email → the same generic 401 as a wrong password", async () => {
    seedUser({ id: "k", email: "k@example.test" });
    const a = await doLogin("nobody@example.test", GOOD_PW);
    const b = await doLogin("k@example.test", "Wrong!Passw0rd1");
    expect([a.code, b.code]).toEqual([401, 401]);
    expect(a.body.message).toBe(b.body.message);
  });
  test("unverified email is refused when verification is required", async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = "true";
    seedUser({ id: "uv", email: "uv@example.test", emailVerified: false });
    expect((await doLogin("uv@example.test", GOOD_PW)).code).toBe(403);
    expect(sessions).toHaveLength(0);
  });
  test("five wrong passwords lock the account; a correct password is then still refused (429)", async () => {
    seedUser({ id: "l", email: "l@example.test" });
    let last;
    for (let i = 0; i < 5; i += 1) last = await doLogin("l@example.test", "Wrong!Passw0rd1");
    expect(last.code).toBe(429);
    const ok = await doLogin("l@example.test", GOOD_PW);
    expect(ok.code).toBe(429);
    expect(sessions).toHaveLength(0);
  });
});

describe("S4-D-04 registration function: source contract (static, final migration state)", () => {
  const dir = path.join(repoRoot, "supabase/migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const sig = "kayad_register_identity_atomic";
  const mentioning = files.filter((f) => fs.readFileSync(path.join(dir, f), "utf8").includes(sig));
  const defs = mentioning.filter((f) => /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+(public\.)?kayad_register_identity_atomic/i.test(fs.readFileSync(path.join(dir, f), "utf8")));
  const finalDef = fs.readFileSync(path.join(dir, defs.at(-1)), "utf8");
  const body = finalDef.slice(finalDef.search(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.kayad_register_identity_atomic/i));
  const fn = body.slice(0, body.indexOf("$$;", body.indexOf("AS $$")) + 3);

  test("exactly one migration defines the function (no competing later redefinition)", () => {
    expect(defs).toEqual(["20261001090000_registration_onboarding_integrity.sql"]);
  });
  test("SECURITY DEFINER with a pinned search_path and schema-qualified relations", () => {
    expect(fn).toMatch(/SECURITY DEFINER/);
    expect(fn).toMatch(/SET search_path = public/);
    expect(fn).not.toMatch(/INSERT INTO\s+(?!public\.)\w+/);
  });
  test("role allowlist is exactly user / individual_seller / dealer and rejects the rest", () => {
    expect(fn).toMatch(/p_role NOT IN \('user','individual_seller','dealer'\)/);
    expect(fn).toMatch(/RAISE EXCEPTION 'Invalid self-registration role'/);
    for (const privileged of ["admin", "superadmin", "moderator", "webhoist"]) expect(fn).not.toContain(`'${privileged}'`);
  });
  test("email is lower(btrim())-normalised inside the function, matching the unique index expression", () => {
    expect(fn).toMatch(/lower\(btrim\(p_email\)\)/);
    const idx = fs.readFileSync(path.join(dir, "20260930112000_identity_email_normalization.sql"), "utf8");
    expect(idx).toMatch(/UNIQUE INDEX[\s\S]*lower\(btrim\(email\)\)/i);
  });
  test("EXECUTE is service_role only: revoked from PUBLIC/anon/authenticated and restated after the definition", () => {
    const all = mentioning.map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
    expect(all).toMatch(/REVOKE ALL ON FUNCTION public\.kayad_register_identity_atomic\([^)]*\) FROM PUBLIC/);
    expect(all).toMatch(/REVOKE EXECUTE ON FUNCTION public\.kayad_register_identity_atomic\([^)]*\)\s+FROM PUBLIC, anon, authenticated/);
    const grants = [...all.matchAll(/GRANT EXECUTE ON FUNCTION public\.kayad_register_identity_atomic\([^)]*\)\s+TO\s+([a-z_, ]+);/gi)].map((m) => m[1].trim());
    expect(grants.length).toBeGreaterThan(0);
    expect(new Set(grants)).toEqual(new Set(["service_role"]));
  });
  test("the application argument list matches the function signature one-to-one", () => {
    const params = [...fn.matchAll(/^\s+(p_[a-z_]+)\s+[A-Z]+/gm)].map((m) => m[1]);
    expect(params).toEqual(["p_name", "p_email", "p_role", "p_phone", "p_business_name", "p_location", "p_referred_by", "p_password_hash", "p_email_verify_token", "p_email_verify_expire"]);
  });
});
