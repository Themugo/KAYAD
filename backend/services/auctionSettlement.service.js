import { findById, findOne, create, update } from "../db/index.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { getAuctionPlatformPolicy } from "./auctionPlatformPolicy.service.js";
import { createEscrow } from "./escrow.service.js";

const nowIso = () => new Date().toISOString();

export async function ensureAuctionOutcome({ carId, closeResult, req = null }) {
  const car = await findById("cars", carId);
  if (!car) throw Object.assign(new Error("Vehicle not found"), { status: 404 });
  const setup = await findOne("auction_setups", { car_id: carId });
  if (!setup || setup.publication_status !== "published") throw Object.assign(new Error("Auction setup is not published"), { status: 409 });

  const existing = await findOne("auction_outcomes", { car_id: carId });
  if (existing) return existing;

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
    organizer_id: setup.organizer_id,
    status: isSale ? (settlementMode === "escrow" ? "escrow_pending_funding" : "payment_due") : "no_sale",
    winner_user_id: winner?.user || null,
    winning_bid_id: closeResult?.winnerBidId || null,
    winning_amount: isSale ? amount : 0,
    reserve_met: reserveMet,
    no_sale_reason: isSale ? null : (!winner ? "no_qualifying_bid" : "reserve_not_met"),
    settlement_mode: settlementMode,
    escrow_required: settlementMode === "escrow",
    payment_status: isSale ? "pending" : "not_required",
    payment_due_at: isSale ? new Date(Date.now() + paymentDueHours * 3600000).toISOString() : null,
    reaward_enabled: Boolean(config?.defaultRules?.reawardEnabled),
    collection_status: isSale ? "pending_payment" : "not_applicable",
    transfer_status: isSale ? "pending_payment" : "not_applicable",
  });

  if (isSale && settlementMode === "escrow") {
    const escrow = await createEscrow({
      car: carId,
      buyer: winner.user,
      seller: setup.organizer_id,
      amount,
      payment: null,
      auctionOutcomeId: created.id,
    });
    await update("auction_outcomes", created.id, { escrow_id: escrow.id, status: "escrow_pending_funding" });
    created.escrow_id = escrow.id;
    created.status = "escrow_pending_funding";
  }

  await logActionFromReq(req, "auction_outcome_created", {
    target: carId,
    targetModel: "Car",
    details: { outcomeId: created.id, status: created.status, settlementMode, escrowRequired: created.escrow_required },
  }).catch(() => {});
  return created;
}

export async function getAuctionOutcome(carId) {
  return findOne("auction_outcomes", { car_id: carId });
}

export async function markAuctionPaymentReceived({ outcomeId, paymentId, receipt = null, req = null }) {
  const outcome = await findById("auction_outcomes", outcomeId);
  if (!outcome) throw Object.assign(new Error("Auction outcome not found"), { status: 404 });
  if (outcome.status === "completed" || outcome.payment_status === "paid") return outcome;
  if (outcome.status !== "payment_due") throw Object.assign(new Error("Auction is not awaiting winner payment"), { status: 409 });

  const updated = await update("auction_outcomes", outcome.id, {
    status: outcome.settlement_mode === "escrow" ? "escrow_pending_funding" : "payment_received",
    payment_status: "paid",
    payment_id: paymentId,
    payment_receipt: receipt,
    paid_at: nowIso(),
    collection_status: "ready_for_collection",
    transfer_status: "pending_collection",
  });

  if (outcome.settlement_mode === "direct") {
    await update("cars", outcome.car_id, { sold: true, status: "sold", isPaid: true, paymentStatus: "paid" }).catch(() => {});
  }

  await logActionFromReq(req, "auction_winner_payment_received", {
    target: outcome.car_id,
    targetModel: "Car",
    details: { outcomeId: outcome.id, paymentId, settlementMode: outcome.settlement_mode },
  }).catch(() => {});
  return updated;
}

export async function createOptionalEscrowForOutcome({ outcomeId, actorId, req = null }) {
  const outcome = await findById("auction_outcomes", outcomeId);
  if (!outcome) throw Object.assign(new Error("Auction outcome not found"), { status: 404 });
  if (outcome.settlement_mode !== "escrow" || !outcome.escrow_required) throw Object.assign(new Error("Escrow is not selected for this auction"), { status: 409 });
  if (outcome.payment_status !== "paid") throw Object.assign(new Error("Winner payment must be received before escrow funding"), { status: 409 });
  if (outcome.escrow_id) return outcome;

  const escrow = await create("escrows", {
    car: outcome.car_id,
    buyer: outcome.winner_user_id,
    seller: outcome.organizer_id,
    amount: Number(outcome.winning_amount),
    payment: outcome.payment_id || null,
    status: "pending",
    auctionOutcomeId: outcome.id,
  });
  const updated = await update("auction_outcomes", outcome.id, { escrow_id: escrow.id, status: "escrow_pending_funding" });
  await logActionFromReq(req, "auction_escrow_created", { target: outcome.car_id, targetModel: "Car", details: { outcomeId: outcome.id, escrowId: escrow.id, actorId } }).catch(() => {});
  return updated;
}

export async function defaultAuctionWinner({ outcomeId, actorId, req = null }) {
  const outcome = await findById("auction_outcomes", outcomeId);
  if (!outcome) throw Object.assign(new Error("Auction outcome not found"), { status: 404 });
  if (outcome.status !== "payment_due") throw Object.assign(new Error("Auction is not awaiting winner payment"), { status: 409 });
  if (!outcome.payment_due_at || Date.now() < new Date(outcome.payment_due_at).getTime()) throw Object.assign(new Error("Winner payment deadline has not passed"), { status: 409 });
  const policy = await getAuctionPlatformPolicy();
  const reawardAllowed = Boolean(outcome.reaward_enabled && policy.allowDealerReaward);
  const updated = await update("auction_outcomes", outcome.id, {
    status: reawardAllowed ? "reaward_pending" : "defaulted",
    payment_status: "defaulted",
    defaulted_at: nowIso(),
    defaulted_by: actorId,
    collection_status: "blocked",
    transfer_status: "blocked",
  });
  await logActionFromReq(req, "auction_winner_defaulted", { target: outcome.car_id, targetModel: "Car", details: { outcomeId: outcome.id, reawardAllowed } }).catch(() => {});
  return updated;
}
