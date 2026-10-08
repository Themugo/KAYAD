// backend/controllers/paymentController.js

import crypto from "node:crypto";
import { findOne, findById } from "../db/index.js";
import { isValidId } from "../utils/validateId.js";
import { initiatePayment as initiate } from "../services/paymentService.js";
import { getAuctionFinancialPolicy } from "../services/auctionFinancialIntegrity.service.js";
import { handleMpesaCallback } from "../services/paymentCallback.service.js";
import { logInfo } from "../utils/logger.js";
import { logError } from "../infrastructure/logging/index.js";
import { findAll, count } from "../db/index.js";

// =============================
// 📲 INITIATE PAYMENT (Phase 2 Transaction Support)
// =============================
export const initiatePayment = async (req, res) => {
  try {
    const { phone, amount, carId, type } = req.body;

    if (!phone || !amount || !type) {
      return res.status(400).json({
        success: false,
        message: "Phone, amount and type required",
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    // Minimum payment: KES 1 (M-Pesa minimum is 1)
    if (parsedAmount < 1) {
      return res.status(400).json({
        success: false,
        message: "Minimum payment is KES 1",
      });
    }

    // Settlement mode is selected by the published auction/dealer configuration.
    // KAYAD does not silently convert direct settlement into escrow.
    const normalizedType = type === "buy" || type === "direct" ? "purchase" : type;

    // Vehicle escrow is funded into the administrator-configured custody
    // bank account. M-Pesa STK is not a vehicle escrow rail because the
    // transaction value may exceed provider limits.
    if (normalizedType === "escrow") {
      return res.status(400).json({
        success: false,
        message: "Vehicle escrow funding uses the configured bank-transfer custody flow, not M-Pesa STK",
      });
    }

    // Amount integrity: for vehicle escrow payments the settlement
    // amount is derived server-side from the car record — the winning
    // bid when this user won the auction, otherwise the listing price.
    // A client-supplied amount must match it exactly; it never
    // determines settlement on its own.
    let settlementAmount = parsedAmount;
    if ((normalizedType === "escrow" || normalizedType === "auction_win" || normalizedType === "purchase") && carId) {
      const carForAmount = await findById("cars", carId, "price,winner");
      if (!carForAmount) {
        return res.status(404).json({ success: false, message: "Car not found" });
      }
      const winnerUser = carForAmount.winner?.user?.toString?.() || carForAmount.winner?.user;
      const winnerAmount = Number(carForAmount.winner?.amount);
      const serverAmount =
        winnerUser && winnerUser === req.user.id && Number.isFinite(winnerAmount) && winnerAmount > 0
          ? winnerAmount
          : Number(carForAmount.price);

      if (!Number.isFinite(serverAmount) || serverAmount <= 0) {
        return res.status(400).json({ success: false, message: "Cannot determine a valid settlement amount for this vehicle" });
      }
      if (parsedAmount !== serverAmount) {
        logError("Payment amount mismatch — client amount rejected", null, {
          userId: req.user.id,
          carId,
          clientAmount: parsedAmount,
          serverAmount,
        });
        return res.status(400).json({
          success: false,
          message: "Amount does not match the server-determined amount for this vehicle",
        });
      }
      settlementAmount = serverAmount;
    }

    // STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE FIX: this endpoint
    // (POST /api/payments/initiate) is a generic, directly-callable,
    // customer-authenticated route. The amount-integrity guard above only
    // ever covered type ∈ {escrow, auction_win, purchase}. For every other
    // accepted `type` value - "bid", "listing", "subscription", "deposit" -
    // `settlementAmount` fell through unchanged as `parsedAmount`, the raw
    // client-supplied number, which was then passed straight to `initiate()`
    // and becomes the real M-Pesa STK amount charged. Concretely, any
    // authenticated user could POST {type:"bid", carId, amount: 1, phone}
    // directly to this endpoint and create a real "bid" payment for
    // whatever amount they chose, completely bypassing
    // bidController.js::placeBid's own, separate call path (which never
    // goes through this HTTP controller at all - it calls the
    // `initiatePayment` *service* function directly) along with every one
    // of its gates: the configured `bidConfirmationFeeKes` policy, the
    // auction-live check, and the registration/eligibility check.
    //
    // "bid" has a real, already-canonical, server-side authoritative
    // amount - the same `getAuctionFinancialPolicy().bidConfirmationFeeKes`
    // constant bidController.js already enforces - so it's folded into the
    // same amount-integrity pattern used above for escrow/purchase/
    // auction_win: the client amount must match the server value exactly.
    //
    // "listing", "subscription" and "deposit" have no authoritative
    // server-side amount anywhere in this codebase at all (confirmed: no
    // listing-fee/subscription-plan-price/deposit-amount lookup exists), and
    // no current frontend caller ever sends these types to this endpoint
    // (confirmed via grep across src/) - they are an unimplemented, dead
    // customer-facing surface, not a real feature regressing here. Per this
    // stage's change discipline ("do not rewrite the payment system", "do
    // not introduce a new abstraction merely to conceal an existing
    // mismatch"), inventing a fee computation for them now would be
    // designing new business logic, not fixing an existing one. The correct,
    // minimal, fail-closed fix is to refuse a client-trusted amount for
    // these types here until a dedicated, server-computed flow for them is
    // built - exactly as "escrow" is already refused above with a
    // dedicated-flow message, not silently allowed through.
    if (normalizedType === "bid" && carId) {
      const policy = await getAuctionFinancialPolicy();
      const serverAmount = Number(policy.bidConfirmationFeeKes);
      if (!Number.isFinite(serverAmount) || serverAmount <= 0) {
        return res.status(400).json({ success: false, message: "Cannot determine the server-configured bid confirmation fee" });
      }
      if (parsedAmount !== serverAmount) {
        logError("Payment amount mismatch — client amount rejected", null, {
          userId: req.user.id,
          carId,
          type: normalizedType,
          clientAmount: parsedAmount,
          serverAmount,
        });
        return res.status(400).json({
          success: false,
          message: "Amount does not match the server-determined bid confirmation fee",
        });
      }
      settlementAmount = serverAmount;
    } else if (["listing", "subscription", "deposit"].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "This payment type is not available through this endpoint yet",
      });
    }

    if (normalizedType === "auction_win" && carId) {
      const setup = await findOne("auction_setups", { car_id: carId });
      const configuredMode = setup?.config?.settlement?.mode || "direct";
      if (configuredMode === "escrow") {
        return res.status(409).json({ success: false, code: "AUCTION_ESCROW_SELECTED", message: "This auction requires its configured escrow settlement flow." });
      }
    }

    const result = await initiate({
      userId: req.user.id,
      carId,
      type: normalizedType,
      amount: settlementAmount,
      phone,
    });

    // Create Escrow record for private sellers (individual_seller) - MANDATORY
    // Private sellers cannot disable escrow; it's enforced for all their transactions
    if (normalizedType === "escrow" && result.payment?.id) {
      const car = await findById("cars", carId, "escrowEnabled,dealer");
      const sellerUser = car ? await findById("users", car.dealer, "role,escrowApproved,escrowForced") : null;
      const isPrivateSeller = sellerUser && sellerUser.role === "individual_seller";
      const dealerCanEscrow = sellerUser && sellerUser.role === "dealer" && car.escrowEnabled && (sellerUser.escrowApproved || sellerUser.escrowForced);
      const useEscrow = isPrivateSeller || dealerCanEscrow;

      if (car && useEscrow) {
        const { create: createEscrow } = await import("../db/index.js");
        const escrow = await createEscrow("escrows", {
          car: carId,
          buyer: req.user.id,
          seller: car.dealer,
          amount: settlementAmount,
          payment: result.payment.id,
          status: "pending",
        });

        // Create or update lead from escrow
        try {
          const { findOrCreateLeadFromEscrow, updateLeadStage } = await import("../services/leadService.js");
          const lead = await findOrCreateLeadFromEscrow(escrow.id);
          await updateLeadStage(lead.id, "escrow_started", car.dealer);
        } catch (leadErr) {
          console.warn("⚠️ Failed to update lead from escrow:", leadErr.message);
        }

        result.escrowId = escrow.id;
      }
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    logError("INITIATE ERROR", err);

    res.status(500).json({
      success: false,
      message: err.message || "Payment initiation failed",
    });
  }
};

// =============================
// 📥 MPESA CALLBACK (with retry)
// =============================
export const mpesaCallback = async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback || req.body?.stkCallback;

    if (!callback) {
      throw new Error("Invalid callback format");
    }

    const existing = await findOne("payments", {
      checkoutRequestId: callback.CheckoutRequestID,
    });

    if (existing?.status === "success") {
      return res.json({ success: true });
    }

    await handleMpesaCallback(req.body);

    return res.json({ success: true });
  } catch (err) {
    logError("CALLBACK ERROR", err);
    return res.status(500).json({ success: false, message: err.message || "Callback processing failed" });
  }
};

// =============================
// 💸 B2C CALLBACK
// =============================
export const b2cCallback = async (req, res) => {
  try {
    const { handleB2CCallback } = await import("../services/mpesaB2C.service.js");
    const result = await handleB2CCallback(req.body);
    const { getSupabase } = await import("../utils/supabase.js");
    const sb = getSupabase();
    const conversationId = result.conversationID;
    if (conversationId) {
      const { data: payout } = await sb.from("dealer_payouts").select("id,status").eq("conversation_id", conversationId).maybeSingle();
      if (payout) {
        const { data: payoutForVerification, error: payoutReadError } = await sb
          .from("dealer_payouts")
          .select("id,status,net_amount")
          .eq("id", payout.id)
          .maybeSingle();
        if (payoutReadError) throw payoutReadError;

        if (result.success && payoutForVerification) {
          const providerAmount = Number(result.amount);
          const expectedAmount = Number(payoutForVerification.net_amount);
          if (!Number.isFinite(providerAmount) || Math.round(providerAmount * 100) !== Math.round(expectedAmount * 100)) {
            await sb.rpc("kayad_mark_dealer_payout_atomic", {
              p_payout: payout.id,
              p_status: "failed",
              p_conversation_id: conversationId,
              p_transaction_id: result.transactionId || null,
              p_failure_reason: `Provider amount mismatch: expected ${expectedAmount}, received ${providerAmount}`,
            });
            throw new Error("M-Pesa B2C amount mismatch");
          }
        }

        await sb.rpc("kayad_mark_dealer_payout_atomic", {
          p_payout: payout.id,
          p_status: result.success ? "paid" : "failed",
          p_conversation_id: conversationId,
          p_transaction_id: result.transactionId || null,
          p_failure_reason: result.success ? null : (result.resultDesc || "M-Pesa B2C payout failed"),
        });
        if (result.success) {
          const { recordDealerPayout } = await import("../services/ledgerService.js");
          const { emitCommunication, COMMUNICATION_EVENTS } = await import("../services/communicationEvents.service.js");
          const { data: paidPayout } = await sb.from("dealer_payouts").select("id,dealer,net_amount,status,escrow").eq("id", payout.id).maybeSingle();
          if (paidPayout?.status === "paid" && Number(paidPayout.net_amount) > 0) {
            await recordDealerPayout({
              payout_id: paidPayout.id,
              user_id: paidPayout.dealer,
              amount: Number(paidPayout.net_amount),
            });
            await emitCommunication({
              userId: paidPayout.dealer,
              eventType: COMMUNICATION_EVENTS.ESCROW_PAYOUT_COMPLETED,
              title: "Seller payout completed",
              message: `Your KAYAD escrow payout of KES ${Number(paidPayout.net_amount).toLocaleString("en-KE")} has been confirmed by the payment provider.`,
              channels: ["in_app", "email", "sms"],
              metadata: { payoutId: paidPayout.id, escrowId: paidPayout.escrow || null },
            }).catch((e) => logError("Payout completion notification failed", e));
          }
        }
      } else {
        // Unknown provider callbacks are not silently discarded. Persist the
        // raw provider event for reconciliation/manual investigation. This
        // table is service-role controlled and is already the canonical raw
        // webhook boundary used elsewhere in KAYAD.
        const rawPayload = req.body || {};
        const dedupeKey = `mpesa_b2c:${conversationId}:${result.transactionId || "none"}:${crypto
          .createHash("sha256")
          .update(JSON.stringify(rawPayload))
          .digest("hex")}`;
        await sb.from("webhook_events").upsert({
          event_source: "mpesa_daraja_b2c",
          dedupe_key: dedupeKey,
          raw_payload: rawPayload,
          processed: false,
          processing_error: "No canonical dealer payout matched provider ConversationID",
          received_at: new Date().toISOString(),
        }, { onConflict: "dedupe_key", ignoreDuplicates: true });
        logError("Unknown M-Pesa B2C payout callback", { conversationId, transactionId: result.transactionId || null });
      }
    }
    if (result.success) {
      logInfo("B2C disbursement succeeded", {
        conversationID: result.conversationID,
        transactionId: result.transactionId,
        amount: result.amount,
      });
    }
    return res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err) {
    logError("B2C CALLBACK ERROR", err);
    return res.json({ ResultCode: 1, ResultDesc: "Processing failed" });
  }
};

// =============================
// ⏱️ B2C TIMEOUT
// =============================
export const b2cTimeout = async (req, res) => {
  try {
    const result = req.body?.Result || {};
    const conversationId = String(result.ConversationID || "").trim();
    if (conversationId) {
      const { getSupabase } = await import("../utils/supabase.js");
      const sb = getSupabase();
      const { data: payout } = await sb
        .from("dealer_payouts")
        .select("id,status,metadata")
        .eq("conversation_id", conversationId)
        .maybeSingle();
      if (payout) {
        await sb.from("dealer_payouts").update({
          metadata: {
            ...(payout.metadata || {}),
            providerTimeoutObservedAt: new Date().toISOString(),
            providerTimeoutPayload: result,
          },
          updated_at: new Date().toISOString(),
        }).eq("id", payout.id);
      }
    }
    console.warn("B2C timeout received", { conversationId: conversationId || null });
  } catch (err) {
    logError("B2C TIMEOUT persistence failed", err);
  }
  // A provider timeout is ambiguous: do not mark the payout failed because
  // the provider may still complete it. Leave it processing for reconciliation.
  return res.json({ ResultCode: 0, ResultDesc: "Timeout acknowledged" });
};

// =============================
// 🔍 CHECK PAYMENT STATUS
// =============================
export const checkPaymentStatus = async (req, res) => {
  try {
    const payment = await findOne("payments", {
      checkoutRequestId: req.params.id,
    });

    if (!payment) {
      return res.json({
        success: false,
        status: "not_found",
      });
    }

    // 🔒 SECURITY CHECK
    // STAGE 4 ACCOUNT/SESSION/IDENTITY CONVERGENCE FIX: this previously
    // read `payment.user && payment.user.toString() !== req.user.id && ...`
    // — when `payment.user` was itself falsy (a legacy/edge-case payment
    // record with no user attached), the whole `&&` chain short-circuited
    // to `false` and the entire ownership check was SKIPPED, returning the
    // full payment object (amount, phone, mpesaReceipt, metadata) to
    // *any* authenticated user who supplied/guessed that checkoutRequestId
    // — fail-open rather than fail-closed. `getPaymentById` (this
    // controller, below) and `getEscrowById` already do fetch-then-
    // authorize correctly with an explicit deny; this endpoint is brought
    // into line with that same pattern: ownership is now a positive
    // assertion (`isOwner`), and anyone who isn't the recorded owner *and*
    // isn't staff is denied, including when the payment record has no
    // owner on file at all.
    const isOwner = !!(payment.user && req.user && payment.user.toString() === req.user.id);
    const isStaff = req.user?.role === "admin" || req.user?.effectiveRole === "webhoist";
    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.json({
      success: true,
      status: payment.status,
      payment,
    });
  } catch (err) {
    logError("STATUS ERROR", err);

    res.status(500).json({
      success: false,
      message: "Status check failed",
    });
  }
};

// =============================
// 📄 GET USER PAYMENTS
// =============================
export const getUserPayments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filters = { user: req.user.id };
    const VALID_STATUSES = ["pending", "success", "failed", "cancelled"];
    const VALID_TYPES = ["bid", "auction_win", "buy", "listing", "subscription", "escrow"];
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) filters.status = req.query.status;
    if (req.query.type && VALID_TYPES.includes(req.query.type)) filters.type = req.query.type;
    const [payments, total] = await Promise.all([
      findAll("payments", {
        filters,
        select: "id user car amount type phone status mpesaReceipt checkoutRequestId createdAt updatedAt referenceId referenceModel mode processed paidAt metadata platformFee dealerAmount",
        orderBy: "createdAt",
        ascending: false,
        limit,
        offset: skip,
      }),
      count("payments", filters),
    ]);
    res.json({ success: true, payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logError("USER PAYMENTS ERROR", err);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

// =============================
// 📊 ADMIN: GET ALL PAYMENTS
// =============================
export const getAllPayments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const filters = {};
    const VALID_STATUSES = ["pending", "success", "failed", "cancelled"];
    const VALID_TYPES = ["bid", "auction_win", "buy", "listing", "subscription", "escrow"];
    if (req.query.status && VALID_STATUSES.includes(req.query.status)) filters.status = req.query.status;
    if (req.query.type && VALID_TYPES.includes(req.query.type)) filters.type = req.query.type;
    const [payments, total] = await Promise.all([
      findAll("payments", {
        filters,
        select: "id user car amount type phone status mpesaReceipt checkoutRequestId createdAt updatedAt referenceId referenceModel mode processed paidAt metadata platformFee dealerAmount",
        orderBy: "createdAt",
        ascending: false,
        limit,
        offset: skip,
      }),
      count("payments", filters),
    ]);
    res.json({ success: true, payments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    logError("ALL PAYMENTS ERROR", err);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

// =============================
// 🔍 GET SINGLE PAYMENT
// =============================
export const getPaymentById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid payment ID" });
    }

    const payment = await findById("payments", req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // 🔒 SECURITY CHECK — only owner or admin can view
    const STAFF = ["admin", "superadmin", "escrow_officer", "accounts"];
    if (req.user && payment.user && payment.user.toString() !== req.user.id && !STAFF.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this payment",
      });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (err) {
    logError("GET PAYMENT ERROR", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
};
