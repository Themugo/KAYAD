import { stkPush } from "./mpesaService.js";
import { sendNotification } from "./notification.service.js";
import { findById, findOne, create, update } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";

export async function initiateBidSecurity({ auctionId, userId, phone, amount, registrationId, holdId = null, holdType = "commitment" }) {
  if (holdId) {
    const existingHold = await findById("auction_security_holds", holdId);
    if (existingHold?.checkoutRequestId && ["pending", "held"].includes(existingHold.status)) {
      return { success: true, mode: "mpesa", checkoutID: existingHold.checkoutRequestId, checkoutRequestID: existingHold.checkoutRequestId, holdId, holdType, resumed: true };
    }
  }
  const auction = await findById("cars", auctionId);
  const setup = await findOne("auction_setups", { car_id: auctionId });
  if (!auction || !setup || setup.publication_status !== "published") return { success: false, message: "Auction is not published" };
  const setupConfig = setup.config || {};
  if (setupConfig.startsAt && Date.parse(setupConfig.startsAt) <= Date.now()) return { success: false, message: "Auction registration commitment window has closed" };

  const securityAmount = amount || auction.bidSecurityAmount || 50000;

  const recipient = setupConfig.commitment?.recipient || "organizer";
  const destination = setupConfig.commitment?.recipientAccount || process.env.KAYAD_AUCTION_COMMITMENT_PAYBILL;

  // Trigger STK Push
  if (!destination) {
    return { success: false, message: "Payment recipient is not configured" };
  }

  let checkoutID;
  const mode = "mpesa";
  try {
    const stkRes = await stkPush(phone, securityAmount, destination);
    checkoutID = stkRes?.CheckoutRequestID;
    if (!checkoutID) throw new Error("M-Pesa did not return a checkout request ID");
  } catch (err) {
    console.error("Bid security STK failed, failing closed:", err.message);
    return {
      success: false,
      message: "Unable to initiate deposit payment right now — please try again shortly",
    };
  }

  // Create a pending transaction. It may become successful only after a verified M-Pesa callback for this checkout request.
  const transaction = await create("transactions", {
    user: userId,
    car: auction.id,
    amount: securityAmount,
    type: holdType === "high_value_deposit" ? "bid_security" : "bid_commitment",
    status: "pending",
    phone,
    checkoutRequestId: checkoutID,
    description: recipient === "platform"
      ? `Bid commitment for auction ${auctionId} — KAYAD platform recipient`
      : `Bid commitment for auction ${auctionId} — organizer recipient`,
    reference: `SEC-${auctionId}-${Date.now()}`,
    metadata: { auctionRegistrationId: registrationId || null, auctionId, recipient, auctionSecurityHoldId: holdId || null, auctionSecurityHoldType: holdType },
  });

  if (holdId) {
    await update("auction_security_holds", holdId, {
      checkout_request_id: checkoutID,
      payment_transaction_id: transaction.id,
      status: "pending",
    });
  }

  return { success: true, transaction, checkoutID, mode, destination, holdId, holdType };
}

export async function handleBidSecurityCallback({ checkoutRequestID, resultCode, mpesaReceipt, providerAmount = null }) {
  const transaction = await findOne("transactions", { checkoutRequestId: checkoutRequestID });
  if (!transaction) return { success: false, message: "Transaction not found" };

  if (providerAmount !== null && providerAmount !== undefined && Number(providerAmount) !== Number(transaction.amount)) {
    await update("transactions", transaction.id, { status: "failed", metadata: { ...(transaction.metadata || {}), amountMismatch: { expected: Number(transaction.amount), received: Number(providerAmount) } } });
    return { success: false, message: "Payment amount mismatch" };
  }

  // Idempotent: a duplicate/retry callback for an already-finalized
  // transaction is acknowledged without re-processing.
  if (transaction.status === "success" || transaction.status === "failed") {
    return { success: transaction.status === "success", transaction, duplicate: true };
  }

  const holdId = transaction.metadata?.auctionSecurityHoldId || null;

  if (holdId) {
    const hold = await findById("auction_security_holds", holdId);
    if (!hold) throw new Error("Auction security hold not found");
    if (hold.checkoutRequestId && String(hold.checkoutRequestId) !== String(checkoutRequestID)) {
      throw new Error("Auction security payment is bound to a different checkout request");
    }
    if (!hold.checkoutRequestId) {
      await update("auction_security_holds", hold.id, { checkout_request_id: checkoutRequestID });
    }
    const { data: settledHold, error: holdError } = await getSupabase().rpc("kayad_settle_auction_security_hold_atomic", {
      p_checkout_request_id: checkoutRequestID,
      p_success: resultCode === 0,
      p_receipt: mpesaReceipt || null,
    });
    if (holdError) throw holdError;
    await update("transactions", transaction.id, { status: resultCode === 0 ? "success" : "failed", mpesaReceipt: mpesaReceipt || null });
    return { success: resultCode === 0, transaction: await findById("transactions", transaction.id), hold: settledHold, duplicate: false };
  }

  if (resultCode !== 0) {
    await update("transactions", transaction.id, { status: "failed" });
    try {
      const { finalizeCommitmentRegistration } = await import("./auctionRegistration.service.js");
      await finalizeCommitmentRegistration({ checkoutRequestID, success: false, receipt: null });
    } catch (_) {}
    return { success: false, message: "Payment failed" };
  }

  await update("transactions", transaction.id, { status: "success", mpesaReceipt });

  try {
    const { finalizeCommitmentRegistration } = await import("./auctionRegistration.service.js");
    await finalizeCommitmentRegistration({ checkoutRequestID, success: true, receipt: mpesaReceipt });
  } catch (registrationErr) {
    console.warn("Bid security succeeded but bidder registration activation failed", registrationErr.message);
  }

  try {
    const { generateReceipt } = await import("./pdfService.js");
    await generateReceipt({
      title: "Bid Security Confirmed",
      amount: transaction.amount,
      transactionId: mpesaReceipt || transaction.id.toString(),
      carDetails: transaction.car?.toString() || "—",
      date: new Date(),
    });
  } catch (_) {
    /* PDF generation non-critical */
  }

  await sendNotification({
    userId: transaction.user,
    title: "Bid Security Confirmed",
    message: `KES ${Number(transaction.amount).toLocaleString()} secured. You can now place bids.`,
    type: "bid_security",
  });

  return { success: true, transaction };
}
