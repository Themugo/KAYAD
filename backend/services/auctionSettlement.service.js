import { findById, findOne, create, update } from "../db/index.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { getAuctionPlatformPolicy } from "./auctionPlatformPolicy.service.js";
import { createEscrow } from "./escrow.service.js";
import { reconcileAuctionSecurityHolds, forfeitAuctionWinnerSecurityHolds } from "./auctionFinancialIntegrity.service.js";
import { getSupabase } from "../utils/supabase.js";
import { atomicSettleAuctionWinnerPayment, atomicDefaultAuctionWinner } from "../utils/atomicTransactions.js";

const nowIso = () => new Date().toISOString();
const policyAllowsCommitmentCredit = (config) => config?.commitment?.creditTowardWinningPayment !== false;

export async function ensureAuctionOutcome({ carId, closeResult, req = null }) {
  const car = await findById("cars", carId);
  if (!car) throw Object.assign(new Error("Vehicle not found"), { status: 404 });
  const setup = await findOne("auction_setups", { car_id: carId });
  if (!setup || setup.publicationStatus !== "published") throw Object.assign(new Error("Auction setup is not published"), { status: 409 });

  const existing = await findOne("auction_outcomes", { car_id: carId });
  if (existing) {
    if (existing.securityReconciliationStatus !== "reconciled" && existing.status !== "no_sale" && existing.winnerUserId) {
      try {
        await reconcileAuctionSecurityHolds({ auctionId: carId, outcomeId: existing.id, winnerUserId: existing.winnerUserId });
        const winnerCommitment = await findOne("auction_security_holds", { auction_id: carId, bidder_id: existing.winnerUserId, hold_type: "commitment", status: "applied" });
        const applied = winnerCommitment && policyAllowsCommitmentCredit(setup.config || {}) ? Math.min(Number(winnerCommitment.amount || 0), Number(existing.winningAmount || 0)) : 0;
        return update("auction_outcomes", existing.id, {
          commitment_applied_amount: applied,
          payment_due_amount: Math.max(0, Number(existing.winningAmount || 0) - applied),
          security_reconciliation_status: "reconciled",
          security_reconciled_at: nowIso(),
        });
      } catch (_) {
        return existing;
      }
    }
    return existing;
  }

  const config = setup.config || {};
  const winner = closeResult?.winner || null;
  const amount = Number(closeResult?.finalBid || 0);
  const reserveMet = closeResult?.reserveMet !== false;
  const paymentDueHours = Number(config.paymentDeadlineHours || 24);
  const settlementMode = config?.settlement?.mode === "escrow" ? "escrow" : "direct";
  const isSale = Boolean(winner && reserveMet && amount > 0);
  const created = await create("auction_outcomes", {
    car_id: carId,
    auction_setup_id: setup.id,
    organizer_id: setup.organizerId,
    // Every sale enters payment_due first. Escrow funding is a subsequent
    // state after the winner payment is actually received/verified.
    status: isSale ? "payment_due" : "no_sale",
    winner_user_id: winner?.user || null,
    winning_bid_id: closeResult?.winnerBidId || null,
    winning_amount: isSale ? amount : 0,
    reserve_met: reserveMet,
    no_sale_reason: isSale ? null : (!winner ? "no_qualifying_bid" : "reserve_not_met"),
    settlement_mode: settlementMode,
    escrow_required: settlementMode === "escrow",
    payment_status: isSale ? "pending" : "not_required",
    payment_due_at: isSale ? new Date(Date.now() + paymentDueHours * 3600000).toISOString() : null,
    payment_due_amount: isSale ? amount : 0,
    commitment_applied_amount: 0,
    security_reconciliation_status: "pending",
    reaward_enabled: Boolean(config?.defaultRules?.reawardEnabled),
    collection_status: isSale ? "pending_payment" : "not_applicable",
    transfer_status: isSale ? "pending_payment" : "not_applicable",
  });

  if (isSale) {
    try {
      await reconcileAuctionSecurityHolds({ auctionId: carId, outcomeId: created.id, winnerUserId: winner?.user || null });
      const winnerCommitment = winner?.user
        ? await findOne("auction_security_holds", { auction_id: carId, bidder_id: winner.user, hold_type: "commitment", status: "applied" })
        : null;
      const applied = winnerCommitment && policyAllowsCommitmentCredit(config) ? Math.min(Number(winnerCommitment.amount || 0), amount) : 0;
      const reconciled = await update("auction_outcomes", created.id, {
        commitment_applied_amount: applied,
        payment_due_amount: Math.max(0, amount - applied),
        security_reconciliation_status: "reconciled",
        security_reconciled_at: nowIso(),
      });
      Object.assign(created, reconciled || {});
    } catch (securityError) {
      await update("auction_outcomes", created.id, { security_reconciliation_status: "needs_external_refund" }).catch(() => {});
      throw securityError;
    }
  }

  await logActionFromReq(req, "auction_outcome_created", {
    target: carId,
    targetModel: "Car",
    details: { outcomeId: created.id, status: created.status, settlementMode, escrowRequired: created.escrowRequired },
  }).catch(() => {});
  return created;
}

export async function getAuctionOutcome(carId) {
  return findOne("auction_outcomes", { car_id: carId });
}

export async function markAuctionPaymentReceived({ outcomeId, paymentId, receipt = null, req = null }) {
  const outcome = await findById("auction_outcomes", outcomeId);
  if (!outcome) throw Object.assign(new Error("Auction outcome not found"), { status: 404 });
  if (outcome.status === "completed" || outcome.paymentStatus === "paid") return outcome;

  const payment = await findById("payments", paymentId);
  if (!payment || payment.type !== "auction_win") throw Object.assign(new Error("Invalid auction winner payment"), { status: 409 });
  const expectedAmount = Number(outcome.paymentDueAmount ?? outcome.winningAmount);

  // The authoritative check (current status, winner identity, amount match)
  // now happens inside kayad_settle_auction_winner_payment_atomic against a
  // row-locked read, not against the plain findById() above — that earlier
  // read is only used to short-circuit the obvious already-settled case and
  // to look up the payment record. See 20261007190000_auction_winner_payment_deadline_lock.sql:
  // without the DB-side lock, this transition could race
  // defaultAuctionWinner() for the same outcome (the "winner payment +
  // deadline" concurrency pair) and both apply to the same sale.
  let settled;
  try {
    settled = await atomicSettleAuctionWinnerPayment({
      outcomeId: outcome.id,
      paymentId,
      winnerUserId: outcome.winnerUserId,
      expectedAmount,
      actualAmount: Number(payment.amount),
      receipt,
    });
  } catch (e) {
    const status = /not awaiting winner payment|deadline/i.test(e.message) ? 409
      : /does not belong to the auction winner/i.test(e.message) ? 403
      : /amount does not match/i.test(e.message) ? 409
      : 500;
    throw Object.assign(new Error(e.message), { status });
  }
  if (settled.idempotent) return findById("auction_outcomes", outcome.id);
  const updated = await findById("auction_outcomes", outcome.id);

  // Direct auction settlement still needs an auditable seller payable because
  // KAYAD's M-Pesa collection rail receives the buyer payment first. The
  // existing seller-payout/ledger infrastructure remains the authority for
  // subsequent disbursement.
  if (outcome.settlementMode === "direct") {
    const { data: ledgerEntry, error: ledgerError } = await getSupabase().rpc("kayad_post_ledger_entry_atomic", {
      p_external_reference: `auction-payment:${paymentId}`,
      p_user_id: outcome.winnerUserId,
      p_amount: expectedAmount,
      p_currency: "KES",
      p_source: "auction_payment",
      p_destination: "seller_payable",
      p_description: "Auction winner payment received — seller payable",
      p_metadata: { auctionOutcomeId: outcome.id, paymentId, carId: outcome.carId, receipt },
      p_debit_account_code: "1000",
      p_credit_account_code: "5000",
    });
    if (ledgerError) throw ledgerError;
    updated.ledgerEntry = ledgerEntry;
  }

  if (outcome.settlementMode === "direct") {
    await update("cars", outcome.carId, { sold: true, status: "sold", isPaid: true, paymentStatus: "paid" }).catch(() => {});
  }

  await logActionFromReq(req, "auction_winner_payment_received", {
    target: outcome.carId,
    targetModel: "Car",
    details: { outcomeId: outcome.id, paymentId, settlementMode: outcome.settlementMode },
  }).catch(() => {});
  return updated;
}

export async function createOptionalEscrowForOutcome({ outcomeId, actorId, req = null }) {
  const outcome = await findById("auction_outcomes", outcomeId);
  if (!outcome) throw Object.assign(new Error("Auction outcome not found"), { status: 404 });
  if (outcome.settlementMode !== "escrow" || !outcome.escrowRequired) throw Object.assign(new Error("Escrow is not selected for this auction"), { status: 409 });
  if (outcome.paymentStatus !== "paid") throw Object.assign(new Error("Winner payment must be received before escrow funding"), { status: 409 });
  if (outcome.escrowId) return outcome;

  const escrow = await create("escrows", {
    car: outcome.carId,
    buyer: outcome.winnerUserId,
    seller: outcome.organizerId,
    amount: Number(outcome.paymentDueAmount ?? outcome.winningAmount),
    payment: outcome.paymentId || null,
    status: "pending",
    auctionOutcomeId: outcome.id,
  });
  const updated = await update("auction_outcomes", outcome.id, { escrow_id: escrow.id, status: "escrow_pending_funding" });
  await logActionFromReq(req, "auction_escrow_created", { target: outcome.carId, targetModel: "Car", details: { outcomeId: outcome.id, escrowId: escrow.id, actorId } }).catch(() => {});
  return updated;
}

export async function defaultAuctionWinner({ outcomeId, actorId, req = null }) {
  const outcome = await findById("auction_outcomes", outcomeId);
  if (!outcome) throw Object.assign(new Error("Auction outcome not found"), { status: 404 });
  const policy = await getAuctionPlatformPolicy();
  const reawardAllowed = Boolean(outcome.reawardEnabled && policy.allowDealerReaward);

  // kayad_default_auction_winner_atomic re-validates status/deadline against
  // a row-locked read — see markAuctionPaymentReceived's comment and
  // 20261007190000_auction_winner_payment_deadline_lock.sql. This is the
  // other half of the same race: without the lock, a payment confirmed at
  // nearly the same moment as this deadline sweep could both be applied to
  // the same outcome.
  let result;
  try {
    result = await atomicDefaultAuctionWinner({ outcomeId: outcome.id, actorId, reawardAllowed });
  } catch (e) {
    const status = /not awaiting winner payment|deadline has not passed/i.test(e.message) ? 409 : 500;
    throw Object.assign(new Error(e.message), { status });
  }
  if (result.idempotent) return findById("auction_outcomes", outcome.id);
  if (!reawardAllowed) {
    await forfeitAuctionWinnerSecurityHolds({ outcomeId: outcome.id, actorId });
  }
  await logActionFromReq(req, "auction_winner_defaulted", { target: outcome.carId, targetModel: "Car", details: { outcomeId: outcome.id, reawardAllowed } }).catch(() => {});
  return findById("auction_outcomes", outcome.id);
}
