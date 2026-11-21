// ============================================================
// STAGE 3A (2026-10-18) — report-queue enforcement guards.
//   S3A-G2-01  listing_removed set status 'rejected' on SOLD listings (admin
//              moderation refuses sold listings via utils/carModerationGuard.js).
//   S3A-G2-02  user_banned from the report queue (admin/superadmin/moderator)
//              could suspend staff and the platform owner.
// Both are now refused BEFORE the report is saved. Real controller; models mocked.
// ============================================================
import { describe, test, expect, beforeEach, jest } from "@jest/globals";

process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;

let report; let cars; let users;
const reportSave = jest.fn(async () => {});
const carUpdate = jest.fn(async () => ({}));
const userUpdate = jest.fn(async () => ({}));
const sel = (v) => ({ select: async () => v, then: (r, j) => Promise.resolve(v).then(r, j) });
jest.unstable_mockModule("../../models/Report.js", () => ({ default: { findById: jest.fn(async () => (report ? { ...report, save: reportSave } : null)) } }));
jest.unstable_mockModule("../../models/Car.js", () => ({ default: { findById: jest.fn(async (id) => cars[id] ?? null), findByIdAndUpdate: carUpdate } }));
jest.unstable_mockModule("../../models/User.js", () => ({ default: { findById: jest.fn((id) => sel(users[id] ?? null)), findByIdAndUpdate: userUpdate } }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));

const { updateReportStatus } = await import("../../controllers/reportController.js");
const mkRes = () => { const r = { code: 200 }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const MOD = { id: "mod-1", role: "moderator" };
const act = async (actionTaken, targetType, targetId) => {
  report = { id: "rep-1", targetType, targetId, status: "open" };
  const res = mkRes();
  await updateReportStatus({ params: { id: "rep-1" }, body: { status: "resolved", actionTaken }, user: MOD }, res);
  return res;
};
beforeEach(() => {
  reportSave.mockClear(); carUpdate.mockClear(); userUpdate.mockClear();
  cars = { sold: { id: "sold", status: "sold", sold: true }, live: { id: "live", status: "available" } };
  users = { admin: { email: "a@example.test", role: "admin" }, owner: { email: "owner@example.test", role: "user" }, buyer: { email: "b@example.test", role: "user" }, mod2: { email: "m@example.test", role: "moderator" } };
});

describe("S3A-G2-01 listing_removed", () => {
  test("sold listing → 409 LISTING_MODERATION_BLOCKED; report not saved; listing untouched", async () => {
    const res = await act("listing_removed", "listing", "sold");
    expect(res.code).toBe(409);
    expect(res.body.code).toBe("LISTING_MODERATION_BLOCKED");
    expect(reportSave).not.toHaveBeenCalled();
    expect(carUpdate).not.toHaveBeenCalled();
  });
  test("live listing → removed as before (status 'rejected')", async () => {
    const res = await act("listing_removed", "listing", "live");
    expect(res.code).toBe(200);
    expect(carUpdate).toHaveBeenCalledWith("live", { status: "rejected" });
  });
});

describe("S3A-G2-02 user_banned", () => {
  test.each(["admin", "owner", "mod2"])("protected target '%s' → 403 BAN_TARGET_PROTECTED; nothing saved or banned", async (who) => {
    const res = await act("user_banned", "user", who);
    expect(res.code).toBe(403);
    expect(res.body.code).toBe("BAN_TARGET_PROTECTED");
    expect(reportSave).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });
  test("ordinary user → banned as before", async () => {
    const res = await act("user_banned", "user", "buyer");
    expect(res.code).toBe(200);
    expect(userUpdate).toHaveBeenCalledWith("buyer", { isBanned: true });
  });
});
