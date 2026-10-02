import { stkPush } from "./mpesaService.js";
import { sendNotification } from "./notification.service.js";
import { findById, findOne, create, update } from "../db/index.js";

export async function initiateBidSecurity({ auctionId, userId, phone, amount, registrationId }) {
  const auction = await findById("cars", auctionId);
  const setup = await findOne("auction_setups", { car_id: auctionId });
  if (!auction || !setup || setup.publication_status !== "published") return { success: false, message: "Auction is not published" };
  const setupConfig = setup.config || {};
  if (setupConfig.startsAt && Date.parse(setupConfig.startsAt) <= Date.now()) return { success: false, message: "Auction registration commitment window has closed" };

  const securityAmount = amount || auction.bidSecurityAmount || 50000;

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
    type: "bid_commitment",
    status: "pending",
    phone,
    checkoutRequestId: checkoutID,
    description: `Bid security for auction ${auctionId} — held in KAYAD escrow`,
    reference: `SEC-${auctionId}-${Date.now()}`,
    metadata: { auctionRegistrationId: registrationId || null, auctionId, recipient: setupConfig.commitment?.recipient || "organizer" },
  });

  return { success: true, transaction, checkoutID, mode, destination };
}

export async function handleBidSecurityCallback({ checkoutRequestID, resultCode, mpesaReceipt }) {
  const transaction = await findOne("transactions", { checkoutRequestId: checkoutRequestID });
  if (!transaction) return { success: false, message: "Transaction not found" };

  // Idempotent: a duplicate/retry callback for an already-finalized
  // transaction is acknowledged without re-processing.
  if (transaction.status === "success" || transaction.status === "failed") {
    return { success: transaction.status === "success", transaction, duplicate: true };
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

  // Auction Phase 5: activate the canonical bidder registration after the
  // provider-confirmed commitment succeeds. This is idempotent and does not
  // create a second payment/registration authority.
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
