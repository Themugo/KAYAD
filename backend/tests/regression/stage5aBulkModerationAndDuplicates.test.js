// ============================================================
// STAGE 5A (2026-10-19) — GATE E: BULK MODERATION + DUPLICATE REMOVAL USE ONLY STATES THE DATABASE ACCEPTS,
// AND SAY WHAT ACTUALLY HAPPENED.
//
// Findings fixed in 5A (all reproduced against the Stage 5 tree first):
//   E1  POST /admin/cars/:id/moderate {action:"reject"} wrote status "rejected" (not in cars_status_check) ⇒ 500, no change.
//   E2  bulk "reject" HID the listings but the UI/notification/message called them "rejected" ("3 car(s) rejectd").
//   E3  duplicate review "removed" wrote status "rejected" (⇒ constraint violation) AFTER marking the log reviewed, leaving a
//       reviewed log over a still-public duplicate.
// The single-listing route is covered in stage5OwnerOnboardingSettings.test.js ("moderation actions are truthful").
// ============================================================
import { describe, test, expect, beforeEach, jest } from "@jest/globals";

process.env.WEBHOIST_EMAIL = "owner@example.test";
delete process.env.WEBHOIST_EMAILS;

// ---- fake supabase recording update calls (for Model.softDelete) ----
const calls = [];
let updateResult = { data: [{ id: "c1" }], error: null };
const fakeClient = {
  from(table) {
    const rec = { table, op: null, patch: null, filters: [] };
    const q = {
      update(patch) { rec.op = "update"; rec.patch = patch; return q; },
      in(c, v) { rec.filters.push(["in", c, v]); return q; },
      is(c, v) { rec.filters.push(["is", c, v]); return q; },
      select() { return q; },
      then(res, rej) { calls.push(rec); return Promise.resolve(updateResult).then(res, rej); },
    };
    return q;
  },
};
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => fakeClient, isSupabaseConnected: () => true }));
jest.unstable_mockModule("../../utils/io.js", () => ({ getIO: () => null }));
jest.unstable_mockModule("../../utils/logger.js", () => ({ logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn() }));
jest.unstable_mockModule("../../utils/cache.js", () => ({ cacheDelPattern: jest.fn(async () => {}) }));
const sendNotification = jest.fn(async () => {});
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification }));
const auditAfterCommit = jest.fn(async () => ({}));
jest.unstable_mockModule("../../utils/auditAfterCommit.js", () => ({ auditAfterCommit, AUDIT_WRITE_FAILED_AFTER_COMMIT: "X" }));

// ---- controller-level model fakes ----
let carList = [];
const carUpdateMany = jest.fn(async () => ({}));
const carSoftDelete = jest.fn(async () => ({ modifiedCount: 1 }));
const userUpdate = jest.fn(async () => ({}));
jest.unstable_mockModule("../../models/Car.js", () => ({
  default: {
    find: jest.fn(() => { const p = Promise.resolve(carList); p.populate = async () => carList; return p; }),
    findById: jest.fn(async (id) => carList.find((c) => c.id === id) ?? null),
    updateMany: carUpdateMany,
    softDelete: carSoftDelete,
  },
}));
jest.unstable_mockModule("../../models/User.js", () => ({
  default: { findById: jest.fn(() => ({ select: async () => ({ listingCount: 3 }) })), findByIdAndUpdate: userUpdate },
}));
jest.unstable_mockModule("../../models/AuditLog.js", () => ({ default: { create: jest.fn(async () => ({})) } }));
const markAsReviewed = jest.fn(async () => {});
let dupLog = null;
jest.unstable_mockModule("../../models/DuplicateVehicleLog.js", () => ({ default: { findById: jest.fn(async () => dupLog) } }));
jest.unstable_mockModule("../../services/duplicateVehicleService.js", () => ({ restoreScores: jest.fn(async () => {}) }));

const { bulkModerateCars, bulkDeleteCars } = await import("../../controllers/bulkAdminController.js");
const { confirmAsDuplicate } = await import("../../controllers/duplicateController.js");
const { createModel } = await import("../../models/_base.js");

const mkRes = () => { const r = { code: 200 }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };
const ADMIN = { id: "adm-1", role: "admin", name: "A" };
const dealer = { _id: "seller-1", email: "s@example.test", name: "S" };
const live = (id, extra = {}) => ({ id, _id: id, title: id, status: "pending", dealer, ...extra });

beforeEach(() => { carList = []; carUpdateMany.mockClear(); sendNotification.mockClear(); auditAfterCommit.mockClear(); markAsReviewed.mockClear(); });

describe("E2 bulk moderation: the negative decision hides, and says so", () => {
  test.each(["hide", "reject"])("action %j ⇒ $set status 'hidden', never 'rejected'; truthful message, notification and audit", async (action) => {
    carList = [live("a"), live("b")];
    const res = mkRes();
    await bulkModerateCars({ body: { carIds: ["a", "b"], action, adminNote: "no logbook" }, user: ADMIN }, res);
    expect(res.code).toBe(200);
    expect(carUpdateMany.mock.calls[0][1]).toEqual({ $set: { status: "hidden" } });
    expect([res.body.action, res.body.status]).toEqual(["hide", "hidden"]);
    expect(res.body.message).toBe("2 listing(s) hidden (not publicly visible)");
    expect(res.body.message).not.toMatch(/reject/i);
    const n = sendNotification.mock.calls.at(-1)[0];
    expect(n.title).toBe("Listing not approved");
    expect(n.message).toMatch(/not publicly visible.*no logbook/);
    const a = auditAfterCommit.mock.calls.at(-1)[0];
    expect(a.action).toBe("bulk_car_hide");
    expect(a.details).toMatchObject({ requestedAction: action, resultingStatus: "hidden", count: 2 });
  });
  test("approve ⇒ 'available' and an approval message", async () => {
    carList = [live("a")];
    const res = mkRes();
    await bulkModerateCars({ body: { carIds: ["a"], action: "approve" }, user: ADMIN }, res);
    expect(carUpdateMany.mock.calls[0][1]).toEqual({ $set: { status: "available" } });
    expect(res.body.message).toBe("1 listing(s) approved and published");
  });
  test("a sold listing in the batch is never hidden/approved (skipped and reported)", async () => {
    carList = [live("a"), live("s", { status: "sold", sold: true })];
    const res = mkRes();
    await bulkModerateCars({ body: { carIds: ["a", "s"], action: "hide" }, user: ADMIN }, res);
    expect(carUpdateMany.mock.calls[0][0]).toEqual({ _id: { $in: ["a"] } });
    expect(res.body.skipped).toEqual([{ id: "s", reason: "LISTING_MODERATION_BLOCKED" }]);
  });
  test("unknown action ⇒ 400 INVALID_MODERATION_ACTION and nothing written", async () => {
    carList = [live("a")];
    const res = mkRes();
    await bulkModerateCars({ body: { carIds: ["a"], action: "delete" }, user: ADMIN }, res);
    expect([res.code, res.body.code]).toEqual([400, "INVALID_MODERATION_ACTION"]);
    expect(carUpdateMany).not.toHaveBeenCalled();
  });
});

describe("E3 duplicate removal: valid status, correct order, sold protected", () => {
  const run = async (car, action = "removed") => {
    carList = car ? [car] : [];
    dupLog = { id: "log1", car: car?.id ?? "none", originalCar: "orig", markAsReviewed };
    const res = mkRes();
    await confirmAsDuplicate({ params: { id: "log1" }, body: { action, reviewNotes: "n" }, user: ADMIN }, res);
    return res;
  };
  test("removed ⇒ status 'hidden' + soft-deleted + duplicateStatus; log marked reviewed AFTER the listing was saved", async () => {
    const order = [];
    const car = { ...live("a", { status: "available" }), save: jest.fn(async () => { order.push("car.save"); }) };
    markAsReviewed.mockImplementationOnce(async () => { order.push("log.review"); });
    const res = await run(car);
    expect(res.code).toBe(200);
    expect([car.status, car.duplicateStatus, car.deletedBy]).toEqual(["hidden", "confirmed_duplicate", "adm-1"]);
    expect(car.deletedAt).toBeInstanceOf(Date);
    expect(order).toEqual(["car.save", "log.review"]);
  });
  test("if saving the listing fails, the log is NOT marked reviewed (no reviewed log over a still-public duplicate)", async () => {
    const car = { ...live("a", { status: "available" }), save: jest.fn(async () => { throw new Error("db down"); }) };
    const res = await run(car);
    expect(res.code).toBe(500);
    expect(markAsReviewed).not.toHaveBeenCalled();
  });
  test("merged keeps the listing's status and records the original", async () => {
    const car = { ...live("a", { status: "available" }), save: jest.fn(async () => {}) };
    await run(car, "merged");
    expect([car.status, car.originalListing]).toEqual(["available", "orig"]);
  });
  test("sold + removed ⇒ 409, nothing changed, log untouched", async () => {
    const car = { ...live("s", { status: "sold", sold: true }), save: jest.fn(async () => {}) };
    const res = await run(car);
    expect([res.code, res.body.code]).toEqual([409, "LISTING_MODERATION_BLOCKED"]);
    expect(car.save).not.toHaveBeenCalled(); expect(markAsReviewed).not.toHaveBeenCalled();
  });
});
