// Auction commitment / bid-security payment records (defect FIN-SCH-1, docs/audits/13-FINANCIAL-SCHEMA-INTEGRITY-20261011.md).
//
// Contract (from the migrations, not invented here): auction_registrations.commitment_transaction_id and
// auction_security_holds.payment_transaction_id both REFERENCE payments(id) (20261002193000, 20261007180000), and payments
// already carries every needed field (user_id, car_id, amount, type, status, phone, checkout_request_id UNIQUE, mode,
// mpesa_receipt, paid_at, processed, metadata). The code, however, wrote these records into a `transactions` table that no
// migration creates. Consequences on a schema built from the migrations: every M-Pesa callback failed at its first
// statement (findOne("transactions") -> relation does not exist), so NO payment of any kind could settle; and even where
// `transactions` exists out-of-band, writing its id into payment_transaction_id violates the FK to payments.
//
// This module stores new security payments in `payments` (the declared authority) and, for a transition period, still
// FINDS legacy pending rows in `transactions` when that table exists (hosted drift / in-flight STK pushes), so no in-flight
// callback is orphaned. It never creates the legacy table and never writes new rows to it.
import { findOne, create, update } from "../db/index.js";

export const SECURITY_PAYMENT_TYPES = Object.freeze(["bid_commitment", "bid_security"]);
const isMissingRelation = (e) => /42P01|PGRST205|PGRST204|does not exist|schema cache/i.test(`${e?.code || ""} ${e?.message || ""}`);

/** Locate the security payment for an M-Pesa checkout id. Returns { table, row } or null (null = not a security payment). */
export async function findSecurityPaymentByCheckout(checkoutRequestId, deps = { findOne }) {
  if (!checkoutRequestId) return null;
  const payment = await deps.findOne("payments", { checkoutRequestId });
  if (payment) return SECURITY_PAYMENT_TYPES.includes(payment.type) ? { table: "payments", row: payment } : null;
  try {
    const legacy = await deps.findOne("transactions", { checkoutRequestId });
    if (legacy && SECURITY_PAYMENT_TYPES.includes(legacy.type)) return { table: "transactions", row: legacy };
  } catch (e) {
    if (!isMissingRelation(e)) throw e; // the legacy table is optional; any other failure must surface
  }
  return null;
}

/** Create the pending security payment (only after the provider returned a checkout request id). */
export async function createSecurityPayment({ userId, carId, amount, type, phone, checkoutRequestId, metadata }, deps = { create }) {
  if (!SECURITY_PAYMENT_TYPES.includes(type)) throw new Error(`Unsupported security payment type: ${type}`);
  const row = await deps.create("payments", {
    user: userId, car: carId, amount, type, status: "pending", phone: phone || null,
    checkoutRequestId, mode: "mpesa", processed: false, metadata: metadata || {},
  });
  return { table: "payments", row };
}

/** Apply a status patch to whichever table holds the record. */
export async function updateSecurityPayment(ref, patch, deps = { update }) {
  const finalizing = patch.status === "success" || patch.status === "failed";
  const body = ref.table === "payments"
    ? { ...patch, ...(finalizing ? { processed: true } : {}), ...(patch.status === "success" ? { paidAt: new Date().toISOString() } : {}) }
    : patch;
  return deps.update(ref.table, ref.row.id, body);
}
