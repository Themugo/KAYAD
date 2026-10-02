import crypto from "crypto";
import { findById, findOne, create, update } from "../db/index.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { normalizeAuctionSetup, validateConfig } from "./auctionSetup.contract.js";
import { initiateBidSecurity } from "./bidSecurityService.js";

const ACTIVE = "active";
const REGISTRATION_STATES = ["not_registered","registration_started","pending_verification","pending_eligibility","pending_commitment","active","suspended","withdrawn","disqualified","expired"];

function normalizeTerms(v) { return String(v || "").trim(); }
function bidderNumber(userId, auctionId) {
  return `K-${crypto.createHash("sha256").update(`${auctionId}:${userId}:kayad`).digest("hex").slice(0, 8).toUpperCase()}`;
}

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
    { id: "account_not_banned", required: true, ok: user?.isBanned !== true && user?.status !== "banned" && user?.deactivatedAt == null },
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

export async function initiateRegistrationCommitment({ auctionId, userId, req }) {
  const { setup, user } = await getContext(auctionId, userId);
  const registration = await findOne("auction_registrations", { auction_id: auctionId, bidder_id: userId });
  if (!registration) throw Object.assign(new Error("Register for the auction first"), { status: 400 });
  if (registration.status === "active") return { registration, alreadyActive: true };
  if (registration.status !== "pending_commitment") throw Object.assign(new Error("Registration is not awaiting commitment"), { status: 409 });
  const config = normalizeAuctionSetup(setup?.config || {});
  const amount = commitmentAmount(config);
  if (!amount || amount <= 0) throw Object.assign(new Error("A fixed commitment amount is required for payment initiation"), { status: 422 });
  const result = await initiateBidSecurity({ auctionId, userId, phone: user.phone, amount, registrationId: registration.id });
  if (!result.success) throw Object.assign(new Error(result.message || "Unable to initiate commitment"), { status: 502 });
  await update("auction_registrations", registration.id, { commitment_status: "payment_pending" });
  await create("auction_registration_events", { registration_id: registration.id, event_type: "commitment_initiated", actor_id: userId, metadata: { amount, checkoutID: result.checkoutID } });
  return { ...result, registration: await findById("auction_registrations", registration.id) };
}

export async function finalizeCommitmentRegistration({ checkoutRequestID, success, receipt }) {
  const tx = await findOne("transactions", { checkoutRequestId: checkoutRequestID });
  const registrationId = tx?.metadata?.auctionRegistrationId;
  if (!registrationId) return null;
  const registration = await findById("auction_registrations", registrationId);
  if (!registration) return null;
  if (!success) { await update("auction_registrations", registration.id, { commitment_status: "failed", status: "pending_commitment" }); return registration; }
  const updated = await update("auction_registrations", registration.id, { commitment_status: "satisfied", commitment_transaction_id: tx.id, commitment_receipt: receipt || null, status: ACTIVE, eligibility_status: "eligible", activated_at: new Date().toISOString() });
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
