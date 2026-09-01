import { findById, findOne, findAll, create, update, updateMany } from "../db/index.js";
import { sendNotification } from "../services/notification.service.js";
import { sendDigitalReceipt } from "../services/receiptService.js";
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
  // Tracks a claimed-but-unfinished payment so the outer catch can
  // release the claim and let a provider retry reprocess it.
  let claimedPaymentId = null;
  let finalized = false;
  try {
    const stk = callbackData.Body?.stkCallback;

    if (!stk) throw new Error("Invalid callback format");

    const checkoutId = stk.CheckoutRequestID;
    const success = stk.ResultCode === 0;

    // ── Claim payment atomically ──
    // Single conditional UPDATE: only the first callback to flip
    // processed=false → true claims the payment. Concurrent duplicate
    // callbacks update 0 rows and exit, so side effects (escrow
    // creation, bid settlement, notifications) can never run twice.
    const claimed = await updateMany(
      "payments",
      { checkoutRequestId: checkoutId, processed: false },
      { processed: true },
    );

    if (!claimed || claimed.length === 0) {
      const existing = await findOne("payments", { checkoutRequestId: checkoutId });
      if (existing && existing.status === "success") {
        logInfo("Callback idempotent: payment already succeeded", { checkoutId });
        return existing;
      }
      logWarn("Payment not found or already claimed", { checkoutId });
      return;
    }

    const payment = claimed[0];
    claimedPaymentId = payment.id;

    // If processing fails after the claim (provider sent incomplete
    // data, a downstream write failed, etc.), release the claim so a
    // later provider retry can reprocess instead of leaving the
    // payment stuck in "pending" forever.
    const releaseClaim = () =>
      update("payments", payment.id, { processed: false }).catch((e) =>
        logError("Failed to release payment claim", e, { paymentId: payment.id }),
      );

    if (!success) {
      await update("payments", payment.id, {
        status: "failed",
        resultDesc: stk.ResultDesc || "M-Pesa transaction failed",
      });
      finalized = true;

      await sendNotification({
        userId: payment.user,
        title: "Payment Failed",
        message: `KES ${payment.amount} — ${stk.ResultDesc || "M-Pesa transaction failed"}`,
      }).catch((e) => logWarn("Payment callback notification failed", { error: e.message }));

      const io = getIO();
      if (io) {
        io.to(`user_${payment.user}`).emit("paymentFailed", {
          checkoutID: checkoutId,
          reason: stk.ResultDesc || "M-Pesa transaction failed",
        });
        if (payment.car)
          io.to(String(payment.car)).emit("paymentFailed", {
            checkoutID: checkoutId,
            reason: stk.ResultDesc || "M-Pesa transaction failed",
          });
      }
      return;
    }

    const metadata = stk.CallbackMetadata?.Item || [];

    const receipt = metadata.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

    const amount = metadata.find((i) => i.Name === "Amount")?.Value;

    if (!receipt || amount === undefined || amount === null) {
      await releaseClaim();
      throw new Error("Incomplete M-Pesa metadata");
    }

    if (Number(amount) !== Number(payment.amount)) {
      // Amount integrity violation — definitive, not retryable. The
      // settled amount must always equal the server-recorded amount.
      await update("payments", payment.id, {
        status: "failed",
        resultDesc: `Amount mismatch: expected ${payment.amount}, provider reported ${amount}`,
      });
      logError("M-Pesa callback amount mismatch — payment failed", null, {
        paymentId: payment.id,
        expected: payment.amount,
        reported: amount,
        receipt,
      });
      return;
    }

    await update("payments", payment.id, {
      status: "success",
      mpesaReceipt: receipt,
      paidAt: new Date(),
    });
    let userDoc = null;
    try {
      userDoc = await findById("users", payment.user, "email name phone");
    } catch (e) { logWarn("Payment callback user lookup failed", { error: e.message }); }
    sendDigitalReceipt({
      amount: payment.amount,
      carTitle: payment.car?.toString() || "Vehicle",
      mpesaReceipt: receipt || String(payment.id).slice(-8),
      user: userDoc || { email: null, phone: null, id: payment.user },
    }).catch((e) => logWarn("Digital receipt failed", { error: e.message }));

    if (payment.type === "bid") {
      await retry(async () => {
        let bid = null;

        if (payment.bidId) {
          bid = await findById("bids", payment.bidId);
        }

        if (!bid && payment.car) {
          bid = await findOne("bids", {
            carId: payment.car,
            status: "pending",
            checkoutRequestID: checkoutId,
          });
        }

        if (bid && bid.status !== "paid") {
          await update("bids", bid.id, {
            status: "paid",
            mpesaReceipt: receipt,
            paidAt: new Date(),
          });

          const car = await findById("cars", bid.carId);

          if (car) {
            await update("cars", car.id, {
              currentBid: bid.amount,
              highestBidder: bid.user,
            });

            if (getIO()) {
              getIO().to(`car_${car.id}`).emit("auctionUpdate", {
                carId: car.id,
                currentBid: bid.amount,
              });
            }
          }

          const auction = await findOne("auctions", { carId: bid.carId, status: "pending_payment" });
          if (auction) {
            await update("auctions", auction.id, { status: "completed", paidAt: new Date() });
          }
        }
      });
    }

    if (payment.type === "purchase") {
      const escrowCar = await findById("cars", payment.car);
      const sellerId = escrowCar?.dealer || payment.user;

      const dealer = await findOne("dealers", { user: sellerId });
      if (dealer) {
        if (dealer.approved !== true) {
          const verification = await findOne("dealer_verifications", { user: sellerId });
          if (!verification || verification.verificationStatus !== "approved") {
            logWarn("Escrow creation blocked: seller not verified", {
              sellerId,
              verificationStatus: verification?.verificationStatus || "none",
              paymentId: payment.id,
            });
            await update("payments", payment.id, {
              status: "failed",
              resultDesc: "Seller verification required for escrow",
            });
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

      // Payment callbacks may be retried after a downstream timeout. The
      // payment reference is the idempotency key for escrow creation.
      const existingEscrow = await findOne("escrows", { payment: payment.id });
      if (!existingEscrow) {
        const config = await findOne("platform_config", {});
        const rate = config?.dealerCommission ? config.dealerCommission / 100 : 0.05;
        const commission = Math.round(payment.amount * rate);
        const sellerAmount = payment.amount - commission;
        await create("escrows", {
          car: payment.car,
          buyer: payment.user,
          seller: sellerId,
          amount: payment.amount,
          payment: payment.id,
          commission,
          sellerAmount,
          status: "funded",
          fundedAt: new Date(),
          autoReleaseEligibleAt: new Date(Date.now() + 3 * 86400000),
          timeline: { depositReceived: true, depositReceivedAt: new Date() },
          history: [{ action: "Escrow created and funded", at: new Date() }],
        });
      }
    }

    await sendNotification({
      userId: payment.user,
      title: "Payment Successful",
      message: `KES ${payment.amount} received successfully. Receipt: ${receipt}`,
    });

    if (payment.type === "package_upgrade") {
      const planId = payment.metadata?.planId;
      const PLANS = {
        starter:    { limit: 10,  name: "Starter" },
        growth:     { limit: 30,  name: "Growth" },
        elite:      { limit: 100, name: "Elite" },
        enterprise: { limit: 0,   name: "Enterprise" },
      };
      const plan = PLANS[planId];
      if (plan) {
        await update("users", payment.user, {
          dealerPackage: planId,
          packageListingMax: plan.limit,
          packageExpiresAt: new Date(Date.now() + 30 * 86400000),
        });
        logInfo("Package upgraded via payment", { userId: payment.user, planId });
      }
    }

    const io = getIO();
    if (io) {
      const payload = { checkoutID: checkoutId, receipt, paymentId: payment.id };
      io.to(`user_${payment.user}`).emit("paymentSuccess", payload);
      if (payment.car) io.to(String(payment.car)).emit("paymentSuccess", payload);
    }

    // All authoritative settlement paths have completed successfully. Only
    // now is the callback considered finalized; duplicates remain harmless.
    finalized = true;
    return payment;
  } catch (err) {
    // Unexpected failure before a definitive status was written —
    // release the claim so provider retries can reprocess.
    if (claimedPaymentId && !finalized) {
      await update("payments", claimedPaymentId, { processed: false }).catch((e) =>
        logError("Failed to release payment claim", e, { paymentId: claimedPaymentId }),
      );
    }
    logError("CALLBACK ERROR", err);
    throw err;
  }
};
