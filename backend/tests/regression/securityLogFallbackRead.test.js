// Regression: getSecurityLogs fell into a ReferenceError ("action is not defined") when
// public.security_logs was absent, so the documented audit_logs fallback never ran.
// EVIDENCE TIER: mocked local runtime (the two models are faked; the controller is real).
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const missingTable = Object.assign(new Error('relation "public.security_logs" does not exist'), { code: "42P01" });
const securityFind = jest.fn();
const auditRows = [
  { id: "a1", action: "login_failed", actor: "u1", createdAt: "2026-11-21T10:00:00Z", ipAddress: "10.0.0.1", details: { severity: "warning" } },
  { id: "a2", action: "listing_pause", actor: "u2", createdAt: "2026-11-21T09:00:00Z", details: {} },
];
const auditFind = jest.fn();

jest.unstable_mockModule("../../models/SecurityLog.js", () => ({
  default: { find: securityFind, countDocuments: jest.fn().mockRejectedValue(missingTable) },
}));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { find: auditFind } }));
jest.unstable_mockModule("../../infrastructure/logging/index.js", () => ({ logError: jest.fn() }));

const { getSecurityLogs } = await import("../../controllers/securityLogController.js");
const mkRes = () => { const r = { statusCode: 200 }; r.status = (c) => { r.statusCode = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };

beforeEach(() => {
  securityFind.mockReset();
  securityFind.mockReturnValue({ populate: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.reject(missingTable) }) }) }) }) });
  auditFind.mockReset();
  auditFind.mockReturnValue({ sort: () => ({ limit: () => ({ lean: () => Promise.resolve(auditRows) }) }) });
});

describe("getSecurityLogs audit_logs fallback", () => {
  test("serves the audit_logs fallback (200) when security_logs is missing", async () => {
    const res = mkRes();
    await getSecurityLogs({ query: { page: "1", limit: "30" } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.source).toBe("audit_logs_fallback");
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.logs[0].severity).toBe("warning");
  });

  test("applies the severity filter and pagination in the fallback", async () => {
    const res = mkRes();
    await getSecurityLogs({ query: { severity: "warning", page: "1", limit: "1" } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.logs.map((l) => l.id)).toEqual(["a1"]);
  });

  test("an unrelated failure still returns 500, not a fake success", async () => {
    securityFind.mockReturnValue({ populate: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.reject(new Error("boom")) }) }) }) }) });
    const res = mkRes();
    await getSecurityLogs({ query: {} }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
