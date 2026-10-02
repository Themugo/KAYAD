import { findById, findOne, create, update } from '../db/index.js';
import { logActionFromReq } from '../utils/securityLogger.js';
import { normalizeAuctionSetup, validateConfig, vehicleReadiness } from './auctionSetup.contract.js';
import { getAuctionPlatformPolicy, enforceAuctionPlatformPolicy, getDealerAuctionCapabilities } from './auctionPlatformPolicy.service.js';

export async function getAuctionSetup(carId, userId) {
  const car = await findById("cars", carId);
  if (!car) return { car: null, setup: null };
  if (String(car.dealer) !== String(userId) && String(car.dealer_id) !== String(userId)) return { forbidden: true };
  const setup = await findOne("auction_setups", { car_id: carId });
  const capabilities = await getDealerAuctionCapabilities();
  return { car, setup, capabilities };
}

export async function saveAuctionSetup({ carId, userId, body, req }) {
  const car = await findById("cars", carId);
  if (!car) throw Object.assign(new Error("Vehicle not found"), { status: 404 });
  if (String(car.dealer) !== String(userId) && String(car.dealer_id) !== String(userId)) throw Object.assign(new Error("Not authorized for this vehicle"), { status: 403 });

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
  const setup = await findOne("auction_setups", { car_id: carId });
  if (!setup) throw Object.assign(new Error("Auction setup has not been created"), { status: 400 });
  if (setup.publication_status === "published") return { setup, alreadyPublished: true };
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
  await logActionFromReq(req, "auction_setup_published", { target: carId, targetModel: "Car", details: { setupId: setup.id, version: setup.version } });
  return { setup: updated, readiness };
}

export async function requestAuctionAmendment({ carId, userId, body, req }) {
  const { setup, forbidden } = await getAuctionSetup(carId, userId);
  if (forbidden) throw Object.assign(new Error("Not authorized for this auction"), { status: 403 });
  if (!setup || setup.publication_status !== "published") throw Object.assign(new Error("Only published auctions can receive controlled amendments"), { status: 400 });
  if (!String(body.reason || "").trim()) throw Object.assign(new Error("Amendment reason is required"), { status: 400 });
  const amendment = await create("auction_setup_amendments", { auction_setup_id: setup.id, requested_by: userId, reason: String(body.reason).trim(), proposed_config: normalizeAuctionSetup(body.proposedConfig || {}) });
  await logActionFromReq(req, "auction_setup_amendment_requested", { target: carId, targetModel: "Car", details: { amendmentId: amendment.id, setupId: setup.id } });
  return amendment;
}

