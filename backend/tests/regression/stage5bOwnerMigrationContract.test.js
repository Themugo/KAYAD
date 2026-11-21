// STAGE 5B — static contract over the migration CANDIDATE, bootstrap CLI and shipped sources: no secrets, not auto-applied, locked-down grants. EVIDENCE TIER: static (behaviour is proven by the disposable-PG suite).
import { describe, test, expect } from "@jest/globals";
import fs from "fs"; import path from "path";
const root = path.resolve(process.cwd(), "..");
const rd = (p) => fs.readFileSync(path.join(root, p), "utf8");
const CAND = "runbooks/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql";

describe("migration candidate", () => {
  const sql = rd(CAND);
  test("is NOT inside supabase/migrations (cannot be applied by an accidental db push)", () => {
    const dir = path.join(root, "supabase/migrations");
    const names = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    expect(names.filter((n) => /owner_governance|stage5b/i.test(n))).toEqual([]);
  });
  test("creates the four tables with RLS and append-only audit triggers", () => {
    for (const t of ["owner_memberships", "owner_invitations", "owner_membership_events", "owner_bootstrap_state"]) {
      expect(sql).toMatch(new RegExp(`create table if not exists public\\.${t}`, "i"));
      expect(sql).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`, "i"));
    }
    expect(sql).toMatch(/before (update|delete)/i);
  });
  test("revokes everything from PUBLIC/anon/authenticated and grants no write privilege on tables", () => {
    expect(sql).toMatch(/revoke all on (table )?public\.owner_memberships[^;]*from public, anon, authenticated, service_role/i);
    expect(sql).not.toMatch(/grant\s+(insert|update|delete|all)[^;]*on[^;]*owner_(memberships|invitations|membership_events|bootstrap_state)/i);
    expect(sql).not.toMatch(/to\s+(anon|authenticated|public)\s*;/i);
  });
  test("every SECURITY DEFINER function pins search_path", () => {
    const defs = sql.split(/create or replace function/i).slice(1).filter((b) => /security definer/i.test(b));
    expect(defs.length).toBeGreaterThan(5);
    for (const b of defs) expect(b).toMatch(/set search_path/i);
  });
  test("contains no credential-looking material", () => {
    expect(sql).not.toMatch(/password\s*(=|:=)\s*'[^']+'/i);
    expect(sql).not.toMatch(/\$2[aby]\$\d\d\$/);
    expect(sql).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(sql).not.toMatch(/(xkeysib|sk_live|api[_-]?key)\s*[:=]\s*['"][^'"]{8,}/i);
  });
  test("stores only token hashes for invitations", () => {
    expect(sql).toMatch(/token_hash/i);
    expect(sql).not.toMatch(/\btoken\s+text/i);
  });
});

describe("shipped sources", () => {
  const files = ["backend/config/owners.js", "backend/services/ownerRegistry.service.js", "backend/services/ownerGovernance.service.js", "backend/routes/ownerRoutes.js", "backend/scripts/owner-bootstrap.mjs"];
  test("no default password, token or credential literal in the owner code", () => {
    for (const f of files) {
      const s = rd(f);
      expect(s).not.toMatch(/password\s*[:=]\s*["'`][^"'`$]{4,}["'`]/i);
      expect(s).not.toMatch(/(secret|token)\s*[:=]\s*["'][A-Za-z0-9+/_-]{24,}["']/i);
    }
  });
  test("the owner list is never logged and invitation tokens never reach logs", () => {
    const s = rd("backend/services/ownerGovernance.service.js");
    expect(s).not.toMatch(/log(Info|Warn|Error)\([^)]*(rawToken|token\b)/);
  });
  test("bootstrap CLI is operator-only: requires explicit flags and has no HTTP surface", () => {
    const s = rd("backend/scripts/owner-bootstrap.mjs");
    expect(s).toMatch(/--operator/); expect(s).toMatch(/--confirm-host/);
    expect(rd("backend/server.js")).not.toMatch(/owner-bootstrap/);
    expect(rd("backend/routes/ownerRoutes.js")).not.toMatch(/bootstrap(Apply|Report)|emergencyRecovery/);
  });
  test("Stage 5A unverified-owner guard still present in login/refresh and middleware", () => {
    expect(rd("backend/config/owners.js")).toMatch(/isUnverifiedOwner/);
    expect(rd("backend/middleware/auth.js")).toMatch(/isUnverifiedOwner/);
    expect(rd("backend/controllers/authController.js")).toMatch(/isUnverifiedOwner/);
  });
  test("ordinary admin route modules cannot reach owner governance", () => {
    for (const f of ["backend/routes/adminRoutes.js"]) if (fs.existsSync(path.join(root, f))) expect(rd(f)).not.toMatch(/ownerGovernance|owner_memberships/);
  });
  test("legacy seed provisioning of pre-verified owners is refused in production without a named override", () => {
    const s = rd("backend/seed.js");
    expect(s).toMatch(/NODE_ENV === "production" && process\.env\.SEED_ALLOW_UNVERIFIED_OWNER_PROVISIONING !== "I_ACCEPT_NO_MAILBOX_PROOF"/);
    expect(s.indexOf("Refusing to provision owner accounts")).toBeLessThan(s.indexOf("email_verified: true"));
  });
});
