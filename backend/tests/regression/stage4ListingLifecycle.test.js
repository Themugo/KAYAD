// ============================================================
// STAGE 4 (2026-10-18) — Workstream C: listing lifecycle invariants.
//
//   S4-C-01  POST /api/admin/bulk/cars/moderate updated every id it was given:
//            sold listings could be flipped to available/hidden (the single
//            moderate route refuses them via utils/carModerationGuard.js).
//   S4-C-02  duplicate review "removed" soft-deleted + set status "rejected" on
//            sold listings, and marked the log reviewed before checking.
//   S4-C-03  POST /api/admin/bulk/cars/delete wrote status "deleted" — outside
//            cars_status_check and not the soft-delete convention — and accepted
//            sold listings.
//   S4-C-04  Model.softDelete did not exist (migration 20260710160000 says it
//            was added) so DELETE /cars/:id, admin car/user/staff delete threw.
// Real controllers and the real models/_base.js are used; only the Supabase
// client / sibling models are faked.
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
jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
jest.unstable_mockModule("../../utils/auditAfterCommit.js", () => ({ auditAfterCommit: jest.fn(async () => ({})), AUDIT_WRITE_FAILED_AFTER_COMMIT: "X" }));

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
const live = (id, extra = {}) => ({ id, _id: id, title: id, status: "pending", dealer: null, ...extra });
const sold = (id) => ({ id, _id: id, title: id, status: "sold", sold: true, dealer: null });

beforeEach(() => { carList = []; carUpdateMany.mockClear(); carSoftDelete.mockClear(); userUpdate.mockClear(); markAsReviewed.mockClear(); calls.length = 0; updateResult = { data: [{ id: "c1" }], error: null }; });

describe("S4-C-01 bulk moderation honours the sold-listing invariant", () => {
  test("mixed batch: only non-sold ids are updated; skipped ids are reported", async () => {
    carList = [live("a"), sold("s")];
    const res = mkRes();
    await bulkModerateCars({ body: { carIds: ["a", "s"], action: "approve" }, user: ADMIN }, res);
    expect(res.code).toBe(200);
    expect(carUpdateMany).toHaveBeenCalledTimes(1);
    expect(carUpdateMany.mock.calls[0][0]).toEqual({ _id: { $in: ["a"] } });
    expect(res.body.count).toBe(1);
    expect(res.body.skipped).toEqual([{ id: "s", reason: "LISTING_MODERATION_BLOCKED" }]);
  });
  test.each(["approve", "reject"])("only sold listings (%s) → 409, nothing updated", async (action) => {
    carList = [sold("s1"), sold("s2")];
    const res = mkRes();
    await bulkModerateCars({ body: { carIds: ["s1", "s2"], action }, user: ADMIN }, res);
    expect(res.code).toBe(409);
    expect(res.body.code).toBe("LISTING_MODERATION_BLOCKED");
    expect(carUpdateMany).not.toHaveBeenCalled();
  });
  test("a sold flag without status 'sold' is also protected", async () => {
    carList = [{ id: "x", _id: "x", status: "available", sold: true, dealer: null }];
    const res = mkRes();
    await bulkModerateCars({ body: { carIds: ["x"], action: "reject" }, user: ADMIN }, res);
    expect(res.code).toBe(409);
    expect(carUpdateMany).not.toHaveBeenCalled();
  });
  test("invalid action is still refused (400) and ordinary approve/reject still work", async () => {
    const bad = mkRes();
    await bulkModerateCars({ body: { carIds: ["a"], action: "delete" }, user: ADMIN }, bad);
    expect(bad.code).toBe(400);
    carList = [live("a")];
    const ok = mkRes();
    await bulkModerateCars({ body: { carIds: ["a"], action: "reject" }, user: ADMIN }, ok);
    expect(ok.code).toBe(200);
    expect(carUpdateMany.mock.calls[0][1]).toEqual({ $set: { status: "hidden" } });
  });
});

describe("S4-C-03 bulk delete uses the soft-delete convention and refuses sold listings", () => {
  test("live listings are soft-deleted with the actor; status 'deleted' is never written", async () => {
    carList = [live("a", { dealer: "d1" }), live("b")];
    const res = mkRes();
    await bulkDeleteCars({ body: { carIds: ["a", "b"] }, user: ADMIN }, res);
    expect(res.code).toBe(200);
    expect(carSoftDelete.mock.calls.map((c) => c[0])).toEqual(["a", "b"]);
    expect(carSoftDelete.mock.calls.every((c) => c[1] === "adm-1")).toBe(true);
    expect(carUpdateMany).not.toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith("d1", { listingCount: 2 });
  });
  test("sold listings are skipped and reported; all-sold → 409", async () => {
    carList = [live("a"), sold("s")];
    const mixed = mkRes();
    await bulkDeleteCars({ body: { carIds: ["a", "s"] }, user: ADMIN }, mixed);
    expect(mixed.code).toBe(200);
    expect(carSoftDelete.mock.calls.map((c) => c[0])).toEqual(["a"]);
    expect(mixed.body.skipped).toEqual([{ id: "s", reason: "LISTING_MODERATION_BLOCKED" }]);
    carSoftDelete.mockClear();
    carList = [sold("s")];
    const only = mkRes();
    await bulkDeleteCars({ body: { carIds: ["s"] }, user: ADMIN }, only);
    expect(only.code).toBe(409);
    expect(carSoftDelete).not.toHaveBeenCalled();
  });
});

describe("S4-C-02 duplicate review 'removed' cannot remove a sold listing", () => {
  const run = async (car, action) => {
    carList = car ? [car] : [];
    dupLog = { id: "log1", car: car?.id ?? "none", originalCar: "o", markAsReviewed };
    const res = mkRes();
    await confirmAsDuplicate({ params: { id: "log1" }, body: { action, reviewNotes: "n" }, user: ADMIN }, res);
    return res;
  };
  test("sold + removed → 409; log NOT marked reviewed; car untouched", async () => {
    const car = { ...sold("s"), save: jest.fn(async () => {}) };
    const res = await run(car, "removed");
    expect(res.code).toBe(409);
    expect(res.body.code).toBe("LISTING_MODERATION_BLOCKED");
    expect(markAsReviewed).not.toHaveBeenCalled();
    expect(car.save).not.toHaveBeenCalled();
    expect(car.status).toBe("sold");
  });
  test("live + removed → hidden (STAGE 5A: `rejected` is refused by cars_status_check) and soft-deleted", async () => {
    const car = { ...live("a"), save: jest.fn(async () => {}) };
    const res = await run(car, "removed");
    expect(res.code).toBe(200);
    expect(markAsReviewed).toHaveBeenCalledTimes(1);
    expect(car.status).toBe("hidden");
    expect(car.deletedBy).toBe("adm-1");
    expect(car.save).toHaveBeenCalled();
  });
  test("sold + merged is unaffected by the removal guard", async () => {
    const car = { ...sold("s"), save: jest.fn(async () => {}) };
    const res = await run(car, "merged");
    expect(res.code).toBe(200);
    expect(car.status).toBe("sold");
  });
});

describe("S4-C-04 Model.softDelete exists and writes only deleted_at / deleted_by", () => {
  test("cars and users expose softDelete", () => {
    expect(typeof createModel("Car").softDelete).toBe("function");
    expect(typeof createModel("User").softDelete).toBe("function");
  });
  test("single id: update cars set deleted_at+deleted_by where id in [..] and deleted_at is null", async () => {
    const out = await createModel("Car").softDelete("c1", "adm-1");
    expect(out).toEqual({ modifiedCount: 1 });
    const c = calls[0];
    expect(c.table).toBe("cars");
    expect(Object.keys(c.patch).sort()).toEqual(["deleted_at", "deleted_by"]);
    expect(c.patch.deleted_by).toBe("adm-1");
    expect(Number.isNaN(Date.parse(c.patch.deleted_at))).toBe(false);
    expect(c.filters).toEqual([["in", "id", ["c1"]], ["is", "deleted_at", null]]);
  });
  test("array of ids is de-duplicated; empty list performs no write", async () => {
    await createModel("Car").softDelete(["c1", "c1", "c2"], "adm-1");
    expect(calls[0].filters[0]).toEqual(["in", "id", ["c1", "c2"]]);
    calls.length = 0;
    await expect(createModel("Car").softDelete([], "adm-1")).resolves.toEqual({ modifiedCount: 0 });
    expect(calls).toHaveLength(0);
  });
  test("users are supported; other tables are refused; database errors propagate", async () => {
    await createModel("User").softDelete("u1", "adm-1");
    expect(calls[0].table).toBe("users");
    await expect(createModel("Bid").softDelete("b1", "adm-1")).rejects.toThrow(/not supported/);
    updateResult = { data: null, error: { code: "42703", message: "column does not exist" } };
    await expect(createModel("Car").softDelete("c1")).rejects.toBeTruthy();
  });
});
