// Mock-based regression tests (NOT live-provider evidence).
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import fs from "node:fs";

let missing = new Set();
let ledgerRows = []; // rows visible to probe queries: {status}
const fromMock = jest.fn((table) => ({
  select: (col) => {
    const q = { _statuses: null, _filters: {} };
    q.limit = async () => {
      if (col !== "id") return { error: table === "communication_deliveries" && missing.has(col) ? { message: `column ${col} does not exist` } : null };
      const data = ledgerRows.filter((r) => !q._statuses || q._statuses.includes(r.status)).slice(0, 1);
      return { data, error: null };
    };
    q.eq = () => q;
    q.in = (_c, v) => { q._statuses = v; return q; };
    return q;
  },
}));
jest.unstable_mockModule("../../utils/supabase.js", () => ({ getSupabase: () => ({ from: fromMock }) }));

const { checkCommunicationReadiness, providerConfigState } = await import("../../services/communicationReadiness.service.js");

beforeEach(() => { missing = new Set(); ledgerRows = []; });

describe("communication readiness layers are independent (root cause: missing idempotency_key)", () => {
  test("schema_ready alone does not imply provider acceptance or mailbox delivery", async () => {
    const r = await checkCommunicationReadiness({ force: true });
    expect(r.schema).toBe("schema_ready");
    expect(r.providerAcceptance).toBe("none_observed");
    expect(r.mailboxDelivery).toBe("none_observed");
  });

  test("schema_mismatch when idempotency_key is absent (production state 2026-10-13) and probes are skipped", async () => {
    missing = new Set(["idempotency_key"]);
    ledgerRows = [{ status: "delivered" }];
    const r = await checkCommunicationReadiness({ force: true });
    expect(r.schema).toBe("schema_mismatch");
    expect(r.missingColumns).toContain("idempotency_key");
    expect(r.providerAcceptance).toBe("unknown");
    expect(r.mailboxDelivery).toBe("unknown");
  });

  test("a 'sent' row proves provider acceptance only, not mailbox delivery", async () => {
    ledgerRows = [{ status: "sent" }];
    const r = await checkCommunicationReadiness({ force: true });
    expect(r.providerAcceptance).toBe("observed");
    expect(r.mailboxDelivery).toBe("none_observed");
  });

  test("only a webhook-recorded delivered/read row reports mailbox delivery", async () => {
    ledgerRows = [{ status: "delivered" }];
    const r = await checkCommunicationReadiness({ force: true });
    expect(r.providerAcceptance).toBe("observed");
    expect(r.mailboxDelivery).toBe("observed");
  });

  test("env vars present are reported as env_present, never as ready/delivered", () => {
    expect(providerConfigState({ BREVO_API_KEY: "k", BREVO_FROM_EMAIL: "a@b.c" })).toBe("env_present");
    expect(providerConfigState({ BREVO_API_KEY: "k" })).toBe("not_configured");
    expect(providerConfigState({})).toBe("not_configured");
  });

  test("never throws or leaks error text when the database is unreachable", async () => {
    fromMock.mockImplementationOnce(() => { throw new Error("secret connection string"); });
    const r = await checkCommunicationReadiness({ force: true });
    expect(r.schema).toBe("unknown");
    expect(JSON.stringify(r)).not.toContain("secret");
  });
});

describe("production SQL runbook stays identical to the repo migrations", () => {
  const norm = (s) => s.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim().toLowerCase().split(";").map((x) => x.trim()).filter(Boolean);
  const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
  test("STEP 2 contains exactly the migration statements (plus transaction wrapper and guard)", () => {
    const src = [...norm(read("../../../supabase/migrations/20260930111500_advanced_communication_idempotency.sql")), ...norm(read("../../../supabase/migrations/20260930113000_communication_state_machine_hardening.sql"))];
    const step2 = norm(read("../../../runbooks/COMMS_STEP2_APPLY_NEEDS_AUTHORIZATION.sql"));
    const ddl = step2.filter((s) => /^(alter table|create (unique )?index)/.test(s));
    expect(ddl).toEqual(src);
    expect(step2[0]).toBe("begin");
    expect(step2.at(-1)).toBe("commit");
  });
  test("STEP 1 and STEP 3 contain no write statements", () => {
    for (const f of ["COMMS_STEP1_PREFLIGHT_READONLY.sql", "COMMS_STEP3_POSTVERIFY_READONLY.sql"]) {
      const sql = read(`../../../runbooks/${f}`).replace(/--[^\n]*/g, "").replace(/'(?:[^']|'')*'/g, "''").toLowerCase();
      expect(sql).not.toMatch(/\b(insert|update|delete|alter|drop|create|truncate|grant|revoke)\b\s/);
    }
  });
});
