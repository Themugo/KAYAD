// ============================================================
// STAGE 4 (2026-10-18) — Workstream B: audit write AFTER a committed mutation.
//
//   S4-B-01  admin/announcement/bulk routes awaited AuditLog.create() bare. The
//            domain write is a separate call (no shared transaction), so an
//            audit outage returned 500 for an operation that HAD been applied.
//   Contract now: the audit write is attempted; failure is logged with the
//   stable code AUDIT_WRITE_FAILED_AFTER_COMMIT (never silent); the committed
//   operation reports its real outcome. Governance keeps its documented strict
//   contract (Stage 3A test) and the audit-log endpoint keeps raw create().
// ============================================================
import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, "../..");

const logged = [];
let auditBehaviour = "ok";
const created = [];
jest.unstable_mockModule("../../models/AuditLog.js", () => ({
  default: {
    create: jest.fn(async (e) => {
      if (auditBehaviour === "fail") throw new Error("connection failure");
      created.push(e);
      return { id: "a1", ...e };
    }),
  },
}));
jest.unstable_mockModule("../../utils/logger.js", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn((msg, meta) => logged.push({ msg, meta })),
}));

const { auditAfterCommit, AUDIT_WRITE_FAILED_AFTER_COMMIT } = await import("../../utils/auditAfterCommit.js");

beforeEach(() => { logged.length = 0; created.length = 0; auditBehaviour = "ok"; });

describe("S4-B-01 auditAfterCommit helper", () => {
  test("success: writes the entry and returns the row", async () => {
    const row = await auditAfterCommit({ action: "x", actor: "u1" });
    expect(row).toMatchObject({ id: "a1", action: "x" });
    expect(created).toHaveLength(1);
    expect(logged).toHaveLength(0);
  });
  test("failure: never throws, returns null, logs the stable code with identifiers", async () => {
    auditBehaviour = "fail";
    await expect(auditAfterCommit({ action: "User deleted", actor: "u1", target: "t1", targetModel: "User" })).resolves.toBeNull();
    expect(logged).toHaveLength(1);
    expect(logged[0].msg).toBe(AUDIT_WRITE_FAILED_AFTER_COMMIT);
    expect(logged[0].meta).toMatchObject({ code: AUDIT_WRITE_FAILED_AFTER_COMMIT, action: "User deleted", actor: "u1", target: "t1", targetModel: "User", error: "connection failure" });
  });
  test("a broken logger cannot turn a committed operation into a failure", async () => {
    auditBehaviour = "fail";
    const { logError } = await import("../../utils/logger.js");
    logError.mockImplementationOnce(() => { throw new Error("logger down"); });
    await expect(auditAfterCommit({ action: "x" })).resolves.toBeNull();
  });
});

describe("S4-B-01 call-site contract (static guard against regression)", () => {
  const read = (p) => fs.readFileSync(path.join(backendRoot, p), "utf8");
  test.each(["routes/adminRoutes.js", "controllers/announcementController.js", "controllers/bulkAdminController.js"])(
    "%s: post-commit audit writes use auditAfterCommit (only the audit-log endpoint keeps raw create)",
    (p) => {
      const src = read(p);
      const raw = [...src.matchAll(/await AuditLog\.create\(/g)].length;
      expect(src).toContain('from "../utils/auditAfterCommit.js"');
      if (p === "routes/adminRoutes.js") {
        // exactly one raw create remains: POST /audit-logs, whose purpose IS the audit row
        expect(raw).toBe(1);
        expect(src).toMatch(/const entry = await AuditLog\.create\(/);
      } else {
        expect(raw).toBe(0);
      }
    },
  );
  test("governance keeps its documented strict contract", () => {
    const src = read("controllers/governanceController.js");
    expect(src).toMatch(/await AuditLog\.create\(/);
    expect(src).not.toContain("auditAfterCommit");
  });
});

describe("S4-B-01 bulk moderation reports its real outcome through the real controller", () => {
  test("audit outage after the status change → 200, not 500", async () => {
    const car = { _id: "c1", id: "c1", title: "Car", status: "pending", dealer: null, save: jest.fn(async () => {}) };
    const find = jest.fn(() => ({ populate: async () => [car] }));
    jest.unstable_mockModule("../../models/Car.js", () => ({ default: { find, updateMany: jest.fn(async () => ({})) } }));
    jest.unstable_mockModule("../../models/User.js", () => ({ default: {} }));
    jest.unstable_mockModule("../../services/notification.service.js", () => ({ sendNotification: jest.fn(async () => {}) }));
    const { bulkModerateCars } = await import("../../controllers/bulkAdminController.js");
    auditBehaviour = "fail";
    const res = { code: 200, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    await bulkModerateCars({ body: { carIds: ["c1"], action: "approve" }, user: { id: "adm", role: "admin", name: "A" } }, res);
    expect(res.code).toBe(200);
    expect(res.body.success).toBe(true);
    expect(logged.some((l) => l.msg === AUDIT_WRITE_FAILED_AFTER_COMMIT)).toBe(true);
  });
});
