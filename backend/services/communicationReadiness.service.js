// Communication readiness, reported as SEPARATE layers so "ready" never implies delivery:
//   1. schema            - ledger table has the columns the code writes (root cause of the 2026-10 outage)
//   2. providerConfig    - env vars are PRESENT (not validated against Brevo; key may still be wrong/revoked)
//   3. providerAcceptance- the ledger holds at least one row Brevo accepted (sent/delivered/read) = observed evidence
//   4. mailboxDelivery   - at least one Brevo delivered/read webhook was recorded = observed evidence
// Only enumerated states are returned; no error text, counts, addresses or ids leave this module.
import { getSupabase } from "../utils/supabase.js";

const REQUIRED_COLUMNS = ["idempotency_key", "retry_count", "next_retry_at", "provider_event_id", "source_event_id"];
const TTL_MS = 60_000;
let cache = null;

export const providerConfigState = (env = process.env) =>
  env.BREVO_API_KEY && env.BREVO_FROM_EMAIL ? "env_present" : "not_configured";

export const checkCommunicationReadiness = async ({ force = false } = {}) => {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = {
    schema: "unknown",
    missingColumns: [],
    providerConfig: providerConfigState(),
    providerAcceptance: "unknown",
    mailboxDelivery: "unknown",
    note: "schema/providerConfig are configuration checks only; acceptance and delivery are observed ledger evidence, not a live probe",
  };
  try {
    const sb = getSupabase();
    for (const col of REQUIRED_COLUMNS) {
      const { error } = await sb.from("communication_deliveries").select(col).limit(0);
      if (error) value.missingColumns.push(col);
    }
    value.schema = value.missingColumns.length ? "schema_mismatch" : "schema_ready";
    if (value.schema === "schema_ready") {
      const probe = async (statuses) => {
        const { data, error } = await sb.from("communication_deliveries").select("id").eq("channel", "email").eq("provider", "brevo").in("status", statuses).limit(1);
        if (error) return "unknown";
        return data?.length ? "observed" : "none_observed";
      };
      value.providerAcceptance = await probe(["sent", "delivered", "read"]);
      value.mailboxDelivery = await probe(["delivered", "read"]);
    }
  } catch {
    value.schema = "unknown";
  }
  cache = { at: Date.now(), value };
  return value;
};
