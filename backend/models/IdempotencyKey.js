import { createModel } from "./_base.js";
import { getSupabase } from "../utils/supabase.js";

const IdempotencyKey = createModel("IdempotencyKey");

// middleware/idempotency.js calls these two statics. They were never defined (only unit tests mocked them), so the
// real middleware threw TypeError on every request and every critical operation (M-Pesa callbacks, escrow, bids,
// payments) failed closed with 503 (D-FIN-2). Backed by the existing idempotency_keys table (unique "key").

/** Returns the recorded response for `key` when the original attempt completed successfully, else null.
 *  Failed attempts are deliberately NOT replayed so a provider/user retry can run the operation again. */
IdempotencyKey.getCachedResponse = async function getCachedResponse(key) {
  if (!key) return null;
  const { data, error } = await getSupabase()
    .from("idempotency_keys")
    .select("response_status,response_data,success")
    .eq("key", String(key))
    .maybeSingle();
  if (error) throw error;
  if (!data || data.success === false) return null;
  return { responseStatus: data.response_status, responseData: data.response_data, success: data.success };
};

/** Persists the outcome for `key`. First successful writer wins; a later success may replace an earlier failure. */
IdempotencyKey.record = async function record({ key, operationType, user, requestParams, responseData, responseStatus, success, errorMessage, resourceIds }) {
  if (!key) return;
  const row = {
    key: String(key),
    operation_type: operationType ?? null,
    user: user || null,
    request_params: requestParams ?? null,
    response_data: responseData ?? null,
    response_status: Number.isInteger(responseStatus) ? responseStatus : null,
    success: success !== false,
    error_message: errorMessage ?? null,
    resource_ids: resourceIds ?? {},
  };
  const sb = getSupabase();
  const { error } = await sb.from("idempotency_keys").insert(row);
  if (!error) return;
  if (error.code !== "23505") throw error;
  // Key exists: only upgrade a recorded failure to a success; never overwrite a recorded success.
  if (row.success) {
    const { error: upErr } = await sb.from("idempotency_keys").update(row).eq("key", row.key).eq("success", false);
    if (upErr) throw upErr;
  }
};

export default IdempotencyKey;
