import { stkPush } from "./mpesaService.js";
import { resolveDealerCollection } from "./dealerPaymentAccount.service.js";
import { evaluatePrivateSellerAuctionEligibility } from "./privateSellerAuctionEligibility.service.js";
import { sendNotification } from "./notification.service.js";
import { findById, findOne, create, update } from "../db/index.js";
import { getSupabase } from "../utils/supabase.js";
import { createSecurityPayment, findSecurityPaymentByCheckout, updateSecurityPayment } from "./securityPaymentStore.js";

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

  // No silent default: the amount is the registration/policy amount or the payment is refused.
  const securityAmount = Number(amount || auction.bidSecurityAmount);
  if (!Number.isFinite(securityAmount) || securityAmount <= 0) return { success: false, message: "Commitment amount is not configured for this auction" };

  // Private sellers never control where commitment money goes (anti-scam): KAYAD collects and holds it,
  // and any seller-supplied recipient account is ignored. Only dealers' configured recipient is recorded.
  // Safe default if the seller type cannot be verified: treat as private (KAYAD-held).
  let privateSeller = true;
  try { privateSeller = (await evaluatePrivateSellerAuctionEligibility(auction)).scope !== "not_private_seller"; } catch (_) { privateSeller = true; }
  const recipient = privateSeller ? "platform" : (setupConfig.commitment?.recipient || "organizer");
  const destination = privateSeller ? null : (setupConfig.commitment?.recipientAccount || null);
  // Dealer-direct collection is deployment-gated. Keep it disabled until the owner confirms
  // the wallet/custody migration, callback/ledger semantics and sandbox reconciliation.
  // This prevents routing funds to a dealer while production may lack the custody schema/RPCs.
  const dealerDirectEnabled = process.env.AUCTION_DEALER_DIRECT_COLLECTION_ENABLED === "true";
  const dealerCollection = dealerDirectEnabled && !privateSeller && recipient === "organizer"
    ? await resolveDealerCollection(setup.organizerId).catch(() => null)
    : null;
  const custody = dealerCollection ? "dealer" : "kayad";
  // Every car gets its own M-Pesa account reference (Daraja allows 12 chars) so each payment is traceable to one auction.
  const accountReference = `AUC-${String(auction.id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  let checkoutID;
  const mode = "mpesa";
  try {
    const stkRes = await stkPush(phone, securityAmount, { ...(dealerCollection?.overrides || {}), accountReference, transactionDesc: "Bid commitment" });
    checkoutID = stkRes?.CheckoutRequestID;
    if (!checkoutID) throw new Error("M-Pesa did not return a checkout request ID");
  } catch (err) {
    console.error("Bid security STK failed, failing closed:", err.message);
    return {
      success: false,
      message: "Unable to initiate deposit payment right now — please try again shortly",
    };
  }

  // Create the pending security payment. It may become successful only after a verified M-Pesa callback for this checkout
  // request. Stored in `payments` - the table the auction FKs reference (see securityPaymentStore.js).
  const { row: transaction } = await createSecurityPayment({
    userId,
    carId: auction.id,
    amount: securityAmount,
    type: holdType === "high_value_deposit" ? "bid_security" : "bid_commitment",
    phone,
    checkoutRequestId: checkoutID,
    metadata: {
      description: recipient === "platform"
        ? `Bid commitment for auction ${auctionId} — held by KAYAD`
        : custody === "dealer" ? `Bid commitment for auction ${auctionId} — paid directly to the organizer's verified account` : `Bid commitment for auction ${auctionId} — collected by KAYAD (organizer account ${destination || "n/a"} recorded)`,
      accountReference, custody, collectedBy: custody === "dealer" ? `dealer_${dealerCollection.kind}_${dealerCollection.shortcode}` : "kayad_shortcode",
      reference: `SEC-${auctionId}-${Date.now()}`,
      auctionRegistrationId: registrationId || null, auctionId, recipient, auctionSecurityHoldId: holdId || null, auctionSecurityHoldType: holdType,
    },
  });

  if (holdId) {
    await update("auction_security_holds", holdId, {
      checkout_request_id: checkoutID,
      payment_transaction_id: transaction.id,
      ...(custody === "dealer" ? { custody } : {}), // column exists only after the wallet/custody migration; dealer-direct needs that migration anyway
      status: "pending",
    });
  }

  return { success: true, transaction, checkoutID, mode, destination, accountReference, recipient, custody, holdId, holdType };
}

export async function handleBidSecurityCallback({ checkoutRequestID, resultCode, mpesaReceipt, providerAmount = null }) {
  const ref = await findSecurityPaymentByCheckout(checkoutRequestID);
  if (!ref) return { success: false, message: "Transaction not found" };
  const transaction = ref.row;

  if (providerAmount !== null && providerAmount !== undefined && Number(providerAmount) !== Number(transaction.amount)) {
    await updateSecurityPayment(ref, { status: "failed", metadata: { ...(transaction.metadata || {}), amountMismatch: { expected: Number(transaction.amount), received: Number(providerAmount) } } });
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
    await updateSecurityPayment(ref, { status: resultCode === 0 ? "success" : "failed", mpesaReceipt: mpesaReceipt || null });
    return { success: resultCode === 0, transaction: await findById(ref.table, transaction.id), hold: settledHold, duplicate: false };
  }

  if (resultCode !== 0) {
    await updateSecurityPayment(ref, { status: "failed" });
    try {
      const { finalizeCommitmentRegistration } = await import("./auctionRegistration.service.js");
      await finalizeCommitmentRegistration({ checkoutRequestID, success: false, receipt: null });
    } catch (_) {}
    return { success: false, message: "Payment failed" };
  }

  await updateSecurityPayment(ref, { status: "success", mpesaReceipt });

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
