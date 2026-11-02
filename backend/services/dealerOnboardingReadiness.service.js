// Read-only check that the database can onboard a dealer end to end. Every probe either only reads, or calls a function with an
// argument it rejects BEFORE it touches any table, so running this never changes data.
//
//   register RPC     -> called with an invalid role: a database that has the function raises 22023 "Invalid self-registration role"
//                       before inserting; a database without it answers PGRST202 / 42883.
//   approval RPC     -> called with an invalid action: raises "Invalid verification action" before any lookup or write.
//   dealers columns  -> a one-row select of the onboarding columns: 42703 / PGRST204 means a column is missing.
export const REQUIRED_MIGRATION = "APPLY_dealer_onboarding_minimum.sql"; // runbooks/dealer-onboarding-hosted-patch-20261102/

const MISSING = new Set(["PGRST202", "42883", "42703", "PGRST204", "42P01", "PGRST205"]);
const isMissing = (err) => !!err && (MISSING.has(String(err.code)) || /could not find the function|does not exist|schema cache/i.test(String(err.message || "")));

async function defaultDeps() {
  const { getSupabase } = await import("../utils/supabase.js");
  const sb = getSupabase();
  return {
    rpc: (name, args) => sb.rpc(name, args),
    selectDealerColumns: () => sb.from("dealers").select("bio,payment_details,onboarding_complete,onboarding_completed_at").limit(1),
    selectVerifications: () => sb.from("dealer_verifications").select("id,documents,submitted_at,verification_status").limit(1),
  };
}

export async function checkDealerOnboardingReadiness(deps) {
  let d;
  try { d = deps || (await defaultDeps()); } catch (e) {
    return { ready: false, unknown: true, checks: [], migration: REQUIRED_MIGRATION, message: "The database could not be reached, so readiness is unknown." };
  }
  const run = async (id, label, fn, ok) => {
    try {
      const r = await fn();
      const err = r?.error ?? null;
      if (ok(err)) return { id, label, ok: true };
      if (isMissing(err)) return { id, label, ok: false, reason: "missing" };
      return { id, label, ok: null, reason: "unknown", detail: String(err?.message || "unexpected response").slice(0, 160) };
    } catch (e) {
      return { id, label, ok: null, reason: "unknown", detail: String(e?.message || e).slice(0, 160) };
    }
  };
  const checks = await Promise.all([
    run("register_function", "Dealer registration function", () => d.rpc("kayad_register_identity_atomic", { p_name: "readiness", p_email: "readiness@invalid.local", p_role: "__readiness_probe__", p_phone: "", p_business_name: null, p_location: null, p_referred_by: null, p_password_hash: "x", p_email_verify_token: "x", p_email_verify_expire: new Date().toISOString() }),
      (err) => String(err?.code) === "22023"),
    run("dealer_columns", "Dealer onboarding columns", () => d.selectDealerColumns(), (err) => !err),
    run("approval_function", "Dealer approval function", () => d.rpc("kayad_apply_dealer_verification_atomic", { p_user: "00000000-0000-0000-0000-000000000000", p_action: "__readiness_probe__", p_admin: "00000000-0000-0000-0000-000000000000", p_reason: "readiness" }),
      (err) => /Invalid verification action/i.test(String(err?.message || ""))),
    run("verification_table", "Dealer application records", () => d.selectVerifications(), (err) => !err),
  ]);
  const missing = checks.filter((c) => c.ok === false);
  const unknown = checks.filter((c) => c.ok === null);
  return {
    ready: missing.length === 0 && unknown.length === 0,
    checks,
    migration: REQUIRED_MIGRATION,
    message: missing.length
      ? `The database is missing: ${missing.map((c) => c.label.toLowerCase()).join(", ")}. Apply ${REQUIRED_MIGRATION} before onboarding dealers.`
      : unknown.length ? "Some checks could not be completed; dealer onboarding may still work." : "Dealer onboarding is ready.",
  };
}
