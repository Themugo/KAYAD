import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const migrationPath = fileURLToPath(new URL("../../../supabase/migrations/20261110140000_private_seller_free_access_defaults.sql", import.meta.url));
const sql = readFileSync(migrationPath, "utf8");

describe("private seller free-access migration contract", () => {
  test("preflights the capability table and identity RPC instead of creating a partial substitute", () => {
    expect(sql).toContain("Preflight failed: apply/reconcile 20261025100000_private_seller_capability.sql");
    expect(sql).toContain("Preflight failed: expected kayad_register_identity_atomic signature is missing");
  });

  test("activates legacy pending individual sellers without changing other roles", () => {
    expect(sql).toMatch(/UPDATE public\.users[\s\S]*?WHERE role = 'individual_seller'[\s\S]*?AND status = 'pending'/);
    expect(sql).toContain("SET status = 'approved'");
  });

  test("new individual sellers are approved by default and pending only when approval mode is enabled", () => {
    expect(sql).toContain("privateSellerApprovalMode') = 'required'");
    expect(sql).toContain("CASE WHEN v_seller_approval_required THEN 'pending' ELSE 'approved' END");
    expect(sql).toContain("INSERT INTO public.private_seller_capabilities");
  });

  test("dealer registration remains pending and email verification remains separate", () => {
    expect(sql).toContain("WHEN p_role = 'dealer' THEN 'pending'");
    expect(sql).toContain("email_verified");
    expect(sql).toContain("false");
  });
});
