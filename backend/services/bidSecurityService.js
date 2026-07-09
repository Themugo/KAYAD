import { stkPush } from "./mpesaService.js";
import { sendNotification } from "./notification.service.js";
import { findById, findOne, create } from "../db/index.js";

export async function initiateBidSecurity({ auctionId, userId, phone, amount }) {
  const auction = await findById("auctions", auctionId) /* .populate("carId") - TODO: use separate query */;
  if (!auction) return { success: false, message: "Auction not found" };

  const securityAmount = amount || auction.bidSecurityAmount || 50000;

  const destination =
    auction.paymentRecipient === "DEALER_DIRECT"
      ? auction.dealerMpesaShortcode
      : process.env.KAYAD_MASTER_PAYBILL || "174379";

  // Trigger STK Push
  let checkoutID = "MOCK_" + Date.now();
  let mode = "mock";
  try {
    const stkRes = await stkPush(phone, securityAmount, destination);
    if (stkRes?.CheckoutRequestID) {
      checkoutID = stkRes.CheckoutRequestID;
      mode = "mpesa";
    }
  } catch (err) {
    console.warn("Bid security STK failed, mock fallback:", err.message);
  }

  // Create transaction record
  const transaction = await create("transactions", {
    user: userId,
    car: auction.carId?._id || auction.carId,
    amount: securityAmount,
    type: "bid_commitment",
    status: mode === "mpesa" ? "pending" : "success",
    phone,
    checkoutRequestId: checkoutID,
    description: `Bid security for auction ${auctionId} — ${auction.paymentRecipient === "DEALER_DIRECT" ? "paid to dealer" : "held in KAYAD escrow"}`,
    reference: `SEC-${auctionId}-${Date.now()}`,
  });

  return { transaction, checkoutID, mode, destination };
}

export async function handleBidSecurityCallback({ checkoutRequestID, resultCode, mpesaReceipt }) {
  const transaction = await findOne("transactions", { checkoutRequestId: checkoutRequestID });
  if (!transaction) return { success: false, message: "Transaction not found" };

  if (resultCode !== 0) {
    transaction.status = "failed";
    await transaction.save();
    return { success: false, message: "Payment failed" };
  }

  transaction.status = "success";
  transaction.mpesaReceipt = mpesaReceipt;
  await transaction.save();

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
