// Stage 4 Workstream H guard: rehearsal SQL stays read-only/labelled and outside supabase/migrations.
import { describe, test, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dir = path.join(root, "runbooks/stage4-rehearsal-20261018");
const sql = (f) => fs.readFileSync(path.join(dir, f), "utf8");

describe("Stage 4 rehearsal assets", () => {
  test("preflight is read-only: READ ONLY transaction, ROLLBACK, no write statements", () => {
    const s = sql("01_READONLY_IDENTITY_LIFECYCLE_PREFLIGHT.sql");
    expect(s).toMatch(/BEGIN TRANSACTION READ ONLY;/);
    expect(s).toMatch(/ROLLBACK;\s*$/);
    const code = s.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    expect(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i.test(code)).toBe(false);
  });
  test("G2 candidate is labelled NOT EXECUTED and requires authorization", () => {
    const s = sql("03B_G2_CANDIDATE_cars_status_rejected_LOW_LOCK_NOT_APPLIED.sql");
    expect(s).toMatch(/NOT EXECUTED — REQUIRES EXPLICIT AUTHORIZATION/);
  });
  test("no Stage 4 rehearsal SQL is under supabase/migrations", () => {
    const m = fs.readdirSync(path.join(root, "supabase/migrations"));
    expect(m.filter((f) => /stage4|03B_G2|LOW_LOCK/i.test(f))).toEqual([]);
  });
  test("runbook flags the destructive migration and forbids include-all", () => {
    const r = fs.readFileSync(path.join(dir, "STAGE4_MIGRATION_REHEARSAL_RUNBOOK.md"), "utf8");
    expect(r).toMatch(/20260930110000[^\n]*DESTRUCTIVE/);
    expect(r).toMatch(/include-all/);
  });
});

describe("Stage 4A rehearsal assets", () => {
  const d4a = path.join(root, "runbooks/stage4a-gate-closure-20261018");
  test.each(["02_READONLY_PREFLIGHT_PENDING_THREE_MIGRATIONS.sql", "03_READONLY_POSTVERIFY_PENDING_THREE_MIGRATIONS.sql"])("%s is SELECT-only inside a READ ONLY transaction", (f) => {
    const s = fs.readFileSync(path.join(d4a, f), "utf8");
    expect(s).toMatch(/BEGIN TRANSACTION READ ONLY;/);
    expect(s).toMatch(/ROLLBACK;\s*$/);
    expect(s).toMatch(/NOT EXECUTED/);
    const code = s.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    expect(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i.test(code)).toBe(false);
  });
  test("neither Stage 4A SQL file is in supabase/migrations", () => {
    expect(fs.readdirSync(path.join(root, "supabase/migrations")).filter((f) => /PENDING_THREE|stage4a/i.test(f))).toEqual([]);
  });
  test("safety pack states the correction about sessions and flags M1 irreversible, forbids include-all", () => {
    const r = fs.readFileSync(path.join(d4a, "MIGRATION_SAFETY_PACK_THREE_MIGRATIONS.md"), "utf8");
    expect(r).toMatch(/IRREVERSIBLE/);
    expect(r).toMatch(/include-all/);
    expect(r).toMatch(/live sessions survive|sessions survive/i);
  });
  test("decision register covers D3, D5/D6, D7, D8, D9, D10, ledger seed and referral", () => {
    const r = fs.readFileSync(path.join(d4a, "OWNER_DECISION_REGISTER.md"), "utf8");
    for (const h of ["## D3", "## D5 / D6", "## D7", "## D8", "## D9", "## D10", "## D16", "## D17"]) expect(r).toContain(h);
  });
});
