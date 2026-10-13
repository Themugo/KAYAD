// Mock-based regression tests (NOT live-provider evidence).
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

let missing = new Set();
const fromMock = jest.fn((table) => ({
  select: (col) => ({ limit: async () => ({ error: table === "communication_deliveries" && missing.has(col) ? { message: `column ${col} does not exist` } : null }) }),
}));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: fromMock }) }));

const { checkCommunicationReadiness } = await import("../../services/communicationReadiness.service.js");

describe("communication schema readiness (root cause of missing registration email)", () => {
  beforeEach(() => { missing = new Set(); });

  test("reports ready when ledger columns exist", async () => {
    const r = await checkCommunicationReadiness({ force: true });
    expect(r).toEqual({ status: "ready", missingColumns: [] });
  });

  test("reports schema_mismatch when idempotency_key is absent (production state 2026-10-13)", async () => {
    missing = new Set(["idempotency_key"]);
    const r = await checkCommunicationReadiness({ force: true });
    expect(r.status).toBe("schema_mismatch");
    expect(r.missingColumns).toContain("idempotency_key");
  });

  test("never throws or leaks error text when the database is unreachable", async () => {
    fromMock.mockImplementationOnce(() => { throw new Error("secret connection string"); });
    const r = await checkCommunicationReadiness({ force: true });
    expect(r.status).toBe("unknown");
    expect(JSON.stringify(r)).not.toContain("secret");
  });
});

describe("migration files that fix production exist and are idempotent", () => {
  test("idempotency migration adds column and unique index with IF NOT EXISTS", async () => {
    const fs = await import("node:fs");
    const sql = fs.readFileSync(new URL("../../../supabase/migrations/20260930111500_advanced_communication_idempotency.sql", import.meta.url), "utf8");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS idempotency_key/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_delivery_idempotency/);
    const sm = fs.readFileSync(new URL("../../../supabase/migrations/20260930113000_communication_state_machine_hardening.sql", import.meta.url), "utf8");
    expect(sm).toMatch(/dead_letter/);
  });
});
