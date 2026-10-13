// Detects production schema drift that silently disables email delivery.
// Root cause of the "no registration email" incident: the hosted
// communication_deliveries table lacked `idempotency_key`, so every deliver()
// failed before reaching Brevo and the error was swallowed by callers.
import { getSupabase } from "../utils/supabase.js";

const REQUIRED_COLUMNS = ["idempotency_key", "retry_count", "next_retry_at", "provider_event_id", "source_event_id"];
const TTL_MS = 60_000;
let cache = null;

export const checkCommunicationReadiness = async ({ force = false } = {}) => {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = { status: "ready", missingColumns: [] };
  try {
    const sb = getSupabase();
    for (const col of REQUIRED_COLUMNS) {
      const { error } = await sb.from("communication_deliveries").select(col).limit(0);
      if (error) value.missingColumns.push(col);
    }
    if (value.missingColumns.length) value.status = "schema_mismatch";
  } catch {
    value.status = "unknown";
  }
  cache = { at: Date.now(), value };
  return value;
};
