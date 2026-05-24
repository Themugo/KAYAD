import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import Car from "../models/Car.js";
import { createEscrow } from "../services/escrow.service.js";
import { sendNotification } from "../services/notification.service.js";
import { getIO } from "../utils/io.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const retry = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY_MS) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Callback retry ${attempt}/${retries}: ${err.message}`);
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
};

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
      console.warn("Payment not found:", checkoutId);
      await session.abortTransaction();
      return;
    }

    if (payment.status === "success") {
      await session.commitTransaction();
      return payment;
    }

    if (!success) {
      payment.status = "failed";
      payment.resultDesc = stk.ResultDesc || "M-Pesa transaction failed";
      await payment.save({ session });

      await sendNotification({
        userId: payment.user,
        title: "Payment Failed",
        message: `KES ${payment.amount} — ${payment.resultDesc}`,
      }).catch((e) => console.warn("⚠️ Payment callback notification failed:", e.message));

      await session.commitTransaction();

      const io = getIO();
      if (io) {
        io.to(`user_${payment.user}`).emit("paymentFailed", {
          checkoutID: checkoutId,
          reason: payment.resultDesc,
        });
        if (payment.car) io.to(String(payment.car)).emit("paymentFailed", {
          checkoutID: checkoutId,
          reason: payment.resultDesc,
        });
      }
      return;
    }

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

    if (Number(amount) !== Number(payment.amount)) {
      throw new Error("Amount mismatch");
    }

    payment.status = "success";
    payment.mpesaReceipt = receipt;
    payment.paidAt = new Date();

    await payment.save({ session });

    try {
      const { generateReceipt } = await import("./pdfService.js");
      generateReceipt({
        title: payment.type === "purchase" ? "Purchase Payment Confirmed" : "Payment Confirmed",
        amount: payment.amount,
        transactionId: receipt || payment._id.toString(),
        carDetails: payment.car?.toString() || "—",
        date: new Date(),
      }).catch((e) => console.warn("⚠️ Payment callback notification failed:", e.message));
    } catch (_) {}

    if (payment.type === "bid") {
      await retry(async () => {
        let bid = null;

        if (payment.bidId) {
          bid = await Bid.findById(payment.bidId).session(session);
        }

        if (!bid && payment.car) {
          bid = await Bid.findOne({
            carId: payment.car,
            status: "pending",
            checkoutRequestID: checkoutId,
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

            if (getIO()) {
              getIO().to(`car_${car._id}`).emit("auctionUpdate", {
                carId: car._id,
                currentBid: bid.amount,
              });
            }
          }
        }
      });
    }

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

    await sendNotification({
      userId: payment.user,
      title: "Payment Successful",
      message: `KES ${payment.amount} received successfully. Receipt: ${receipt}`,
    });

    await session.commitTransaction();
    session.endSession();

    const io = getIO();
    if (io) {
      const payload = { checkoutID: checkoutId, receipt, paymentId: payment._id };
      io.to(`user_${payment.user}`).emit("paymentSuccess", payload);
      if (payment.car) io.to(String(payment.car)).emit("paymentSuccess", payload);
    }

    return payment;

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("CALLBACK ERROR:", err.message);
    throw err;
  }
};
