import { findById, findOne } from "../db/index.js";

/**
 * Canonical public room-state contract.
 * Registration is only possible before the published auction start.
 * Once the auction is live, the room is watch-only for anyone who did not
 * already complete bidder registration and eligibility.
 */
export async function getAuctionRoomState(auctionId) {
  const [car, setup] = await Promise.all([
    findById("cars", auctionId),
    findOne("auction_setups", { car_id: auctionId }),
  ]);

  if (!car || !setup || setup.publication_status !== "published") {
    return null;
  }

  const config = setup.config || {};
  const now = Date.now();
  const startsAtMs = config.startsAt ? Date.parse(config.startsAt) : NaN;
  const endsAtMs = config.endsAt ? Date.parse(config.endsAt) : NaN;
  const registrationDeadlineMs = config.registrationDeadline ? Date.parse(config.registrationDeadline) : NaN;
  const liveByStatus = String(car.auctionStatus || car.auction_status || "").toLowerCase() === "live";
  const startedBySchedule = Number.isFinite(startsAtMs) && startsAtMs <= now;
  const biddingOpen = liveByStatus && (!Number.isFinite(endsAtMs) || endsAtMs > now);
  const registrationOpen = !biddingOpen && !startedBySchedule && (!Number.isFinite(registrationDeadlineMs) || registrationDeadlineMs >= now);

  return {
    auctionId: String(auctionId),
    publicationStatus: setup.publication_status,
    auctionStatus: car.auctionStatus || car.auction_status || "scheduled",
    biddingOpen,
    registrationOpen,
    biddingRoomClosed: biddingOpen,
    viewerOnlyBeforeRegistration: biddingOpen,
    startsAt: config.startsAt || null,
    endsAt: liveByStatus ? (car.auctionEnd || car.auction_end || config.endsAt || null) : (config.endsAt || car.auctionEnd || car.auction_end || null),
    registrationDeadline: config.registrationDeadline || null,
    bidIncrement: Number(config.bidIncrement) || 0,
  };
}
