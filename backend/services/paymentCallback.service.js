import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import Bid from "../models/Bid.js";
import Car from "../models/Car.js";
import Escrow from "../models/Escrow.js";
import { sendNotification } from "../services/notification.service.js";
import { sendDigitalReceipt } from "../services/receiptService.js";
import User from "../models/User.js";
import Dealer from "../models/Dealer.js";
import DealerVerification from "../models/DealerVerification.js";
import { getIO } from "../utils/io.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const retry = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY_MS) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      logWarn("Callback retry", { attempt, retries, error: err.message });
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

    // ── Atomic claim: only one callback can claim a payment ──
    // Uses findOneAndUpdate with processed:false filter to
    // prevent race conditions when Safaricom retries the callback
    // while the first request's transaction is still in-flight.
    // After the first transaction commits, the retry will see
    // processed:true and return here instead of reprocessing.
    const payment = await Payment.findOneAndUpdate(
      { checkoutRequestId: checkoutId, processed: false },
      { $set: { processed: true } },
      { session, new: false },
    );

    if (!payment) {
      const existing = await Payment.findOne({ checkoutRequestId: checkoutId }).session(session);
      if (existing && existing.status === "success") {
        logInfo("Callback idempotent: payment already succeeded", { checkoutId });
        await session.commitTransaction();
        return existing;
      }
      logWarn("Payment not found or already claimed", { checkoutId });
      await session.abortTransaction();
      return;
    }

    if (!success) {
      payment.status = "failed";
      payment.resultDesc = stk.ResultDesc || "M-Pesa transaction failed";
      await payment.save({ session });

      await sendNotification({
        userId: payment.user,
        title: "Payment Failed",
        message: `KES ${payment.amount} — ${payment.resultDesc}`,
      }).catch((e) => logWarn("Payment callback notification failed", { error: e.message }));

      await session.commitTransaction();

      const io = getIO();
      if (io) {
        io.to(`user_${payment.user}`).emit("paymentFailed", {
          checkoutID: checkoutId,
          reason: payment.resultDesc,
        });
        if (payment.car)
          io.to(String(payment.car)).emit("paymentFailed", {
            checkoutID: checkoutId,
            reason: payment.resultDesc,
          });
      }
      return;
    }

    const metadata = stk.CallbackMetadata?.Item || [];

    const receipt = metadata.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

    const amount = metadata.find((i) => i.Name === "Amount")?.Value;

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

    let userDoc = null;
    try {
      userDoc = await User.findById(payment.user).select("email name phone").lean();
    } catch (_) {}
    sendDigitalReceipt({
      amount: payment.amount,
      carTitle: payment.car?.toString() || "Vehicle",
      mpesaReceipt: receipt || String(payment._id).slice(-8),
      user: userDoc || { email: null, phone: null, id: payment.user },
    }).catch((e) => logWarn("Digital receipt failed", { error: e.message }));

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
      const sellerId = escrowCar?.dealer || payment.user;

      // Check seller verification status
      const dealer = await Dealer.findOne({ user: sellerId }).session(session);
      if (dealer) {
        // Check legacy approval
        if (dealer.approved !== true) {
          const verification = await DealerVerification.findOne({ user: sellerId }).session(session);
          if (!verification || verification.verificationStatus !== "approved") {
            logWarn("Escrow creation blocked: seller not verified", {
              sellerId,
              verificationStatus: verification?.verificationStatus || "none",
              paymentId: payment._id,
            });
            // Refund payment since seller is not verified
            payment.status = "failed";
            payment.resultDesc = "Seller verification required for escrow";
            await payment.save({ session });
            await session.commitTransaction();
            await sendNotification({
              userId: payment.user,
              title: "Payment Refunded",
              message: "Your payment was refunded because the seller is not verified. Please contact support.",
              type: "payment",
            });
            return payment;
          }
        }
      }

      const commission = Math.round(payment.amount * 0.05);
      const sellerAmount = payment.amount - commission;
      const [newEscrow] = await Escrow.create(
        [{
          car: payment.car,
          buyer: payment.user,
          seller: sellerId,
          amount: payment.amount,
          payment: payment._id,
          commission,
          sellerAmount,
          status: "funded",
          fundedAt: new Date(),
          autoReleaseEligibleAt: new Date(Date.now() + 3 * 86400000),
          timeline: { depositReceived: true, depositReceivedAt: new Date() },
          history: [{ action: "Escrow created and funded", at: new Date() }],
        }],
        { session },
      );
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
    if (session) {
      try {
        await session.abortTransaction();
      } catch {
        /* already aborted */
      }
      try {
        session.endSession();
      } catch {
        /* already ended */
      }
    }
    logError("CALLBACK ERROR", err);
    throw err;
  }
};
