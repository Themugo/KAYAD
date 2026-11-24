// Admin console completion (2026-11-24): honest "not provisioned" answers, security-log permission, staff-only CMS Studio reads,
// and the audit-log fallback for the account activity feed / admin summary. Real middleware and controller, models mocked.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.resolve(here, "../..", rel), "utf8");

let auditRows = [];
let securityLogMissing = true;
const missingTable = () => Object.assign(new Error('relation "security_logs" does not exist'), { code: "42P01" });
const chain = (rows) => { const c = { sort: () => c, skip: () => c, limit: () => c, populate: () => c, lean: async () => rows }; return c; };
jest.unstable_mockModule("../../models/SecurityLog.js", () => ({
  default: {
    find: () => ({ populate: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => { if (securityLogMissing) throw missingTable(); return []; } }) }) }) }) }),
    countDocuments: async () => { if (securityLogMissing) throw missingTable(); return 0; },
    aggregate: async () => { if (securityLogMissing) throw missingTable(); return []; },
  },
}));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { find: () => chain(auditRows), countDocuments: async () => auditRows.length } }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn() }));

const { notProvisionedGuard, isMissingDatabaseObject } = await import("../../middleware/provisioningGuard.js");
const { getMySecurityLogs, getSecurityLogSummary } = await import("../../controllers/securityLogController.js");
const mkRes = () => { const r = { code: 200, headersSent: false }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };

describe("provisioningGuard", () => {
  test.each(["42P01", "42703", "PGRST204", "PGRST205"])("database code %s becomes 503 FEATURE_NOT_PROVISIONED naming the feature", (code) => {
    const res = mkRes(); const next = jest.fn();
    notProvisionedGuard("Automation Studio")(Object.assign(new Error("x"), { code }), {}, res, next);
    expect(res.code).toBe(503);
    expect(res.body).toMatchObject({ success: false, code: "FEATURE_NOT_PROVISIONED", feature: "Automation Studio" });
    expect(res.body.message).toMatch(/unavailable, not zero/);
    expect(next).not.toHaveBeenCalled();
  });
  test("real server faults and validation errors are passed on untouched (never relabelled)", () => {
    for (const err of [new Error("boom"), Object.assign(new Error("dup"), { code: "23505" }), Object.assign(new Error("syntax"), { code: "42601" })]) {
      const res = mkRes(); const next = jest.fn();
      notProvisionedGuard("X")(err, {}, res, next);
      expect(next).toHaveBeenCalledWith(err);
      expect(res.body).toBeUndefined();
    }
  });
  test("nothing is sent twice once headers are out", () => {
    const res = mkRes(); res.headersSent = true; const next = jest.fn(); const err = Object.assign(new Error("x"), { code: "42P01" });
    notProvisionedGuard("X")(err, {}, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
  test("isMissingDatabaseObject reads nested causes", () => {
    expect(isMissingDatabaseObject({ cause: { code: "PGRST205" } })).toBe(true);
    expect(isMissingDatabaseObject({ code: "23505" })).toBe(false);
    expect(isMissingDatabaseObject(null)).toBe(false);
  });
  test("every studio router ends with the guard and the suspicious-bid route answers 503 itself", () => {
    for (const f of ["automationRoutes", "configurationRoutes", "lowCodeRoutes", "vxpRoutes", "xosRoutes", "aiPlatformRoutes", "aiDecisionRoutes", "digitalTwinRoutes"]) {
      const src = read(`routes/${f}.js`);
      expect(src).toMatch(/import \{ notProvisionedGuard \} from "\.\.\/middleware\/provisioningGuard\.js";/);
      expect(src.indexOf("router.use(notProvisionedGuard(")).toBeGreaterThan(src.lastIndexOf("router.get("));
      expect(src.indexOf("router.use(notProvisionedGuard(")).toBeLessThan(src.indexOf("export default router"));
    }
    expect(read("routes/bidRoutes.js")).toMatch(/FEATURE_NOT_PROVISIONED/);
  });
});

describe("route authorization (static contract)", () => {
  test("security log list and summary require VIEW_LOGS on top of staff; /my stays open to any signed-in account", () => {
    const src = read("routes/securityLogRoutes.js");
    expect(src).toMatch(/router\.get\("\/", protect, adminOnly, requirePermission\(PERM\.VIEW_LOGS\)/);
    expect(src).toMatch(/router\.get\("\/summary", protect, adminOnly, requirePermission\(PERM\.VIEW_LOGS\)/);
    expect(src).toMatch(/router\.get\("\/my", protect, validateQuery/);
  });
  test("CMS: public routes come BEFORE the staff gate; every Studio read after it requires staff", () => {
    const src = read("routes/cmsRoutes.js");
    const gate = src.indexOf("router.use(protect, adminOnly);");
    expect(gate).toBeGreaterThan(0);
    for (const publicRoute of ['router.get("/pages/s/:slug"', 'router.get("/content"', 'router.get("/faqs"', 'router.post("/analytics/track"']) {
      expect(src.indexOf(publicRoute)).toBeGreaterThan(-1);
      expect(src.indexOf(publicRoute)).toBeLessThan(gate);
    }
    for (const studioRead of ['router.get("/pages"', 'router.get("/campaigns"', 'router.get("/banners"', 'router.get("/media"', 'router.get("/dashboard/stats"', 'router.get("/revisions"']) {
      expect(src.indexOf(studioRead)).toBeGreaterThan(gate);
    }
    expect(src).not.toMatch(/^router\.use\(protect\);$/m);
  });
  test("automation keeps its deliberate any-staff gate", () => {
    expect(read("routes/automationRoutes.js")).toMatch(/router\.use\(protect, adminOnly\);/);
  });
});

describe("security log fallback to canonical audit_logs", () => {
  beforeEach(() => { securityLogMissing = true; auditRows = []; });
  test("/my answers 200 from audit_logs (scoped to the caller) when security_logs is absent", async () => {
    auditRows = [{ id: "1", action: "login", createdAt: "2026-11-24T05:00:00Z", details: { severity: "warning" } }, { id: "2", action: "listing_update", createdAt: "2026-11-24T04:00:00Z" }];
    const res = mkRes();
    await getMySecurityLogs({ query: {}, user: { id: "u1" } }, res);
    expect(res.code).toBe(200);
    expect(res.body.source).toBe("audit_logs_fallback");
    expect(res.body.logs.map((l) => l.action)).toEqual(["login", "listing_update"]);
    expect(res.body.logs[0].severity).toBe("warning");
    expect(res.body.pagination.total).toBe(2);
  });
  test("an empty audit source is a real empty list (200), not a failure", async () => {
    const res = mkRes();
    await getMySecurityLogs({ query: {}, user: { id: "u1" } }, res);
    expect(res.code).toBe(200);
    expect(res.body.logs).toEqual([]);
  });
  test("summary falls back with criticalCount NULL (unavailable, never zero) and says it is a fallback", async () => {
    auditRows = [{ action: "login" }, { action: "login" }, { action: "ban" }];
    const res = mkRes();
    await getSecurityLogSummary({}, res);
    expect(res.code).toBe(200);
    expect(res.body.summary).toMatchObject({ total: 3, criticalCount: null, source: "audit_logs_fallback" });
    expect(res.body.summary.recentActions[0]).toEqual({ _id: "login", count: 2 });
  });
  test("when the table exists the normal path is used (no fallback marker)", async () => {
    securityLogMissing = false;
    const res = mkRes();
    await getMySecurityLogs({ query: {}, user: { id: "u1" } }, res);
    expect(res.code).toBe(200);
    expect(res.body.source).toBeUndefined();
  });
});

describe("NTSA approval writes only real cars columns", () => {
  test("no verifiedBy (cars.verified_by does not exist) and a failed car update returns the request to its previous state", () => {
    const src = read("routes/ntsaVerificationRoutes.js");
    const block = src.slice(src.indexOf("Car.findByIdAndUpdate(request.car"), src.indexOf("Car.findByIdAndUpdate(request.car") + 220);
    expect(block).toMatch(/ntsaVerified: true/);
    expect(block).not.toMatch(/verifiedBy/);
    expect(src).toMatch(/request\.status = previousStatus;/);
  });
});

describe("report listing takedown uses a valid status", () => {
  test("reportController never writes cars.status 'rejected' (not allowed by cars_status_check)", () => {
    const src = read("controllers/reportController.js");
    expect(src).not.toMatch(/status: "rejected"/);
    expect(src).toMatch(/status: "hidden"/);
  });
});

describe("migration contract", () => {
  const sql = read("../supabase/migrations/20261124100000_admin_customer_care_and_market_tables.sql");
  test("is additive: no drop/truncate/delete/alter-type, every table guarded and RLS-enabled", () => {
    expect(sql).not.toMatch(/\b(drop\s+table|truncate|delete\s+from|drop\s+column)\b/i);
    for (const t of ["market_data", "ntsa_verification_requests", "reports", "feedback", "announcements"]) {
      expect(sql).toMatch(new RegExp(`create table if not exists public\\.${t} \\(`));
      expect(sql).toMatch(new RegExp(`alter table public\\.${t} enable row level security`));
    }
    expect(sql).not.toMatch(/escrow|payment|ledger|payout|commission/i);
  });
  test("client roles get no table grant on the three tables this migration creates; the two pre-existing hosted tables are left alone", () => {
    expect(sql).toMatch(/revoke all on table public\.reports, public\.feedback, public\.announcements from anon, authenticated;/);
    expect(sql).not.toMatch(/revoke[^;]*(market_data|ntsa_verification_requests)/i);
  });
  test("audience values match the API (no individual_seller)", () => {
    expect(sql).toMatch(/audience in \('all','dealers','buyers','specific_users'\)/);
    expect(sql).not.toMatch(/individual_seller|private_seller/i);
  });
});
