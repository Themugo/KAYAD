import { findById, findOne, findAll, create, update, updateMany } from "../db/index.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "./communicationEvents.service.js";
import { getAuctionPlatformPolicy } from "./auctionPlatformPolicy.service.js";
import { ownershipService } from "../ownership/services/ownershipService.js";
import { openDispute as openEscrowDispute } from "./dispute.service.js";
import { governanceService } from "../governance/services/governanceService.js";
import { releaseEscrow } from "./escrow.service.js";

const nowIso = () => new Date().toISOString();
const error = (message, status = 409, code = null) => Object.assign(new Error(message), { status, ...(code ? { code } : {}) });

const getContext = async (outcomeId) => {
  const outcome = await findById("auction_outcomes", outcomeId);
  if (!outcome) throw error("Auction outcome not found", 404);
  const car = await findById("cars", outcome.car_id);
  const setup = await findById("auction_setups", outcome.auction_setup_id);
  return { outcome, car, setup };
};

const requireOrganizer = (setup, actorId) => {
  if (!setup || String(setup.organizer_id) !== String(actorId)) throw error("Not authorized for this auction", 403);
};

const recordFulfilmentEvent = async ({ outcomeId, eventType, fromStatus = null, toStatus = null, actorId = null, reference = null, notes = null, metadata = {} }) => {
  await create("auction_fulfilment_events", { auction_outcome_id: outcomeId, event_type: eventType, from_status: fromStatus, to_status: toStatus, actor_id: actorId, reference, notes, metadata }).catch(() => {});
};

export async function listAuctionOperations({ organizerId = null, status = null, limit = 100 } = {}) {
  const filters = organizerId ? { organizer_id: organizerId } : {};
  if (status) filters.status = status;
  const outcomes = await findAll("auction_outcomes", { filters, limit: Math.min(Number(limit) || 100, 250), sort: { updated_at: -1 } });
  return Promise.all(outcomes.map(async (outcome) => ({
    ...outcome,
    car: await findById("cars", outcome.car_id),
  })));
}

export async function getAuctionOperationsCase(outcomeId) {
  const { outcome, car, setup } = await getContext(outcomeId);
  return { outcome, car, setup };
}

export async function markAuctionEscrowFunded({ outcomeId, escrowId, fundingReference = null, actorId = null }) {
  const outcome = await findById("auction_outcomes", outcomeId);
  if (!outcome) return null;
  if (String(outcome.escrow_id || "") !== String(escrowId)) return null;
  if (outcome.status === "completed" || outcome.status === "cancelled" || outcome.status === "disputed") return outcome;
  const updated = await update("auction_outcomes", outcome.id, {
    status: "payment_received",
    payment_status: "paid",
    paid_at: outcome.paid_at || nowIso(),
    collection_status: "ready_for_collection",
    transfer_status: "pending_collection",
    payment_receipt: fundingReference || outcome.payment_receipt || null,
  });
  await recordFulfilmentEvent({ outcomeId: outcome.id, eventType: "escrow_funded", fromStatus: outcome.status, toStatus: "payment_received", actorId, reference: fundingReference });
  return updated;
}

export async function markCollection({ outcomeId, actorId, status = "collected", collectionReference = null, notes = null, req = null }) {
  const { outcome, car, setup } = await getContext(outcomeId);
  requireOrganizer(setup, actorId);
  const allowed = ["scheduled", "collected", "failed"];
  if (!allowed.includes(status)) throw error(`Invalid collection status '${status}'`, 400);
  if (["payment_due", "defaulted", "no_sale", "cancelled", "disputed"].includes(outcome.status)) throw error("Collection is not available in the current outcome state");
  if (outcome.payment_status !== "paid" && outcome.settlement_mode !== "escrow") throw error("Winner payment must be settled before collection");
  if (outcome.settlement_mode === "escrow" && outcome.escrow_id && !["funded", "vehicle_confirmed", "delivered", "released"].includes(String((await findById("escrows", outcome.escrow_id))?.status))) {
    throw error("Escrow must be funded before collection");
  }

  const guard = { id: outcome.id, status: outcome.status };
  const guarded = await updateMany("auction_outcomes", guard, {
    collection_status: status,
    collection_reference: collectionReference,
    collection_notes: notes,
    collection_at: status === "collected" ? nowIso() : outcome.collection_at || null,
    collection_updated_by: actorId,
    status: outcome.status === "payment_received" && status === "collected" ? "payment_received" : outcome.status,
  });
  if (!guarded.length) throw error("Auction outcome changed while collection was being updated; retry", 409, "AUCTION_CONCURRENT_UPDATE");
  const updated = guarded[0];

  if (status === "collected") {
    await emitCommunication({
      userId: outcome.winner_user_id,
      eventType: COMMUNICATION_EVENTS.ESCROW_DELIVERY_CONFIRMED,
      title: "Auction vehicle collection recorded",
      message: `${car?.title || "Your auction vehicle"} has been marked as collected. Complete the ownership transfer step to finish the auction fulfilment process.`,
      channels: ["in_app", "email", "sms"],
      metadata: { auctionOutcomeId: outcome.id, carId: outcome.car_id },
    }).catch(() => {});
  }

  await recordFulfilmentEvent({ outcomeId: outcome.id, eventType: "collection_updated", fromStatus: outcome.collection_status, toStatus: status, actorId, reference: collectionReference, notes });
  await logActionFromReq(req, "auction_collection_updated", { target: outcome.car_id, targetModel: "Car", details: { outcomeId: outcome.id, status, actorId, collectionReference } }).catch(() => {});
  return updated;
}

export async function markTransfer({ outcomeId, actorId, status = "completed", transferReference = null, notes = null, req = null }) {
  const { outcome, car, setup } = await getContext(outcomeId);
  const isOrganizer = setup && String(setup.organizer_id) === String(actorId);
  const isWinner = String(outcome.winner_user_id) === String(actorId);
  if (!isOrganizer && !isWinner) throw error("Not authorized for this ownership transfer", 403);
  const allowed = ["initiated", "completed", "failed"];
  if (!allowed.includes(status)) throw error(`Invalid transfer status '${status}'`, 400);
  if (outcome.collection_status !== "collected") throw error("Vehicle collection must be completed before ownership transfer");
  if (outcome.payment_status !== "paid") throw error("Winner payment is not settled");
  if (outcome.settlement_mode === "escrow" && outcome.escrow_id) {
    const escrow = await findById("escrows", outcome.escrow_id);
    if (escrow?.status !== "released") throw error("Escrow must be released before ownership transfer can be completed");
  }
  if (outcome.status === "disputed" || outcome.status === "cancelled" || outcome.status === "defaulted") throw error("Ownership transfer is blocked by the current outcome state");

  let ownerVehicleId = outcome.owner_vehicle_id || null;
  if (status === "completed" && !ownerVehicleId) {
    const vin = car?.vin;
    if (!vin || !outcome.winner_user_id) throw error("Vehicle VIN and winner identity are required to complete ownership transfer");
    const existing = await findOne("owner_vehicles", { owner_id: outcome.winner_user_id, vin, status: "active" });
    const ownerVehicle = existing || await ownershipService.addVehicleToGarage(outcome.winner_user_id, {
      passportId: null,
      vin,
      make: car.brand || car.make || "Unknown",
      model: car.model || "Unknown",
      year: car.year,
      registrationNumber: car.registration_number || car.registrationNumber,
      colour: car.color || car.colour,
      ownershipType: "current",
      purchaseDate: nowIso().slice(0, 10),
      purchasePrice: Number(outcome.winning_amount),
      purchaseMileage: Number(car.mileage || 0),
    });
    ownerVehicleId = ownerVehicle.id;
  }

  const completed = status === "completed";
  const guard = { id: outcome.id, status: outcome.status, collection_status: "collected", payment_status: "paid" };
  const guarded = await updateMany("auction_outcomes", guard, {
    transfer_status: status,
    transfer_reference: transferReference,
    transfer_notes: notes,
    transfer_at: completed ? nowIso() : outcome.transfer_at || null,
    transfer_updated_by: actorId,
    owner_vehicle_id: ownerVehicleId,
    status: completed ? "completed" : outcome.status,
    completed_at: completed ? nowIso() : outcome.completed_at || null,
  });
  if (!guarded.length) throw error("Auction outcome changed while ownership transfer was being updated; retry", 409, "AUCTION_CONCURRENT_UPDATE");
  const updated = guarded[0];

  if (completed) {
    await update("cars", outcome.car_id, {
      sold: true,
      status: "sold",
      allow_bid: false,
      allow_buy: false,
      auction_status: "ended",
      highest_bidder_id: outcome.winner_user_id,
      updated_at: nowIso(),
    }).catch(() => {});
    await emitCommunication({
      userId: outcome.winner_user_id,
      eventType: COMMUNICATION_EVENTS.AUCTION_WON,
      title: "Auction completed",
      message: `${car?.title || "Your auction vehicle"} is now recorded in your KAYAD ownership journey.`,
      channels: ["in_app", "email", "sms", "whatsapp"],
      metadata: { auctionOutcomeId: outcome.id, carId: outcome.car_id, ownerVehicleId },
    }).catch(() => {});
    await emitCommunication({
      userId: outcome.organizer_id,
      eventType: COMMUNICATION_EVENTS.ADMIN_ACTION,
      title: "Auction fulfilment completed",
      message: `${car?.title || "Auction vehicle"} has completed payment, collection and ownership-transfer recording.`,
      channels: ["in_app", "email"],
      metadata: { auctionOutcomeId: outcome.id, carId: outcome.car_id },
    }).catch(() => {});
  }

  await recordFulfilmentEvent({ outcomeId: outcome.id, eventType: "transfer_updated", fromStatus: outcome.transfer_status, toStatus: status, actorId, reference: transferReference, notes, metadata: { ownerVehicleId } });
  await logActionFromReq(req, "auction_transfer_updated", { target: outcome.car_id, targetModel: "Car", details: { outcomeId: outcome.id, status, actorId, ownerVehicleId, transferReference } }).catch(() => {});
  return updated;
}

export async function releaseAuctionEscrowAndComplete({ outcomeId, actorId, req = null }) {
  const { outcome, setup } = await getContext(outcomeId);
  if (!setup || String(setup.organizer_id) !== String(actorId)) throw error("Not authorized for this auction", 403);
  if (outcome.settlement_mode !== "escrow" || !outcome.escrow_id) throw error("This auction does not have an escrow settlement", 409);
  if (outcome.collection_status !== "collected") throw error("Vehicle collection must be completed before escrow release");
  if (outcome.status === "disputed") throw error("Escrow release is blocked while the auction outcome is disputed");
  const escrow = await findById("escrows", outcome.escrow_id);
  if (!escrow) throw error("Auction escrow not found", 404);
  if (escrow.status !== "released") await releaseEscrow(escrow.id, actorId, { idempotencyKey: `auction-release:${outcome.id}` });
  const updated = await update("auction_outcomes", outcome.id, {
    status: outcome.transfer_status === "completed" ? "completed" : "payment_received",
    collection_status: "collected",
    payment_status: "paid",
    escrow_release_at: nowIso(),
  });
  await recordFulfilmentEvent({ outcomeId: outcome.id, eventType: "escrow_released", fromStatus: outcome.status, toStatus: updated.status, actorId, reference: escrow.id });
  await logActionFromReq(req, "auction_escrow_released", { target: outcome.car_id, targetModel: "Car", details: { outcomeId: outcome.id, escrowId: escrow.id, actorId } }).catch(() => {});
  return updated;
}

export async function cancelAuctionOutcome({ outcomeId, actorId, reason, req = null }) {
  const { outcome, setup } = await getContext(outcomeId);
  requireOrganizer(setup, actorId);
  const policy = await getAuctionPlatformPolicy();
  if (!policy.allowDealerCustomCancellationRules) throw error("KAYAD has disabled dealer cancellation controls", 403);
  if (["completed", "defaulted", "cancelled", "disputed"].includes(outcome.status)) throw error("Outcome cannot be cancelled in its current state");
  if (outcome.payment_status === "paid") throw error("A paid auction outcome cannot be cancelled through the dealer control; use the governed refund/dispute process", 409);
  if (outcome.escrow_id) {
    const escrow = await findById("escrows", outcome.escrow_id);
    if (escrow && ["funded", "vehicle_confirmed", "delivered", "released", "disputed"].includes(String(escrow.status))) {
      throw error("A funded or disputed escrow cannot be cancelled through the dealer auction control", 409);
    }
  }
  const updated = await update("auction_outcomes", outcome.id, {
    status: "cancelled",
    cancellation_reason: reason || "Dealer cancellation",
    cancelled_at: nowIso(),
    cancelled_by: actorId,
    collection_status: "blocked",
    transfer_status: "blocked",
  });
  await update("cars", outcome.car_id, { allow_bid: false, auction_status: "ended", sold: false, status: "available" }).catch(() => {});
  await recordFulfilmentEvent({ outcomeId: outcome.id, eventType: "outcome_cancelled", fromStatus: outcome.status, toStatus: "cancelled", actorId, notes: reason });
  await logActionFromReq(req, "auction_outcome_cancelled", { target: outcome.car_id, targetModel: "Car", details: { outcomeId: outcome.id, actorId, reason } }).catch(() => {});
  return updated;
}

export async function openAuctionOutcomeDispute({ outcomeId, actorId, title, description, category = "auction_fulfilment", priority = "normal", req = null }) {
  const { outcome, setup } = await getContext(outcomeId);
  const isParty = String(outcome.winner_user_id) === String(actorId) || String(outcome.organizer_id) === String(actorId);
  if (!isParty) throw error("Only the auction winner or organizer may open a fulfilment dispute", 403);
  if (outcome.status === "completed" && !outcome.escrow_id) throw error("A completed direct settlement requires the governed dispute channel outside the auction completion control");

  let dispute;
  if (outcome.escrow_id) {
    const role = String(outcome.winner_user_id) === String(actorId) ? "buyer" : "seller";
    dispute = await openEscrowDispute({ escrowId: outcome.escrow_id, actorId, role, title, description, category, priority, reason: description });
  } else {
    dispute = await governanceService.createDispute({
      disputeType: "auction_fulfilment",
      complainantId: actorId,
      respondentId: String(actorId) === String(outcome.organizer_id) ? outcome.winner_user_id : outcome.organizer_id,
      subject: title || "Auction fulfilment dispute",
      description: description || "Auction fulfilment dispute",
      listingId: outcome.car_id,
      transactionId: outcome.payment_id || null,
      priority,
      disputedAmount: Number(outcome.winning_amount || 0),
      complainantName: null,
    });
  }
  const updated = await update("auction_outcomes", outcome.id, { status: "disputed", dispute_reference: dispute?.id || dispute?._id || null, dispute_opened_at: nowIso() });
  await recordFulfilmentEvent({ outcomeId: outcome.id, eventType: "dispute_opened", fromStatus: outcome.status, toStatus: "disputed", actorId, reference: dispute?.id || dispute?._id || null, notes: description });
  await logActionFromReq(req, "auction_outcome_disputed", { target: outcome.car_id, targetModel: "Car", details: { outcomeId: outcome.id, actorId, disputeId: dispute?.id || dispute?._id || null } }).catch(() => {});
  return { outcome: updated, dispute };
}

export async function reawardAuctionOutcome({ outcomeId, actorId, req = null }) {
  const { outcome, car, setup } = await getContext(outcomeId);
  requireOrganizer(setup, actorId);
  if (outcome.status !== "reaward_pending") throw error("This auction is not awaiting re-award");
  if (!outcome.reaward_enabled) throw error("Dealer re-award is disabled for this auction");
  const policy = await getAuctionPlatformPolicy();
  if (!policy.allowDealerReaward) throw error("KAYAD has disabled dealer re-award", 403);

  const previousWinner = outcome.winner_user_id;
  const candidates = await findAll("bids", { filters: { car_id: outcome.car_id, status: "lost" }, limit: 500, sort: { amount: -1, created_at: 1 } });
  const reserveMode = car?.reserve_mode || "none";
  const reservePrice = Number(car?.reserve_price || 0);
  const candidate = candidates.find((bid) => String(bid.user_id) !== String(previousWinner) && (reserveMode !== "hard" || !reservePrice || Number(bid.amount) >= reservePrice));
  if (!candidate) throw error("No eligible losing bidder meeting the auction reserve is available for re-award", 409, "AUCTION_NO_REAWARD_CANDIDATE");

  const claimedBid = await updateMany("bids", { id: candidate.id, status: "lost" }, { status: "won" });
  if (!claimedBid.length) throw error("The selected re-award candidate was already claimed; retry", 409, "AUCTION_REAWARD_CONCURRENT");

  const nextStatus = outcome.settlement_mode === "escrow" ? "escrow_pending_funding" : "payment_due";
  const guarded = await updateMany("auction_outcomes", { id: outcome.id, status: "reaward_pending", reaward_enabled: true }, {
    status: nextStatus,
    winner_user_id: candidate.user_id,
    winning_bid_id: candidate.id,
    winning_amount: Number(candidate.amount),
    payment_status: "pending",
    payment_id: null,
    payment_receipt: null,
    payment_due_at: new Date(Date.now() + Number(setup.config?.paymentDeadlineHours || 24) * 3600000).toISOString(),
    defaulted_at: null,
    defaulted_by: null,
    reaward_count: Number(outcome.reaward_count || 0) + 1,
    collection_status: "pending_payment",
    transfer_status: "pending_payment",
    completed_at: null,
    dispute_reference: null,
    dispute_opened_at: null,
  });
  if (!guarded.length) {
    await update("bids", candidate.id, { status: "lost" }).catch(() => {});
    throw error("Auction re-award changed while being processed; retry", 409, "AUCTION_REAWARD_CONCURRENT");
  }
  const updated = guarded[0];

  await emitCommunication({
    userId: candidate.user_id,
    eventType: COMMUNICATION_EVENTS.AUCTION_WON,
    title: "Auction re-awarded to you",
    message: `The previous winner did not complete settlement. ${car?.title || "The vehicle"} has been re-awarded to you at KES ${Number(candidate.amount).toLocaleString("en-KE")}.`,
    channels: ["in_app", "email", "sms", "whatsapp"],
    metadata: { auctionOutcomeId: outcome.id, carId: outcome.car_id, reawardCount: Number(outcome.reaward_count || 0) + 1 },
  }).catch(() => {});
  await recordFulfilmentEvent({ outcomeId: outcome.id, eventType: "reawarded", fromStatus: outcome.status, toStatus: updated.status, actorId, metadata: { previousWinner, newWinner: candidate.user_id, newBidId: candidate.id } });
  await logActionFromReq(req, "auction_outcome_reawarded", { target: outcome.car_id, targetModel: "Car", details: { outcomeId: outcome.id, actorId, newWinner: candidate.user_id, newBidId: candidate.id } }).catch(() => {});
  return updated;
}
