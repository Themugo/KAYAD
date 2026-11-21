// Readiness probe: tells an administrator whether the database can onboard a dealer, without ever writing.
import { describe, test, expect, jest } from "@jest/globals";
import fs from "fs";
import { checkDealerOnboardingReadiness, REQUIRED_MIGRATION } from "../../services/dealerOnboardingReadiness.service.js";

const healthy = () => ({
  rpc: jest.fn(async (name) => name === "kayad_register_identity_atomic"
    ? { data: null, error: { code: "22023", message: "Invalid self-registration role" } }
    : { data: null, error: { code: "P0001", message: "Invalid verification action" } }),
  selectDealerColumns: jest.fn(async () => ({ data: [], error: null })),
  selectVerifications: jest.fn(async () => ({ data: [], error: null })),
  selectAdmins: jest.fn(async () => ({ data: [{ id: "a1" }], error: null })),
});
// What the hosted database answers today: no registration function, no onboarding columns.
const hostedLike = () => ({
  ...healthy(),
  rpc: jest.fn(async (name) => name === "kayad_register_identity_atomic"
    ? { data: null, error: { code: "PGRST202", message: "Could not find the function public.kayad_register_identity_atomic" } }
    : { data: null, error: { code: "P0001", message: "Invalid verification action" } }),
  selectDealerColumns: jest.fn(async () => ({ data: null, error: { code: "42703", message: "column dealers.bio does not exist" } })),
});

describe("dealer onboarding readiness", () => {
  test("ready when every object exists", async () => {
    const r = await checkDealerOnboardingReadiness(healthy());
    expect(r.ready).toBe(true);
    expect(r.checks.every((c) => c.ok === true)).toBe(true);
  });
  test("hosted-like database: reports exactly what is missing and names the migration", async () => {
    const r = await checkDealerOnboardingReadiness(hostedLike());
    expect(r.ready).toBe(false);
    expect(r.checks.filter((c) => c.ok === false).map((c) => c.id).sort()).toEqual(["dealer_columns", "register_function"]);
    expect(r.checks.find((c) => c.id === "approval_function").ok).toBe(true);
    expect(r.message).toContain(REQUIRED_MIGRATION);
  });
  test("no active administrator row in the database is reported (approvals would all be refused)", async () => {
    const d = healthy();
    d.selectAdmins = jest.fn(async () => ({ data: [], error: null }));
    const r = await checkDealerOnboardingReadiness(d);
    expect(r.ready).toBe(false);
    expect(r.checks.find((c) => c.id === "admin_account").ok).toBe(false);
    expect(r.message).toMatch(/administrator account/);
    expect(r.message).not.toContain(REQUIRED_MIGRATION); // the SQL patch is not the fix for this one
  });
  test("an administrator-lookup error is 'unknown', not 'missing'", async () => {
    const d = healthy();
    d.selectAdmins = jest.fn(async () => ({ data: null, error: { code: "XX000", message: "boom" } }));
    const r = await checkDealerOnboardingReadiness(d);
    expect(r.checks.find((c) => c.id === "admin_account").ok).toBeNull();
  });
  test("an unexpected error is 'unknown', never reported as missing or as ready", async () => {
    const d = healthy();
    d.selectVerifications = jest.fn(async () => { throw new Error("socket hang up"); });
    const r = await checkDealerOnboardingReadiness(d);
    expect(r.ready).toBe(false);
    expect(r.checks.find((c) => c.id === "verification_table").ok).toBeNull();
    expect(r.checks.some((c) => c.ok === false)).toBe(false);
  });
  test("probes cannot write: the RPCs are only ever called with arguments the database rejects first", async () => {
    const d = healthy();
    await checkDealerOnboardingReadiness(d);
    for (const [, args] of d.rpc.mock.calls) expect(Object.values(args).some((v) => String(v) === "__readiness_probe__")).toBe(true);
  });
  test("the route is registered behind the global admin guard", () => {
    const src = fs.readFileSync(new URL("../../routes/adminRoutes.js", import.meta.url), "utf8");
    expect(src.indexOf('"/dealer-onboarding/readiness"')).toBeGreaterThan(src.indexOf("router.use(protect, adminOnly)"));
    expect(src).toMatch(/"\/dealer-onboarding\/readiness",\s*adminOrSuper/);
  });
  test("the migration is idempotent and restates only the required objects", () => {
    const sql = fs.readFileSync(new URL(`../../../runbooks/dealer-onboarding-hosted-patch-20261102/${REQUIRED_MIGRATION}`, import.meta.url), "utf8");
    for (const needle of ["ADD COLUMN IF NOT EXISTS bio", "onboarding_completed_at", "CREATE OR REPLACE FUNCTION public.kayad_register_identity_atomic", "ON CONFLICT (\"user\") DO NOTHING", "TO service_role", "'suspended'"]) expect(sql).toContain(needle);
    expect(sql).not.toMatch(/\bDROP (TABLE|COLUMN)\b|\bDELETE FROM\b|\bTRUNCATE\b/i);
  });
});
