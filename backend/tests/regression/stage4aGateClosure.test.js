// ============================================================
// STAGE 4A (2026-10-18) — gate closure regression suite.
//   G1 rejected listing status    (static pins: writers vs constraint vs candidate migration)
//   G3 canonical admin checks     (superadmin/owner parity in lead, payment, bid-log controllers)
//   G4 feature flags fail closed  (service + middleware)
//   G5 audit-after-commit         (critical retry + marker, non-critical single attempt)
//   G6 GET /ledger/seed           (GET never mutates; POST is the mutation)
//   G7 session/owner consistency  (static pins for login/refresh/reset; revoke-all doc)
//   G8 scripts / lockfile policy  (no script points at a missing file; npm is the CI policy)
//   G9 referral guards            (operator injection, amount typing, self/suspended referrer)
// Items marked "static" read source text; they pin the repaired state, they do not execute the handler.
// ============================================================
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const src = (p) => fs.readFileSync(path.join(repo, p), "utf8");

// ---------------- mocks ----------------
const auditCreate = jest.fn();
const logError = jest.fn();
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: auditCreate } }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logError, logWarn: jest.fn(), logInfo: jest.fn(), logDebug: jest.fn() }));

const seedAccounts = jest.fn(async () => [{ code: "1000" }]);
const stub = () => jest.fn((req, res) => res.json({ success: true }));
jest.unstable_mockModule("../../controllers/ledgerController.js", () => ({
  seedAccounts: (req, res) => seedAccounts().then((d) => res.json({ success: true, data: d })),
  getBalanceSheet: stub(), getTrialBalance: stub(), getReconciliationReport: stub(), listLedgerEntries: stub(),
  createLedgerEntry: stub(), getLedgerEntry: stub(), reverseLedgerEntry: stub(),
}));
let principal = null;
jest.unstable_mockModule("../../middleware/auth.js", () => ({
  protect: (req, res, next) => (principal ? ((req.user = principal), next()) : res.status(401).json({ success: false })),
  adminOnly: (req, res, next) => next(),
}));
jest.unstable_mockModule("../../middleware/rbac.js", () => ({
  requirePermission: () => (req, res, next) => (req.user?.role === "accounts" ? next() : res.status(403).json({ success: false })),
}));
jest.unstable_mockModule("../../middleware/validate.js", () => ({
  validateObjectId: (r, s, n) => n(), validate: () => (r, s, n) => n(), validateQuery: () => (r, s, n) => n(),
}));
jest.unstable_mockModule("../../validation/ledger.schema.js", () => ({
  recordEntrySchema: {}, ledgerQuerySchema: {}, reverseEntrySchema: {}, reconciliationQuerySchema: {},
}));

const { auditAfterCommit, isCriticalAuditAction } = await import("../../utils/auditAfterCommit.js");
const { parseReferralCode, parseBonusAmount, referrerEligible } = await import("../../utils/referralGuards.js");
const { isRoleAllowed } = await import("../../config/roles.js");
const { moderationBlockedReason } = await import("../../utils/carModerationGuard.js");
const express = (await import("express")).default;
const ledgerRouter = (await import("../../routes/ledgerRoutes.js")).default;

// ---------------- G1 ----------------
describe("G1 rejected is written by three workflows while cars_status_check forbids it (static pins)", () => {
  // STAGE 5A: admin moderation and duplicate removal now write the supported 'hidden' status; only reportController still writes 'rejected'.
  const fixed = ["backend/routes/adminRoutes.js", "backend/controllers/duplicateController.js"];
  test.each(fixed)("%s no longer writes status 'rejected' (Stage 5A maps negative decisions to hidden)", (f) => {
    expect(src(f)).not.toMatch(/status\s*(=|:)\s*["']rejected["']/);
  });
  const writers = ["backend/controllers/reportController.js"];
  test.each(writers)("%s still writes status 'rejected'", (f) => {
    expect(src(f)).toMatch(/status\s*(=|:)\s*["']rejected["']/);
  });
  test("no migration in the active chain admits 'rejected' for cars.status", () => {
    const dir = path.join(repo, "supabase/migrations");
    const sql = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => src(`supabase/migrations/${f}`)).join("\n");
    expect(sql).toMatch(/CHECK \(status IN \('available','sold','pending','reserved','hidden','draft'\)\)/);
    expect(/cars_status_check[^;]*'rejected'/is.test(sql)).toBe(false);
  });
  test("the candidate migration adds 'rejected' and is outside supabase/migrations and labelled NOT EXECUTED", () => {
    const c = src("runbooks/stage4-rehearsal-20261018/03B_G2_CANDIDATE_cars_status_rejected_LOW_LOCK_NOT_APPLIED.sql");
    expect(c).toMatch(/'rejected'/);
    expect(c).toMatch(/NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION/);
    expect(fs.readdirSync(path.join(repo, "supabase/migrations")).some((f) => /03B|rejected_LOW_LOCK/i.test(f))).toBe(false);
  });
  test("transition rules: a sold listing can never be moderated; an available one can", () => {
    expect(moderationBlockedReason({ status: "sold" })).toBeTruthy();
    expect(moderationBlockedReason({ sold: true, status: "available" })).toBeTruthy();
    expect(moderationBlockedReason({ status: "available" })).toBeNull();
    expect(moderationBlockedReason({ status: "pending" })).toBeNull();
  });
  test("non-staff cannot set 'rejected' through the generic car update", () => {
    expect(src("backend/controllers/carController.js")).toMatch(/!isStaff && req\.body\.status === "rejected"/);
  });
});

// ---------------- G3 ----------------
describe("G3 admin overrides use the canonical check (superadmin and owner parity)", () => {
  const owner = { role: "superadmin", effectiveRole: "webhoist" };
  test.each([
    [{ role: "admin" }, true], [{ role: "superadmin" }, true], [owner, true],
    [{ role: "accounts" }, false], [{ role: "moderator" }, false], [{ role: "dealer" }, false], [{ role: "user" }, false],
    // dead aliases cannot be stored (users.role CHECK) and must never be granted by the helper
    [{ role: "super_admin" }, false], [{ role: "staff" }, false], [{ role: "executive" }, false],
  ])("isRoleAllowed(%j, [admin, superadmin]) === %s", (u, expected) => {
    expect(isRoleAllowed(u, ["admin", "superadmin"])).toBe(expected);
  });
  test.each(["backend/controllers/leadController.js", "backend/controllers/paymentController.js", "backend/controllers/bidLogController.js"])(
    "%s no longer compares the raw role string 'admin'", (f) => {
      const t = src(f);
      expect(/req\.user\??\.role\s*(!==|===)\s*["']admin["']/.test(t)).toBe(false);
      expect(t).toMatch(/isRoleAllowed\(req\.user, \["admin", "superadmin"\]\)/);
    });
  test("dead aliases are still not storable: users.role CHECK list excludes them", () => {
    const t = src("supabase/migrations/20260710043200_20260710005000_foundational_tables.sql");
    const m = t.match(/role TEXT NOT NULL DEFAULT 'user'[\s\S]*?CHECK \(role = ANY \(ARRAY\[([\s\S]*?)\]/);
    expect(m).toBeTruthy();
    for (const dead of ["executive", "staff", "super_admin", "manager", "engineer"]) expect(m[1]).not.toContain(`'${dead}'`);
  });
});

// ---------------- G4 ----------------
describe("G4 an unavailable feature-flag service never authorizes", () => {
  test("service fails CLOSED (FeatureFlag is not even imported, so every check lands in the catch)", async () => {
    jest.unstable_mockModule("../../db/index.js", () => ({ findAll: jest.fn(), create: jest.fn(), update: jest.fn(), findOne: jest.fn(), remove: jest.fn() }));
    jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({}) }));
    const svc = await import("../../services/featureFlagService.js");
    expect(await svc.isFlagEnabled("anything", { id: "u" })).toBe(false);
    expect(await svc.evaluateFlag("anything", { id: "u" })).toBe(false);
  });
  test("no middleware catch block calls next() (static)", () => {
    const t = src("backend/middleware/featureFlag.js");
    const catches = t.split("} catch (err) {").slice(1).map((b) => b.split(/\n  };\n};/)[0]);
    expect(catches.length).toBeGreaterThanOrEqual(8);
    for (const c of catches) {
      expect(c).not.toMatch(/\bnext\(\)/);
      expect(c).toMatch(/res\.status\((503|403)\)/);
    }
  });
  test("middleware: a throwing flag service yields 503/403, never next()", async () => {
    jest.resetModules();
    jest.unstable_mockModule("../../services/featureFlagService.js", () => ({
      isFlagEnabled: jest.fn(async () => { throw new Error("db down"); }),
      evaluateFlag: jest.fn(async () => { throw new Error("db down"); }),
    }));
    jest.unstable_mockModule("../../utils/logger.js", () => ({ logError: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn() }));
    const mw = await import("../../middleware/featureFlag.js");
    for (const h of [mw.featureFlag("k"), mw.requireFeatureFlag("k"), mw.evaluateFeatureFlag("k")]) {
      const next = jest.fn(); const res = { code: 0, status(c) { this.code = c; return this; }, json() { return this; } };
      await h({ user: { id: "u" } }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect([403, 503]).toContain(res.code);
    }
  });
  test("routes are mounted (corrects the Stage 4 statement) and the store has no schema in any migration", () => {
    expect(src("backend/server.js")).toMatch(/app\.use\("\/api\/feature-flags", featureFlagRoutes\)/);
    const dir = path.join(repo, "supabase/migrations");
    expect(fs.readdirSync(dir).filter((f) => /feature_flags/i.test(src(`supabase/migrations/${f}`)))).toEqual([]);
  });
});

// ---------------- G5 ----------------
describe("G5 audit after commit", () => {
  beforeEach(() => { auditCreate.mockReset(); logError.mockClear(); });
  test("classification: security/finance actions are critical, bulk content moderation is not", () => {
    for (const a of ["User deleted: x (user)", "Kill-switch activated: bids", "Credit Referral", "Dealer verification: approve for a", "User deactivated: x"]) {
      expect(isCriticalAuditAction({ action: a })).toBe(true);
    }
    for (const a of ["Block Chat", "Create Market Data", "announcement_created"]) expect(isCriticalAuditAction({ action: a })).toBe(false);
  });
  test("critical: one retry; second attempt succeeds -> row returned, nothing logged", async () => {
    auditCreate.mockRejectedValueOnce(new Error("blip")).mockResolvedValueOnce({ id: "a1" });
    expect(await auditAfterCommit({ action: "User deleted: x (user)", admin: "u" })).toEqual({ id: "a1" });
    expect(auditCreate).toHaveBeenCalledTimes(2);
    expect(logError).not.toHaveBeenCalled();
  });
  test("critical: both attempts fail -> never throws, returns null, logs critical:true with attempts:2", async () => {
    auditCreate.mockRejectedValue(new Error("down"));
    await expect(auditAfterCommit({ action: "Credit Referral", admin: "u", target: "Referral r" })).resolves.toBeNull();
    expect(auditCreate).toHaveBeenCalledTimes(2);
    expect(logError).toHaveBeenCalledWith("AUDIT_WRITE_FAILED_AFTER_COMMIT", expect.objectContaining({ critical: true, attempts: 2, action: "Credit Referral" }));
  });
  test("non-critical: single attempt, loud log, null", async () => {
    auditCreate.mockRejectedValue(new Error("down"));
    expect(await auditAfterCommit({ action: "Block Chat", admin: "u" })).toBeNull();
    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith("AUDIT_WRITE_FAILED_AFTER_COMMIT", expect.objectContaining({ critical: false, attempts: 1 }));
  });
  test("governance keeps its strict contract (not routed through the fail-open helper)", () => {
    expect(src("backend/controllers/governanceController.js")).not.toMatch(/auditAfterCommit/);
  });
});

// ---------------- G6 ----------------
describe("G6 GET /api/ledger/seed never mutates", () => {
  let server; let base;
  const call = async (method) => {
    if (!server) {
      const app = express(); app.use(express.json()); app.use("/api/ledger", ledgerRouter);
      await new Promise((r) => { server = app.listen(0, "127.0.0.1", r); });
      base = `http://127.0.0.1:${server.address().port}`;
    }
    const r = await fetch(`${base}/api/ledger/seed`, { method });
    return { code: r.status, allow: r.headers.get("allow"), body: await r.json().catch(() => null) };
  };
  beforeEach(() => { seedAccounts.mockClear(); principal = { id: "u", role: "accounts" }; });
  test("GET -> 405 with Allow: POST, service never called (even for a permitted finance user)", async () => {
    const r = await call("GET");
    expect(r.code).toBe(405); expect(r.allow).toBe("POST"); expect(seedAccounts).not.toHaveBeenCalled();
  });
  test("GET unauthenticated -> 401, service never called", async () => {
    principal = null; expect((await call("GET")).code).toBe(401); expect(seedAccounts).not.toHaveBeenCalled();
  });
  test("POST by MANAGE_FINANCE holder seeds; POST by others is 403 and does not seed", async () => {
    expect((await call("POST")).code).toBe(200); expect(seedAccounts).toHaveBeenCalledTimes(1);
    principal = { id: "g", role: "ghost_checker" };
    expect((await call("POST")).code).toBe(403); expect(seedAccounts).toHaveBeenCalledTimes(1);
  });
  test("no GET route in the ledger router reaches seedAccounts (static)", () => {
    expect(src("backend/routes/ledgerRoutes.js")).not.toMatch(/router\.get\("\/seed"[^\n]*seedAccounts/);
    server?.close();
  });
});

// ---------------- G7 ----------------
describe("G7 session and owner consistency (static pins)", () => {
  const auth = src("backend/controllers/authController.js");
  // STAGE 5B: the exemption predicate became the id-aware isOwnerUser(user) (membership-backed). Same shape, stronger identity.
  test("login, refresh and (protect) share the owner exemption for suspended/deactivated state", () => {
    expect(auth).toMatch(/user\.isBanned && !isOwnerUser\(user\)/);
    expect(auth).toMatch(/user\.deactivatedAt && !isOwnerUser\(user\)/);
    expect(auth).toMatch(/\(user\.isBanned \|\| user\.deactivatedAt\) && !isOwnerUser\(user\)/);
  });
  test("password reset bumps tokenVersion, revokes refresh tokens and drops the auth cache", () => {
    const reset = auth.slice(auth.indexOf("tokenVersion: (existingAuth.tokenVersion || 0) + 1"));
    expect(reset.indexOf('revokeAllForUser(userAuth.user, "password_reset")')).toBeGreaterThan(-1);
    expect(reset.indexOf("invalidateUserCache(userAuth.user)")).toBeGreaterThan(reset.indexOf("password_reset"));
  });
  test("revoke-all revokes every refresh token, bumps tokenVersion, and the API doc says so", () => {
    const fn = auth.slice(auth.indexOf("export const revokeAllSessions"));
    expect(fn).toMatch(/revokeAllForUser\(req\.user\.id, "logout"\)/);
    expect(fn).toMatch(/\$inc:\s*{\s*tokenVersion:\s*1/);
    expect(src("backend/routes/authRoutes.js")).not.toMatch(/Revoke all sessions except current/);
    expect(src("backend/routes/authRoutes.js")).toMatch(/INCLUDING the current session/);
  });
});

// ---------------- G8 ----------------
describe("G8 scripts and package-manager policy", () => {
  test("every `node scripts/<file>` target in backend/package.json exists, or the entry is an explicit DISABLED stub", () => {
    const pkg = JSON.parse(src("backend/package.json"));
    for (const [name, cmd] of Object.entries(pkg.scripts)) {
      const m = cmd.match(/^node (scripts\/[\w./-]+\.(?:js|mjs))/);
      if (m) expect({ name, exists: fs.existsSync(path.join(repo, "backend", m[1])) }).toEqual({ name, exists: true });
    }
    for (const n of ["seed-depts", "monitor", "health-check", "notify-deployment"]) {
      expect(pkg.scripts[n]).toMatch(/is DISABLED \(Stage 4A, 2026-10-18\)/);
      expect(pkg.scripts[n]).toMatch(/process\.exit\(1\)/);
    }
  });
  test("npm is the install policy in CI and Vercel; bun.lock is retained but is NOT a reproducible description of package.json", () => {
    expect(src(".github/workflows/ci.yml")).toMatch(/npm ci/);
    expect(src("vercel.json")).toMatch(/"installCommand": "npm ci"/);
    const pkg = JSON.parse(src("package.json"));
    const bun = src("bun.lock");
    const missing = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((n) => !bun.includes(`"${n}"`));
    expect(missing.length).toBeGreaterThan(0); // drift is real; re-generating bun.lock is an owner decision (D13)
    expect(fs.existsSync(path.join(repo, "bun.lock"))).toBe(true); // never deleted without a decision
  });
});

// ---------------- G9 ----------------
describe("G9 referral guards", () => {
  test("operator-injection and non-string referral codes are neutralised", () => {
    expect(parseReferralCode({ $ne: null })).toBe("");
    expect(parseReferralCode(["a"])).toBe("");
    expect(parseReferralCode(12345)).toBe("");
    expect(parseReferralCode("  ABC123  ")).toBe("ABC123");
    expect(parseReferralCode("x".repeat(500))).toHaveLength(64);
  });
  test("bonus amount must be a finite positive JSON number", () => {
    for (const bad of ["abc", "5", "1e999", NaN, Infinity, -1, 0, null, undefined, {}, [1]]) expect(Number.isNaN(parseBonusAmount(bad))).toBe(true);
    expect(parseBonusAmount(500)).toBe(500);
    expect(parseBonusAmount(0.5)).toBe(0.5);
  });
  test("self-referral (case/whitespace variants) and suspended/deactivated referrers are not eligible", () => {
    expect(referrerEligible({ email: "A@x.com " }, "a@x.com")).toBe(false);
    expect(referrerEligible({ email: "r@x.com", isBanned: true }, "new@x.com")).toBe(false);
    expect(referrerEligible({ email: "r@x.com", deactivatedAt: "2026-01-01" }, "new@x.com")).toBe(false);
    expect(referrerEligible(null, "new@x.com")).toBe(false);
    expect(referrerEligible({ email: "r@x.com" }, "new@x.com")).toBe(true);
  });
  test("registration records the referral BEFORE crediting and never credits a referee twice; admin credit is a conditional claim (static)", () => {
    const a = src("backend/controllers/authController.js");
    const blk = a.slice(a.indexOf("if (referredBy) {"));
    expect(blk.indexOf("ReferralModel.findOne({ referee: user.id })")).toBeGreaterThan(-1);
    expect(blk.indexOf("ReferralModel.create(")).toBeLessThan(blk.indexOf("$inc: { credits: REFERRAL_BONUS"));
    const adm = src("backend/routes/adminRoutes.js");
    expect(adm).toMatch(/Referral\.findOneAndUpdate\(\s*{ _id: referral\._id, status: "pending" }/);
    expect(adm).toMatch(/Referral is no longer pending/);
  });
});
