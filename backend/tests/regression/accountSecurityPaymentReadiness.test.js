// Phase 14.9 unit regression: account deletion guard (fail-closed), password step-up, log redaction,
// route mount order. Persistence is mocked; the real-DB behaviour is covered by the local DB E2E harness.
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

const authFind = jest.fn();
jest.unstable_mockModule("../../models/UserAuth.js", () => ({ default: { findOne: (...a) => authFind(...a) } }));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({}) }));

const { inspectAccountDeletion, accountDeletionBlockedBody, ACCOUNT_DELETE_DEPENDENCIES, ACCOUNT_DELETE_BLOCK_CODE } = await import("../../utils/accountDeletionGuard.js");
const { checkPasswordStepUp, needsPhoneStepUp } = await import("../../utils/stepUp.js");
const { maskLogValue } = await import("../../infrastructure/logging/index.js");

const fakeSb = (counts = {}, failTable = null) => ({
  from: (table) => ({
    select: () => ({
      or: async () => (table === failTable ? { count: null, error: { message: "boom" } } : { count: counts[table] || 0, error: null }),
    }),
  }),
});

describe("account deletion guard", () => {
  test("no dependencies -> no reasons", async () => {
    expect(await inspectAccountDeletion("u1", { sb: fakeSb() })).toEqual([]);
  });
  test("groups counts by category without row data", async () => {
    const r = await inspectAccountDeletion("u1", { sb: fakeSb({ payments: 2, escrows: 1, cars: 3, dealers: 1 }) });
    const byCode = Object.fromEntries(r.map((x) => [x.code, x.count]));
    expect(byCode.DEALER_ORGANIZATION).toBe(1);
    expect(byCode.LISTINGS).toBe(3);
    expect(byCode.FINANCIAL_RECORDS).toBeGreaterThanOrEqual(1);
    r.forEach((x) => expect(Object.keys(x).sort()).toEqual(["code", "count", "message"]));
  });
  test("fails closed when a check cannot run", async () => {
    await expect(inspectAccountDeletion("u1", { sb: fakeSb({}, "bids") })).rejects.toMatchObject({ code: "ACCOUNT_DELETE_CHECK_FAILED" });
  });
  test("blocked body is actionable", () => {
    const b = accountDeletionBlockedBody([{ code: "LISTINGS", count: 1 }]);
    expect(b).toMatchObject({ success: false, code: ACCOUNT_DELETE_BLOCK_CODE });
    expect(b.message).toMatch(/deactivate/i);
  });
  test("list covers dealers, bids, escrows and payments", () => {
    const tables = ACCOUNT_DELETE_DEPENDENCIES.map((d) => d[1]);
    ["dealers", "bids", "escrows", "payments", "cars", "dealer_teams"].forEach((t) => expect(tables).toContain(t));
  });
});

describe("password step-up", () => {
  beforeEach(() => authFind.mockReset());
  test("only payout-capable roles need it", () => {
    expect(needsPhoneStepUp("dealer")).toBe(true);
    expect(needsPhoneStepUp("individual_seller")).toBe(true);
    expect(needsPhoneStepUp("user")).toBe(false);
  });
  test("missing password -> STEP_UP_REQUIRED and no lookup", async () => {
    expect((await checkPasswordStepUp("u1", "")).code).toBe("STEP_UP_REQUIRED");
    expect((await checkPasswordStepUp("u1", { $ne: 1 })).code).toBe("STEP_UP_REQUIRED");
    expect(authFind).not.toHaveBeenCalled();
  });
  test("wrong password -> STEP_UP_FAILED; correct -> null", async () => {
    authFind.mockReturnValue({ select: async () => ({ matchPassword: async (p) => p === "right" }) });
    expect((await checkPasswordStepUp("u1", "bad")).code).toBe("STEP_UP_FAILED");
    expect(await checkPasswordStepUp("u1", "right")).toBeNull();
  });
  test("missing credentials record fails", async () => {
    authFind.mockReturnValue({ select: async () => null });
    expect((await checkPasswordStepUp("u1", "x")).code).toBe("STEP_UP_FAILED");
  });
});

describe("log redaction", () => {
  test("phones keep only the last 3 digits, secrets are fully redacted", () => {
    expect(maskLogValue("254712345678", ["phone"])).toBe("*********678");
    expect(maskLogValue("hunter2", ["password"])).toBe("[REDACTED]");
    expect(maskLogValue("tok", ["passkey"])).toBe("[REDACTED]");
  });
});

describe("route wiring", () => {
  test("auction setup routes are mounted before the dealer catch-all", () => {
    const s = fs.readFileSync(path.join(root, "server.js"), "utf8");
    expect(s.indexOf('app.use("/api/dealer", auctionSetupRoutes)')).toBeGreaterThan(-1);
    expect(s.indexOf('app.use("/api/dealer", auctionSetupRoutes)')).toBeLessThan(s.indexOf('app.use("/api/dealer", dealerRoutes)'));
  });
  test("dealer earnings never select all payment columns", () => {
    const s = fs.readFileSync(path.join(root, "routes/dealerRoutes.js"), "utf8");
    expect(s).toMatch(/DEALER_PAYMENT_COLUMNS/);
  });
  test("protect rejects soft-deleted users", () => {
    const s = fs.readFileSync(path.join(root, "middleware/auth.js"), "utf8");
    expect(s).toMatch(/deletedAt/);
    expect(s).toMatch(/AUTH_SESSION_EXPIRED/);
  });
});
