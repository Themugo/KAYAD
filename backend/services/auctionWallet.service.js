import crypto from "crypto";
import { findById } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { logError } from "../utils/logger.js";
import { sendB2CPayment } from "./mpesaB2C.service.js";

const rpc = async (name, args) => {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) {
    const known = /does not belong|paid to the dealer|not awaiting|Insufficient|Minimum|not found/i.test(error.message || "");
    throw Object.assign(new Error(error.message), { status: known ? 409 : 500 });
  }
  return data;
};

export async function getWallet(userId) {
  const sb = getSupabase();
  const [{ data: w }, { data: txs }, { data: holds }] = await Promise.all([
    sb.from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
    sb.from("wallet_transactions").select("id,direction,amount,balance_after,reason,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    sb.from("auction_security_holds").select("id,auction_id,amount,custody").eq("bidder_id", userId).eq("status", "refund_pending"),
  ]);
  return { balance: Number(w?.balance || 0), transactions: txs || [], refundable: (holds || []).map((h) => ({ holdId: h.id, auctionId: h.auction_id, amount: Number(h.amount), custody: h.custody || "kayad" })) };
}

export async function refundHold({ holdId, userId, destination = "wallet" }) {
  if (!["wallet", "mpesa"].includes(destination)) throw Object.assign(new Error("destination must be wallet or mpesa"), { status: 422 });
  const refunded = await rpc("kayad_auction_refund_to_wallet_atomic", { p_hold_id: holdId, p_user_id: userId, p_destination: destination });
  let withdrawal = null;
  if (destination === "mpesa" && !refunded.idempotent) {
    // The money is in the wallet first; sending is a second, separately recoverable step. A failure leaves it safely in the wallet.
    try { withdrawal = await withdraw({ userId, amount: refunded.amount, key: `refund-send:${holdId}` }); }
    catch (e) { withdrawal = { error: e.message }; }
  }
  return { ...refunded, withdrawal };
}

/** Withdraw to the user's OWN verified profile phone only: a wallet can never be paid out to an arbitrary number (anti-scam). */
export async function withdraw({ userId, amount, key = null }) {
  const user = await findById("users", userId);
  const phone = user?.phone;
  if (!phone) throw Object.assign(new Error("A verified phone number is required on your profile to withdraw"), { status: 422 });
  const wd = await rpc("kayad_wallet_request_withdrawal_atomic", { p_user_id: userId, p_amount: Number(amount), p_phone: phone, p_idempotency_key: key || `wd:${userId}:${crypto.randomUUID()}` });
  if (wd.idempotent) return wd;
  try {
    const sent = await sendB2CPayment({ phone, amount: wd.amount });
    await rpc("kayad_wallet_withdrawal_result_atomic", { p_withdrawal_id: wd.id, p_status: "processing", p_conversation_id: sent.conversationID, p_receipt: null, p_reason: null });
    return { ...wd, status: "processing", conversationId: sent.conversationID };
  } catch (e) {
    await rpc("kayad_wallet_withdrawal_result_atomic", { p_withdrawal_id: wd.id, p_status: "failed", p_conversation_id: null, p_receipt: null, p_reason: e.message }); // money returns to the wallet
    throw Object.assign(new Error(e.code === "MPESA_B2C_NOT_CONFIGURED" ? "Withdrawals are temporarily unavailable. Your balance is safe in your wallet." : "Withdrawal could not be sent. Your balance is safe in your wallet."), { status: 502 });
  }
}

/** Called from the B2C result callback. Returns true when the conversation belonged to a wallet withdrawal. */
export async function handleWalletB2CResult({ conversationId, success, transactionId, amount, resultDesc }) {
  if (!conversationId) return false;
  const { data: wd } = await getSupabase().from("wallet_withdrawals").select("id,amount,status").eq("conversation_id", conversationId).maybeSingle();
  if (!wd) return false;
  const mismatch = success && (amount == null || Math.round(Number(amount) * 100) !== Math.round(Number(wd.amount) * 100));
  if (mismatch) {
    // Money may have left KAYAD: never reverse it to the wallet automatically (that would pay twice). Leave it for manual reconciliation.
    logError("Wallet withdrawal amount mismatch - manual reconciliation required", new Error("amount mismatch"), { withdrawalId: wd.id, expected: wd.amount, received: amount });
    return true;
  }
  await rpc("kayad_wallet_withdrawal_result_atomic", {
    p_withdrawal_id: wd.id, p_status: success ? "paid" : "failed", p_conversation_id: conversationId,
    p_receipt: transactionId || null, p_reason: success ? null : (resultDesc || "M-Pesa B2C failed"),
  });
  return true;
}
