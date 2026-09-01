import { stkPush } from "./mpesaService.js";
import { sendNotification } from "./notification.service.js";
import { findById, findOne, create, update } from "../db/index.js";

export async function initiateBidSecurity({ auctionId, userId, phone, amount }) {
  const auction = await findById("auctions", auctionId) /* .populate("carId") - TODO: use separate query */;
  if (!auction) return { success: false, message: "Auction not found" };

  const securityAmount = amount || auction.bidSecurityAmount || 50000;

  const destination =
    auction.paymentRecipient === "DEALER_DIRECT"
      ? auction.dealerMpesaShortcode
      : process.env.KAYAD_MASTER_PAYBILL;

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

  // Create transaction record. In mock mode the status stays "pending"
  // (never "success") so no workflow can treat an unpaid deposit as paid.
  const transaction = await create("transactions", {
    user: userId,
    car: auction.carId?._id || auction.carId,
    amount: securityAmount,
    type: "bid_commitment",
    status: "pending",
    phone,
    checkoutRequestId: checkoutID,
    description: `Bid security for auction ${auctionId} — ${auction.paymentRecipient === "DEALER_DIRECT" ? "paid to dealer" : "held in KAYAD escrow"}`,
    reference: `SEC-${auctionId}-${Date.now()}`,
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
    return { success: false, message: "Payment failed" };
  }

  await update("transactions", transaction.id, { status: "success", mpesaReceipt });

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
