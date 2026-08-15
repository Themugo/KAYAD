import { findById, findOne, findAll, create, update } from "../db/index.js";
import { sendNotification } from "../services/notification.service.js";
import { sendDigitalReceipt } from "../services/receiptService.js";
import { getIO } from "../utils/io.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";
import { getSupabase } from "../utils/supabase.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Added (Phase 6, payment architecture): append-only audit trail via
// the new payment_events table (supabase/migrations/
// 20260815060000_payment_architecture_extension.sql.sql). Deliberately
// fire-and-forget (caught, never awaited-and-thrown) - this is
// observability, not control flow. A failure to write an audit event
// must never be able to fail a real payment callback, the same
// reasoning already applied throughout this file to notifications and
// receipts (see the existing .catch((e) => logWarn(...)) pattern on
// sendNotification/sendDigitalReceipt calls below - this function
// follows that same established convention rather than introducing a
// new one).
const logPaymentEvent = (paymentId, eventType, payload = {}) => {
  create("payment_events", { paymentId, eventType, payload }).catch((e) =>
    logWarn("Payment event log failed", { paymentId, eventType, error: e.message }),
  );
};

// Added (Phase 7): companion to logPaymentEvent, updates the
// payment_attempts row created in paymentService.js's initiatePayment()
// (also Phase 7) to reflect the real outcome once the callback
// resolves. Looked up by checkoutRequestId since that's the value both
// sides share - paymentId isn't known to the attempt-creation code
// path until after the payments row itself is created, so
// checkoutRequestId is the natural join key here, matching how
// payments/mpesa_transactions themselves are already looked up
// throughout this file. Fire-and-forget, same reasoning as
// logPaymentEvent - attempt-status bookkeeping must never be able to
// affect whether a real payment is correctly marked paid/failed.
const updatePaymentAttemptStatus = (checkoutRequestId, status, extra = {}) => {
  findOne("payment_attempts", { checkoutRequestId })
    .then((attempt) => {
      if (attempt) return update("payment_attempts", attempt.id, { status, ...extra });
    })
    .catch((e) => logWarn("Payment attempt status update failed", { checkoutRequestId, status, error: e.message }));
};

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
  try {
    const stk = callbackData.Body?.stkCallback;

    if (!stk) throw new Error("Invalid callback format");

    const checkoutId = stk.CheckoutRequestID;
    const success = stk.ResultCode === 0;

    logPaymentEvent(null, "callback_received", { checkoutId, resultCode: stk.ResultCode });

    // ── Claim payment ──
    const payment = await findOne("payments", { checkoutRequestId: checkoutId, processed: false });

    if (!payment) {
      const existing = await findOne("payments", { checkoutRequestId: checkoutId });
      if (existing && existing.status === "success") {
        logInfo("Callback idempotent: payment already succeeded", { checkoutId });
        logPaymentEvent(existing.id, "duplicate_callback_ignored", { checkoutId });
        return existing;
      }
      logWarn("Payment not found or already claimed", { checkoutId });
      return;
    }

    // Claim this payment
    await update("payments", payment.id, { processed: true });

    if (!success) {
      await update("payments", payment.id, {
        status: "failed",
        resultDesc: stk.ResultDesc || "M-Pesa transaction failed",
      });
      updatePaymentAttemptStatus(checkoutId, "failed", { failureReason: stk.ResultDesc || "M-Pesa transaction failed" });

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

    if (!receipt || !amount) {
      throw new Error("Incomplete M-Pesa metadata");
    }

    if (Number(amount) !== Number(payment.amount)) {
      logPaymentEvent(payment.id, "amount_mismatch_rejected", { expected: payment.amount, received: amount });
      throw new Error("Amount mismatch");
    }

    logPaymentEvent(payment.id, "amount_verified", { amount });

    await update("payments", payment.id, {
      status: "success",
      mpesaReceipt: receipt,
      paidAt: new Date(),
    });

    logPaymentEvent(payment.id, "marked_paid", { receipt });
    updatePaymentAttemptStatus(checkoutId, "success", { providerReference: receipt });

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
            // Fixed (Phase 8): this was an unconditional
            // update("cars", ...) with no protection against a
            // concurrent M-Pesa callback for a different bid on the
            // same car overwriting a genuinely higher confirmed bid -
            // the exact race condition already identified and fixed
            // for the mock-payment path in controllers/bidController.js
            // (see that file's own detailed comment on this same
            // issue), but never applied here, in the real production
            // M-Pesa callback path. Two concurrent successful payments
            // for different bids on the same car could previously
            // result in the lower bid's callback executing last and
            // silently overwriting the car's currentBid/highestBidder
            // with a lower value than a bid that had already been
            // confirmed paid - both bids would show status "paid" in
            // the bids table, but only one (not necessarily the higher
            // one) would be reflected as the car's actual current
            // winning bid. Fixed the same way as the proven mock-path
            // fix: condition the update on currentBid still being at
            // or below this bid's amount, so a second confirmed
            // payment can never regress the car's recorded highest
            // bid. If the conditional update affects zero rows (a
            // higher bid was already recorded), this bid's payment is
            // still correctly marked "paid" above - the buyer isn't
            // charged incorrectly - but the car's displayed
            // current-bid state is protected from ever moving
            // backwards, which is the actual data-integrity property
            // that matters here.
            const sb = getSupabase();
            const { error: raceCheckError } = await sb
              .from("cars")
              .update({ current_bid: bid.amount, highest_bidder_id: bid.user })
              .eq("id", car.id)
              .lte("current_bid", bid.amount);

            if (raceCheckError) {
              logWarn("Bid car-state update failed", { carId: car.id, bidId: bid.id, error: raceCheckError.message });
            }

            if (getIO()) {
              getIO().to(`car_${car.id}`).emit("auctionUpdate", {
                carId: car.id,
                currentBid: bid.amount,
              });
            }
          }

          // Note (Phase 8, found while fixing the race condition above,
          // not addressed here): this queries an "auctions" table that
          // does not exist in the real, authoritative schema
          // (supabase/migrations/..._foundational_tables.sql.sql -
          // auction state is denormalized directly onto cars, per
          // docs/fusion/phase-05-schema-correction.md). This findOne
          // call would return null against a real database (no error,
          // since findOne on a genuinely missing table would fail
          // differently - but no live database exists to confirm the
          // exact failure mode), meaning the subsequent
          // update("auctions", ...) branch is presently unreachable in
          // practice. Not fixed this phase - flagged for the same
          // schema-reconciliation work already tracked elsewhere in
          // this program's documentation, rather than patched in
          // isolation here.
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

      const config = await findOne("platform_config", {});
      const rate = config?.dealerCommission ? config.dealerCommission / 100 : 0.05;
      const commission = Math.round(payment.amount * rate);
      const sellerAmount = payment.amount - commission;
      const newEscrow = await create("escrows", {
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

      logPaymentEvent(payment.id, "escrow_funded", { escrowId: newEscrow?.id });
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

    return payment;
  } catch (err) {
    logError("CALLBACK ERROR", err);
    throw err;
  }
};
