// Phase 15 - Super Admin payment oversight projection (read-only; never changes payment state).
//
// Why this exists: GET /api/admin/payments used to return every payments column (full customer phone, checkout request id,
// raw metadata) and the UI labelled the sum of successful customer collections as "Total Revenue". It also showed every
// `failed` payment as plainly failed although the callback pipeline can mark a payment failed while the provider reports money
// moved (amount mismatch) and ignores a success callback that arrives after a recorded failure (Phase 14.9 blockers 1 and 2).
// The projection below keeps the stored status untouched, masks the phone, and derives an honest reconciliation state from the
// evidence that already exists (payment_events, webhook_events). When that evidence cannot be read it says so instead of
// presenting the payment as settled.
import { getSupabase } from "./supabase.js";

export const maskPhone = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.length <= 3 ? "***" : `${"*".repeat(Math.max(digits.length - 3, 3))}${digits.slice(-3)}`;
};

export const RECONCILIATION_STATES = Object.freeze({
  SETTLED: "settled",
  PENDING: "pending",
  FAILED: "failed",
  NEEDS_RECONCILIATION: "needs_reconciliation",
  EVIDENCE_UNAVAILABLE: "evidence_unavailable",
});

const FLAG_EVENTS = ["amount_mismatch", "refund_required", "escrow_mpesa_rejected"];

async function loadEvidence(payments, sb) {
  const failed = payments.filter((p) => p.status === "failed");
  const evidence = { events: new Map(), lateSuccess: new Set(), unavailable: false };
  if (!failed.length) return evidence;
  try {
    const { data, error } = await sb.from("payment_events").select("payment_id,event_type,payload").in("payment_id", failed.map((p) => p.id)).in("event_type", FLAG_EVENTS);
    if (error) throw error;
    for (const e of data || []) {
      if (!evidence.events.has(e.payment_id)) evidence.events.set(e.payment_id, []);
      evidence.events.get(e.payment_id).push(e);
    }
    const checkouts = failed.map((p) => p.checkoutRequestId || p.checkout_request_id).filter(Boolean);
    if (checkouts.length) {
      const { data: hooks, error: hookError } = await sb.from("webhook_events").select("raw_payload").in("raw_payload->Body->stkCallback->>CheckoutRequestID", checkouts).limit(500);
      if (hookError) throw hookError;
      for (const h of hooks || []) {
        const stk = h.raw_payload?.Body?.stkCallback;
        if (stk && Number(stk.ResultCode) === 0) evidence.lateSuccess.add(stk.CheckoutRequestID);
      }
    }
  } catch {
    evidence.unavailable = true;
  }
  return evidence;
}

export function reconcile(payment, evidence, now = Date.now()) {
  const reasons = [];
  const status = payment.status;
  if (status === "success") return { state: RECONCILIATION_STATES.SETTLED, reasons };
  if (status === "pending" || status === "processing") {
    const created = payment.createdAt || payment.created_at;
    const ageMinutes = created ? Math.max(0, Math.round((now - new Date(created).getTime()) / 60000)) : null;
    return { state: RECONCILIATION_STATES.PENDING, reasons: ["AWAITING_PROVIDER_CONFIRMATION"], ageMinutes };
  }
  if (status !== "failed") return { state: RECONCILIATION_STATES.PENDING, reasons: ["UNRECOGNISED_STATUS"] };
  if (evidence.unavailable) return { state: RECONCILIATION_STATES.EVIDENCE_UNAVAILABLE, reasons: ["RECONCILIATION_EVIDENCE_UNREADABLE"] };
  for (const e of evidence.events.get(payment.id) || []) {
    if (e.event_type === "amount_mismatch") reasons.push("AMOUNT_MISMATCH_PROVIDER_RECEIPT_RECORDED");
    if (e.event_type === "refund_required") reasons.push("REFUND_REQUIRED");
    if (e.event_type === "escrow_mpesa_rejected") reasons.push("ESCROW_PAYMENT_REJECTED");
  }
  if (evidence.lateSuccess.has(payment.checkoutRequestId || payment.checkout_request_id)) reasons.push("SUCCESS_CALLBACK_RECEIVED_AFTER_FAILURE");
  const needs = reasons.some((r) => r !== "ESCROW_PAYMENT_REJECTED");
  return { state: needs ? RECONCILIATION_STATES.NEEDS_RECONCILIATION : RECONCILIATION_STATES.FAILED, reasons };
}

export async function buildAdminPaymentView(payments, { sb = getSupabase(), now = Date.now() } = {}) {
  const evidence = await loadEvidence(payments, sb);
  return payments.map((p) => ({
    id: p.id,
    amount: p.amount,
    type: p.type,
    status: p.status,
    mode: p.mode ?? null,
    mpesaReceipt: p.mpesaReceipt ?? p.mpesa_receipt ?? null,
    resultDesc: p.resultDesc ?? p.result_desc ?? null,
    phoneMasked: maskPhone(p.phone),
    createdAt: p.createdAt ?? p.created_at ?? null,
    paidAt: p.paidAt ?? p.paid_at ?? null,
    user: p.user ? { name: p.user.name ?? null, email: p.user.email ?? null } : null,
    car: p.car ? { title: p.car.title ?? null } : null,
    reconciliation: reconcile(p, evidence, now),
  }));
}
