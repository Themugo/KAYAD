import { bidderNumber } from "../utils/bidderIdentity.js";
import crypto from "crypto";
import { findById, findOne, create, update } from "../db/index.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { normalizeAuctionSetup, validateConfig } from "./auctionSetup.contract.js";
import { initiateBidSecurity } from "./bidSecurityService.js";
import { createAuctionSecurityHold } from "./auctionFinancialIntegrity.service.js";

const ACTIVE = "active";
const REGISTRATION_STATES = ["not_registered","registration_started","pending_verification","pending_eligibility","pending_commitment","active","suspended","withdrawn","disqualified","expired"];

function normalizeTerms(v) { return String(v || "").trim(); }

async function getContext(auctionId, userId) {
  const [car, setup, user] = await Promise.all([
    findById("cars", auctionId),
    findOne("auction_setups", { car_id: auctionId }),
    findById("users", userId),
  ]);
  return { car, setup, user };
}

function evaluateEligibility(user, config) {
  const req = config.bidderRequirements || {};
  const checks = [
    { id: "phone_verified", required: req.phoneVerified !== false, ok: Boolean(user?.phone && user?.phoneVerified) },
    { id: "email_verified", required: Boolean(req.emailVerified), ok: Boolean(user?.email && user?.emailVerified) },
    { id: "identity_verified", required: Boolean(req.identityVerified), ok: String(user?.verificationStatus || "").toLowerCase() === "verified" || Boolean(user?.identityVerified) },
    { id: "organization_verified", required: Boolean(req.organizationVerified), ok: Boolean(user?.organizationVerified || user?.businessVerified) },
    { id: "account_not_banned", required: true, ok: Boolean(user) && user?.isBanned !== true && !["banned", "suspended", "deactivated"].includes(String(user?.status || "").toLowerCase()) && user?.deactivatedAt == null },
  ];
  const blockers = checks.filter(c => c.required && !c.ok).map(c => c.id);
  return { eligible: blockers.length === 0, blockers, checks };
}

function commitmentRequired(config) { return Boolean(config.commitment?.required); }
function commitmentAmount(config) {
  if (!commitmentRequired(config)) return 0;
  if (config.commitment.type === "percent") return Math.round(Number(config.startingBid || 0) * Number(config.commitment.percent || 0) / 100);
  return Number(config.commitment.amount || 0);
}

export async function getRegistration({ auctionId, userId }) {
  const { car, setup } = await getContext(auctionId, userId);
  if (!car || !setup || setup.publication_status !== "published") return { car, setup, registration: null };
  const registration = await findOne("auction_registrations", { auction_id: auctionId, bidder_id: userId });
  return { car, setup, registration };
}

export async function registerForAuction({ auctionId, userId, body, req }) {
  const { car, setup, user } = await getContext(auctionId, userId);
  if (!car || !setup) throw Object.assign(new Error("Auction is not configured"), { status: 404 });
  if (setup.publication_status !== "published") throw Object.assign(new Error("Auction registration is not open"), { status: 409 });
  const config = normalizeAuctionSetup(setup.config || {});
  const now = Date.now();
  const auctionStatus = String(car.auctionStatus || car.auction_status || "").toLowerCase();
  if (auctionStatus === "live") throw Object.assign(new Error("Bidding room is closed to new bidders. You may watch the live auction only."), { status: 409, code: "AUCTION_BIDDING_ROOM_CLOSED" });
  if (config.registrationDeadline && Date.parse(config.registrationDeadline) < now) throw Object.assign(new Error("Auction registration has closed"), { status: 409, code: "AUCTION_REGISTRATION_CLOSED" });
  if (!config.startsAt || Date.parse(config.startsAt) <= now) throw Object.assign(new Error("Bidding room is closed to new bidders. Registration must be completed before the auction starts."), { status: 409, code: "AUCTION_BIDDING_ROOM_CLOSED" });
  if (String(car.dealer || car.dealer_id) === String(userId)) throw Object.assign(new Error("Auction organizer cannot register as a bidder"), { status: 403 });
  const existing = await findOne("auction_registrations", { auction_id: auctionId, bidder_id: userId });
  if (existing) return { registration: existing, duplicate: true };
  const termsVersion = normalizeTerms(body.termsVersion);
  if (termsVersion !== config.termsVersion || body.acceptTerms !== true) throw Object.assign(new Error("Current auction terms must be explicitly accepted"), { status: 422 });
  const eligibility = evaluateEligibility(user, config);
  const state = eligibility.eligible ? (commitmentRequired(config) ? "pending_commitment" : ACTIVE) : "pending_eligibility";
  const registration = await create("auction_registrations", {
    auction_id: auctionId, bidder_id: userId, status: state, eligibility_status: eligibility.eligible ? "eligible" : "pending",
    eligibility_snapshot: { ...eligibility, capturedAt: new Date().toISOString() },
    terms_version: termsVersion, terms_accepted_at: new Date().toISOString(),
    commitment_required: commitmentRequired(config), commitment_amount: commitmentAmount(config), commitment_status: commitmentRequired(config) ? "pending" : "not_required",
    bidder_number: bidderNumber(userId, auctionId), registration_source: body.source || "web", idempotency_key: body.idempotencyKey || null,
  });
  await create("auction_registration_events", { registration_id: registration.id, event_type: "registered", actor_id: userId, metadata: { state, eligibility } });
  await logActionFromReq(req, "auction_bidder_registered", { target: auctionId, targetModel: "Car", details: { registrationId: registration.id, state } });
  return { registration, eligibility };
}

/**
 * Re-check a previously blocked bidder after they complete profile/identity
 * requirements. This never skips the published terms, auction window, or a
 * configured financial commitment. Only pending_eligibility registrations
 * may be advanced by this member-facing operation.
 */
export async function refreshBidderEligibility({ auctionId, userId, req }) {
  const { car, setup, user } = await getContext(auctionId, userId);
  if (!car || !setup || setup.publication_status !== "published") {
    throw Object.assign(new Error("Auction is not published"), { status: 404, code: "AUCTION_NOT_PUBLISHED" });
  }
  const config = normalizeAuctionSetup(setup.config || {});
  if (String(car.auctionStatus || car.auction_status || "").toLowerCase() === "live"
    || !config.startsAt || Date.parse(config.startsAt) <= Date.now()
    || (config.registrationDeadline && Date.parse(config.registrationDeadline) < Date.now())) {
    throw Object.assign(new Error("The registration window has closed. You can watch this auction, but cannot activate a new bidder pass."), { status: 409, code: "AUCTION_REGISTRATION_CLOSED" });
  }
  const registration = await findOne("auction_registrations", { auction_id: auctionId, bidder_id: userId });
  if (!registration) throw Object.assign(new Error("Register for this auction first"), { status: 404, code: "BIDDER_REGISTRATION_REQUIRED" });
  if (registration.status !== "pending_eligibility") {
    return { registration, unchanged: true };
  }
  const eligibility = evaluateEligibility(user, config);
  if (!eligibility.eligible) {
    const updated = await update("auction_registrations", registration.id, {
      eligibility_status: "pending",
      eligibility_snapshot: { ...eligibility, capturedAt: new Date().toISOString() },
    });
    return { registration: updated, eligibility, unchanged: true };
  }
  const commitmentSatisfied = registration.commitment_status === "satisfied";
  const nextStatus = commitmentRequired(config) && !commitmentSatisfied ? "pending_commitment" : ACTIVE;
  const updated = await update("auction_registrations", registration.id, {
    status: nextStatus,
    eligibility_status: "eligible",
    eligibility_snapshot: { ...eligibility, capturedAt: new Date().toISOString() },
    ...(nextStatus === ACTIVE ? { activated_at: new Date().toISOString() } : {}),
  });
  await create("auction_registration_events", {
    registration_id: registration.id,
    event_type: "eligibility_rechecked",
    actor_id: userId,
    metadata: { state: nextStatus, eligibility },
  });
  await logActionFromReq(req, "auction_bidder_eligibility_rechecked", {
    target: auctionId, targetModel: "Car", details: { registrationId: registration.id, state: nextStatus },
  });
  return { registration: updated, eligibility, activated: nextStatus === ACTIVE };
}

export async function initiateRegistrationCommitment({ auctionId, userId, req }) {
  const { setup, user } = await getContext(auctionId, userId);
  const registration = await findOne("auction_registrations", { auction_id: auctionId, bidder_id: userId });
  if (!registration) throw Object.assign(new Error("Register for the auction first"), { status: 400 });
  if (registration.status === "active") return { registration, alreadyActive: true };
  if (registration.status !== "pending_commitment") throw Object.assign(new Error("Registration is not awaiting commitment"), { status: 409 });
  const config = normalizeAuctionSetup(setup?.config || {});
  const amount = commitmentAmount(config);
  if (!amount || amount <= 0) throw Object.assign(new Error("A fixed commitment amount is required for payment initiation"), { status: 422 });
  const hold = await createAuctionSecurityHold({
    auctionId, bidderId: userId, registrationId: registration.id, holdType: "commitment", amount,
    policySnapshot: { commitmentAmount: amount, creditTowardWinningPayment: true },
  });
  const result = await initiateBidSecurity({ auctionId, userId, phone: user.phone, amount, registrationId: registration.id, holdId: hold.id, holdType: "commitment" });
  if (!result.success) throw Object.assign(new Error(result.message || "Unable to initiate commitment"), { status: 502 });
  await update("auction_registrations", registration.id, { commitment_status: "payment_pending" });
  await create("auction_registration_events", { registration_id: registration.id, event_type: "commitment_initiated", actor_id: userId, metadata: { amount, checkoutID: result.checkoutID } });
  return { ...result, registration: await findById("auction_registrations", registration.id) };
}

export async function finalizeCommitmentRegistration({ checkoutRequestID, success, receipt }) {
  const { findSecurityPaymentByCheckout } = await import("./securityPaymentStore.js");
  const tx = (await findSecurityPaymentByCheckout(checkoutRequestID))?.row;
  const registrationId = tx?.metadata?.auctionRegistrationId;
  if (!registrationId) return null;
  const registration = await findById("auction_registrations", registrationId);
  if (!registration) return null;
  if (!success) { await update("auction_registrations", registration.id, { commitment_status: "failed", status: "pending_commitment" }); return registration; }
  // A provider callback proves that money was received; it does not grant
  // bidder eligibility. Re-read the member and current auction requirements
  // before activating the bidder pass.
  const { setup, user } = await getContext(registration.auction_id, registration.bidder_id);
  if (!setup || setup.publication_status !== "published") {
    return update("auction_registrations", registration.id, {
      commitment_status: "satisfied",
      commitment_transaction_id: tx.id,
      commitment_receipt: receipt || null,
      status: "pending_eligibility",
      eligibility_status: "pending",
    });
  }
  const eligibility = evaluateEligibility(user, normalizeAuctionSetup(setup.config || {}));
  if (!eligibility.eligible) {
    const blockedStatus = eligibility.blockers.includes("account_not_banned") ? "suspended" : "pending_eligibility";
    const updatedBlocked = await update("auction_registrations", registration.id, {
      commitment_status: "satisfied",
      commitment_transaction_id: tx.id,
      commitment_receipt: receipt || null,
      status: blockedStatus,
      eligibility_status: "pending",
      eligibility_snapshot: { ...eligibility, capturedAt: new Date().toISOString() },
    });
    await create("auction_registration_events", {
      registration_id: registration.id,
      event_type: "commitment_confirmed_eligibility_pending",
      actor_id: registration.bidder_id,
      metadata: { transactionId: tx.id, receipt, blockers: eligibility.blockers },
    });
    return updatedBlocked;
  }
  const updated = await update("auction_registrations", registration.id, { commitment_status: "satisfied", commitment_transaction_id: tx.id, commitment_receipt: receipt || null, status: ACTIVE, eligibility_status: "eligible", eligibility_snapshot: { ...eligibility, capturedAt: new Date().toISOString() }, activated_at: new Date().toISOString() });
  await create("auction_registration_events", { registration_id: registration.id, event_type: "commitment_confirmed", actor_id: registration.bidder_id, metadata: { transactionId: tx.id, receipt } });
  return updated;
}

export async function assertBidderAuthorized({ auctionId, userId }) {
  const { setup } = await getContext(auctionId, userId);
  if (!setup || setup.publication_status !== "published") throw Object.assign(new Error("Auction is not published"), { status: 409, code: "AUCTION_NOT_PUBLISHED" });
  const registration = await findOne("auction_registrations", { auction_id: auctionId, bidder_id: userId });
  if (!registration || registration.status !== ACTIVE || registration.eligibility_status !== "eligible") throw Object.assign(new Error("Active auction registration and eligibility are required before bidding"), { status: 403, code: "BIDDER_REGISTRATION_REQUIRED" });
  if (registration.commitment_required && registration.commitment_status !== "satisfied") throw Object.assign(new Error("Auction commitment must be satisfied before bidding"), { status: 403, code: "BIDDER_COMMITMENT_REQUIRED" });
  return registration;
}

export { REGISTRATION_STATES };
