import { findById, findOne, create, update } from '../db/index.js';
import { logActionFromReq } from '../utils/securityLogger.js';
import { normalizeAuctionSetup, validateConfig, vehicleReadiness } from './auctionSetup.contract.js';
import { getAuctionPlatformPolicy, enforceAuctionPlatformPolicy, getDealerAuctionCapabilities } from './auctionPlatformPolicy.service.js';
import { assertPrivateSellerAuctionEligible } from './privateSellerAuctionEligibility.service.js';

// Phase 14.9: an auction configuration may only be created or changed while the vehicle is a live, unsold, unreserved listing with no
// auction already running or finished (and no bids). Soft-deleted vehicles do not exist for this API at all. This protects an active
// auction, a submitted bid, a reservation or a completed sale from having its terms rewritten by a later setup call.
const isDeleted = (car) => Boolean(car?.deletedAt || car?.deleted_at);
export function assertAuctionSetupAllowed(car) {
  if (!car || isDeleted(car)) throw Object.assign(new Error("Vehicle not found"), { status: 404 });
  const status = String(car.status ?? "").toLowerCase();
  const auctionStatus = String(car.auctionStatus ?? car.auction_status ?? "").toLowerCase();
  const bids = Number(car.bidsCount ?? car.bids_count ?? 0);
  let reason = null;
  if (status === "sold") reason = "LISTING_SOLD";
  else if (status === "reserved") reason = "LISTING_RESERVED";
  else if (["live", "ended"].includes(auctionStatus)) reason = auctionStatus === "live" ? "AUCTION_ACTIVE" : "AUCTION_CLOSED";
  else if (bids > 0 || car.highestBidderId || car.highest_bidder_id) reason = "BIDS_PRESENT";
  if (reason) throw Object.assign(new Error("This vehicle's auction terms can no longer be changed."), { status: 409, code: "AUCTION_SETUP_LOCKED", reason });
}

export async function getAuctionSetup(carId, userId) {
  const car = await findById("cars", carId);
  if (!car || isDeleted(car)) return { car: null, setup: null };
  if (String(car.dealer) !== String(userId) && String(car.dealer_id) !== String(userId)) return { forbidden: true };
  const setup = await findOne("auction_setups", { car_id: carId });
  const capabilities = await getDealerAuctionCapabilities();
  return { car, setup, capabilities };
}

export async function saveAuctionSetup({ carId, userId, body, req }) {
  const car = await findById("cars", carId);
  if (!car) throw Object.assign(new Error("Vehicle not found"), { status: 404 });
  if (String(car.dealer) !== String(userId) && String(car.dealer_id) !== String(userId)) throw Object.assign(new Error("Not authorized for this vehicle"), { status: 403 });
  assertAuctionSetupAllowed(car);

  const existing = await findOne("auction_setups", { car_id: carId });
  if (existing?.publication_status === "published") throw Object.assign(new Error("Published auction setup is immutable; submit a controlled amendment"), { status: 409 });

  const config = normalizeAuctionSetup(body.config || body);
  const validationErrors = [...validateConfig(config), ...enforceAuctionPlatformPolicy(config, await getAuctionPlatformPolicy())];
  const readiness = vehicleReadiness(car, config);
  const status = validationErrors.length === 0 && readiness.publishable ? "ready" : "draft";
  const payload = {
    car_id: carId,
    organizer_id: userId,
    publication_status: status,
    version: existing?.version || 1,
    config,
    readiness_snapshot: { ...readiness, validationErrors, capturedAt: new Date().toISOString() },
  };
  const setup = existing ? await update("auction_setups", existing.id, payload) : await create("auction_setups", payload);
  await logActionFromReq(req, "auction_setup_saved", { target: carId, targetModel: "Car", details: { setupId: setup.id, status, validationErrors, blockers: readiness.blockers } });
  return { setup, validationErrors, readiness };
}

export async function publishAuctionSetup({ carId, userId, req }) {
  const car = await findById("cars", carId);
  if (!car) throw Object.assign(new Error("Vehicle not found"), { status: 404 });
  if (String(car.dealer) !== String(userId) && String(car.dealer_id) !== String(userId)) throw Object.assign(new Error("Not authorized for this vehicle"), { status: 403 });
  if (isDeleted(car)) throw Object.assign(new Error("Vehicle not found"), { status: 404 });
  await assertPrivateSellerAuctionEligible(car);
  const setup = await findOne("auction_setups", { car_id: carId });
  if (!setup) throw Object.assign(new Error("Auction setup has not been created"), { status: 400 });
  if (setup.publication_status === "published") return { setup, alreadyPublished: true }; // idempotent repeat
  assertAuctionSetupAllowed(car);
  const config = normalizeAuctionSetup(setup.config || {});
  const validationErrors = [...validateConfig(config), ...enforceAuctionPlatformPolicy(config, await getAuctionPlatformPolicy())];
  const readiness = vehicleReadiness(car, config);
  if (validationErrors.length || !readiness.publishable) {
    const error = new Error("Auction is not publishable");
    error.status = 422;
    error.details = { validationErrors, readiness };
    throw error;
  }
  const publishedAt = new Date().toISOString();
  const updated = await update("auction_setups", setup.id, {
    publication_status: "published",
    published_at: publishedAt,
    published_by: userId,
    locked_at: publishedAt,
    readiness_snapshot: { ...readiness, validationErrors: [], capturedAt: publishedAt },
  });

  // Mirror the immutable published schedule onto the canonical car lifecycle
  // row so the server can start the auction automatically at the configured
  // time without creating a second scheduler/data source.
  await update("cars", carId, {
    auctionStartTime: config.startsAt,
    auctionEnd: config.endsAt,
    auctionStatus: "draft",
    allowBid: false,
  });
  await logActionFromReq(req, "auction_setup_published", { target: carId, targetModel: "Car", details: { setupId: setup.id, version: setup.version } });
  return { setup: updated, readiness };
}

export async function requestAuctionAmendment({ carId, userId, body, req }) {
  const { car, setup, forbidden } = await getAuctionSetup(carId, userId);
  if (forbidden) throw Object.assign(new Error("Not authorized for this auction"), { status: 403 });
  if (!car) throw Object.assign(new Error("Vehicle not found"), { status: 404 });
  if (!setup || setup.publication_status !== "published") throw Object.assign(new Error("Only published auctions can receive controlled amendments"), { status: 400 });
  if (!String(body.reason || "").trim()) throw Object.assign(new Error("Amendment reason is required"), { status: 400 });
  const amendment = await create("auction_setup_amendments", { auction_setup_id: setup.id, requested_by: userId, reason: String(body.reason).trim(), proposed_config: normalizeAuctionSetup(body.proposedConfig || {}) });
  await logActionFromReq(req, "auction_setup_amendment_requested", { target: carId, targetModel: "Car", details: { amendmentId: amendment.id, setupId: setup.id } });
  return amendment;
}

