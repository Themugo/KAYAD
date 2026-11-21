// GAP-OFFER-TXN: accepted offer -> purchase payment. All amount decisions are made by the database
// (migration 20261121110000); the browser supplies only the offer reference and a phone number.
import { getSupabase } from "../utils/supabase.js";
import { initiatePayment } from "./paymentService.js";
import { logError } from "../infrastructure/logging/index.js";

const REFUSAL = {
  OFFER_NOT_ACCEPTED: [409, "This offer has not been accepted for purchase."],
  NOT_BUYER: [403, "Only the buyer in this negotiation can pay an accepted offer."],
  ALREADY_PAID: [409, "This accepted offer has already been paid."],
  SETTLEMENT_CANCELLED: [409, "This accepted offer was cancelled. Submit a new offer to continue."],
  SETTLEMENT_LAPSED: [409, "The payment window for this accepted offer has ended. Submit a new offer to continue."],
  SETTLEMENT_EXPIRED: [409, "The payment window for this accepted offer has ended. Submit a new offer to continue."],
  VEHICLE_UNAVAILABLE: [409, "This vehicle is no longer available from the agreed seller."],
  NOT_FOUND: [404, "Settlement not found."],
  NOT_PARTICIPANT: [403, "Not authorized for this settlement."],
  NOT_CANCELLABLE: [409, "This settlement can no longer be cancelled."],
  PAYMENT_IN_PROGRESS: [409, "A payment is in progress for this vehicle."],
};
const TRIGGER = {
  OFFER_SETTLEMENT_ALREADY_PAID: [409, "ALREADY_PAID"],
  OFFER_SETTLEMENT_WRONG_BUYER: [403, "NOT_BUYER"],
  OFFER_SETTLEMENT_AMOUNT_MISMATCH: [409, "AMOUNT_MISMATCH"],
};

const refuse = (code, extra = {}) => {
  const [statusCode, message] = REFUSAL[code] || [409, "Request refused."];
  return Object.assign(new Error(message), { statusCode, code, ...extra });
};

/** Active (awaiting non-expired, or paid) settlement for a vehicle, or null. Used by the generic payment route. */
export async function getActiveSettlementForVehicle(vehicleId) {
  const { data, error } = await getSupabase().from("marketplace_offer_settlements")
    .select("id,offer_id,buyer_id,seller_id,agreed_amount,status,expires_at").eq("vehicle_id", vehicleId).in("status", ["awaiting_payment", "paid"]);
  if (error) throw error;
  const live = (data || []).filter((s) => s.status === "paid" || new Date(s.expires_at) > new Date());
  return live[0] || null;
}

export async function getSettlementForOffer(offerId) {
  const { data, error } = await getSupabase().from("marketplace_offer_settlements")
    .select("id,offer_id,lead_id,vehicle_id,buyer_id,seller_id,agreed_amount,currency,status,payment_id,escrow_id,expires_at,paid_at,cancel_reason,created_at")
    .eq("offer_id", offerId).maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function payAcceptedOffer({ leadId, offerId, buyerId, phone }) {
  const settlement = await getSettlementForOffer(offerId);
  if (!settlement || settlement.lead_id !== leadId) throw refuse("OFFER_NOT_ACCEPTED");
  const { data, error } = await getSupabase().rpc("kayad_offer_settlement_begin_payment", { p_offer_id: offerId, p_buyer_id: buyerId });
  if (error) throw error;
  if (!data?.ok) throw refuse(data?.code);
  let result;
  try {
    // amount comes from the settlement row, never from the request
    result = await initiatePayment({ userId: buyerId, carId: data.vehicleId, type: "purchase", amount: Number(data.agreedAmount), phone, metadata: { settlementId: data.settlementId, offerId: data.offerId } });
  } catch (err) {
    const trig = Object.entries(TRIGGER).find(([k]) => String(err?.message || "").includes(k));
    if (trig) throw refuse(trig[1][1] === "ALREADY_PAID" ? "ALREADY_PAID" : trig[1][1] === "NOT_BUYER" ? "NOT_BUYER" : "PAYMENT_IN_PROGRESS", { statusCode: trig[1][0] });
    logError("Accepted-offer payment initiation failed", err, { offerId });
    throw Object.assign(new Error("The payment provider could not start this payment. Please try again."), { statusCode: 502, code: "PAYMENT_PROVIDER_ERROR" });
  }
  if (!result?.success) throw Object.assign(new Error(result?.message || "Payment could not be started"), { statusCode: 409, code: result?.code || "PAYMENT_NOT_STARTED" });
  return { ...result, settlement: { id: data.settlementId, offerId: data.offerId, agreedAmount: Number(data.agreedAmount), expiresAt: data.expiresAt } };
}

export async function cancelSettlement({ settlementId, actorId, reason }) {
  const { data, error } = await getSupabase().rpc("kayad_offer_settlement_cancel", { p_settlement_id: settlementId, p_actor_id: actorId, p_reason: reason ?? null });
  if (error) throw error;
  if (!data?.ok) throw refuse(data?.code);
  return data;
}
