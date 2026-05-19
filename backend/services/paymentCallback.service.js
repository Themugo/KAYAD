import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import Car from "../models/Car.js";
import { createEscrow } from "../services/escrow.service.js";
import { sendNotification } from "../services/notification.service.js";

export const handleMpesaCallback = async (callbackData) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const stk = callbackData.Body?.stkCallback;

    if (!stk) throw new Error("Invalid callback format");

    const checkoutId = stk.CheckoutRequestID;
    const success = stk.ResultCode === 0;

    const payment = await Payment.findOne({
      checkoutRequestId: checkoutId,
    }).session(session);

    if (!payment) {
      console.warn("⚠️ Payment not found:", checkoutId);
      await session.abortTransaction();
      return;
    }

    // 🛡 IDEMPOTENCY
    if (payment.status === "success") {
      await session.commitTransaction();
      return payment;
    }

    if (!success) {
      payment.status = "failed";
      await payment.save({ session });

      await session.commitTransaction();
      return;
    }

    // =============================
    // 📥 SAFE METADATA EXTRACTION
    // =============================
    const metadata = stk.CallbackMetadata?.Item || [];

    const receipt = metadata.find(
      (i) => i.Name === "MpesaReceiptNumber"
    )?.Value;

    const amount = metadata.find(
      (i) => i.Name === "Amount"
    )?.Value;

    if (!receipt || !amount) {
      throw new Error("Incomplete M-Pesa metadata");
    }

    // 🛡 AMOUNT VALIDATION
    if (Number(amount) !== Number(payment.amount)) {
      throw new Error("Amount mismatch");
    }

    // =============================
    // ✅ UPDATE PAYMENT
    // =============================
    payment.status = "success";
    payment.mpesaReceipt = receipt;
    payment.paidAt = new Date();

    await payment.save({ session });

    // ── PDF RECEIPT (fire-and-forget) ─────────────────────────
    try {
      const { generateReceipt } = await import("./pdfService.js");
      generateReceipt({
        title: payment.type === "purchase" ? "Purchase Payment Confirmed" : "Payment Confirmed",
        amount: payment.amount,
        transactionId: receipt || payment._id.toString(),
        carDetails: payment.car?.toString() || "—",
        date: new Date(),
      }).catch(() => {});
    } catch (_) { /* PDF generation non-critical */ }

    // =============================
    // 🎯 BUSINESS LOGIC
    // =============================

    // 🔥 BID PAYMENT FLOW
    if (payment.type === "bid") {
      let bid = null;

      if (payment.bidId) {
        bid = await Bid.findById(payment.bidId).session(session);
      }

      if (!bid && payment.car) {
        bid = await Bid.findOne({
          carId: payment.car,
          status: "pending",
          checkoutRequestID,
        }).session(session);
      }

      if (bid && bid.status !== "paid") {
        bid.status = "paid";
        bid.mpesaReceipt = receipt;
        bid.paidAt = new Date();
        await bid.save({ session });

        const car = await Car.findById(bid.carId).session(session);

        if (car) {
          car.currentBid = bid.amount;
          car.highestBidder = bid.user;
          await car.save({ session });

          if (global.io) {
            global.io.to(`car_${car._id}`).emit("auctionUpdate", {
              carId: car._id,
              currentBid: bid.amount,
            });
          }
        }
      }
    }

    // 🔥 ESCROW FLOW (purchase)
    if (payment.type === "purchase") {
      const escrowCar = await Car.findById(payment.car).session(session).lean();
      await createEscrow({
        car: payment.car,
        buyer: payment.user,
        seller: escrowCar?.dealer || payment.user,
        amount: payment.amount,
        paymentId: payment._id,
      });
    }

    // =============================
    // 🔔 NOTIFICATION
    // =============================
    await sendNotification({
      userId: payment.user,
      title: "✅ Payment Successful",
      message: `KES ${payment.amount} received successfully`,
    });

    await session.commitTransaction();
    session.endSession();

    return payment;

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("❌ CALLBACK ERROR:", err.message);
  }
};