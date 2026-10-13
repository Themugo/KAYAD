// Communication readiness, reported as SEPARATE layers so "ready" never implies delivery:
//   1. schema            - ledger table has the columns the code writes (root cause of the 2026-10 outage)
//   2. providerConfig    - env vars are PRESENT (not validated against Brevo; key may still be wrong/revoked)
//   3. providerAcceptance- the ledger holds at least one row Brevo accepted (sent/delivered/read) = observed evidence
//   4. mailboxDelivery   - at least one Brevo delivered/read webhook was recorded = observed evidence
// Only enumerated states are returned; no error text, counts, addresses or ids leave this module.
// Read-only: SELECT head/limit queries through the existing Supabase client, bounded by a timeout.
import { getSupabase } from "../utils/supabase.js";

const REQUIRED_COLUMNS = ["idempotency_key", "retry_count", "next_retry_at", "provider_event_id", "source_event_id"];
const TTL_MS = 60_000;
const TIMEOUT_MS = Number(process.env.COMMUNICATION_READINESS_TIMEOUT_MS) || 4_000;
let cache = null;

export const providerConfigState = (env = process.env) =>
  env.BREVO_API_KEY && env.BREVO_FROM_EMAIL ? "env_present" : "not_configured";

// Bound the whole check. A timeout rejects, which the caller reports as "unknown" (degraded), never ready.
const withTimeout = (promise, ms) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("readiness_timeout")), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });

// Pure of side effects on shared state: builds and returns a fresh result so a probe that
// finishes after a timeout can never flip an already-reported "unknown" to "ready".
const runChecks = async () => {
  const sb = getSupabase();
  const missingColumns = [];
  for (const col of REQUIRED_COLUMNS) {
    const { error } = await sb.from("communication_deliveries").select(col).limit(0);
    if (error) missingColumns.push(col);
  }
  if (missingColumns.length) {
    return { schema: "schema_mismatch", missingColumns, providerAcceptance: "unknown", mailboxDelivery: "unknown" };
  }
  const probe = async (statuses) => {
    const { data, error } = await sb.from("communication_deliveries").select("id").eq("channel", "email").eq("provider", "brevo").in("status", statuses).limit(1);
    if (error) return "unknown";
    return data?.length ? "observed" : "none_observed";
  };
  return {
    schema: "schema_ready",
    missingColumns: [],
    providerAcceptance: await probe(["sent", "delivered", "read"]),
    mailboxDelivery: await probe(["delivered", "read"]),
  };
};

export const checkCommunicationReadiness = async ({ force = false } = {}) => {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let outcome;
  try {
    outcome = await withTimeout(runChecks(), TIMEOUT_MS);
  } catch {
    outcome = { schema: "unknown", missingColumns: [], providerAcceptance: "unknown", mailboxDelivery: "unknown" };
  }
  const value = {
    ...outcome,
    providerConfig: providerConfigState(),
    note: "schema/providerConfig are configuration checks only; acceptance and delivery are observed ledger evidence, not a live probe",
  };
  cache = { at: Date.now(), value };
  return value;
};
