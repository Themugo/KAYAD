// Phase 14.7 - server-side listing deletion guard (DELETE /api/cars/:id).
//
// Authoritative auction/listing relationship (verified in the schema and services): auction state is denormalised on the
// cars row - auction_status ('none' | 'draft' | 'live' | 'ended'), bids_count, highest_bidder_id - and bids reference
// cars.id through bids.car_id (supabase/migrations/20260710043200_20260710005000_foundational_tables.sql).
// A listing may NOT be deleted while it is part of an auction or settlement record:
//   * sold            - completed sale; unwound through the escrow/refund workflow (same rule as utils/carModerationGuard.js)
//   * reserved        - 14.8: cars.status 'reserved' is set by the sale/escrow flow ("Reserved under Escrow"; sellers cannot set it,
//                       see routes/dealerRoutes.js SELLER_SETTABLE_STATUSES) and released only by that flow. While a buyer's
//                       reservation exists the listing cannot be deleted by the seller; releasing it belongs to the protected
//                       escrow/settlement domain and is intentionally NOT implemented here.
//   * live auction    - bidders are participating
//   * ended auction   - winner / payment / escrow records reference the car
//   * any bid present - bids_count > 0 or highest_bidder_id set (or a bids row)
// Draft auctions with no bids, fixed-price listings and non-auction listings may be deleted.
// This function is the readable pre-check used for a precise error; the authoritative, race-safe enforcement is the
// conditional UPDATE in models/Car.js softDeleteGuarded (it re-evaluates these conditions atomically on the locked row).

export const DELETE_BLOCK_CODES = Object.freeze({
  SOLD: "LISTING_SOLD",
  RESERVED: "LISTING_RESERVED",
  AUCTION_ACTIVE: "AUCTION_ACTIVE",
  AUCTION_CLOSED: "AUCTION_CLOSED",
  BIDS_PRESENT: "BIDS_PRESENT",
});

const MESSAGES = Object.freeze({
  LISTING_SOLD: "This vehicle has been sold. A completed sale is unwound through the escrow/refund workflow, not by deleting the listing.",
  LISTING_RESERVED: "This vehicle is reserved for a buyer under the sale/escrow flow and cannot be deleted. It becomes deletable again only if that reservation is released through the escrow workflow.",
  AUCTION_ACTIVE: "This listing has a live auction and cannot be deleted. Contact KAYAD support to cancel an auction.",
  AUCTION_CLOSED: "This listing has a closed auction with settlement records and cannot be deleted.",
  BIDS_PRESENT: "This listing has bids and cannot be deleted.",
});

export function listingDeletionBlock(car, bidRowCount = 0) {
  if (!car) return null;
  const auction = String(car.auctionStatus ?? car.auction_status ?? "none").toLowerCase();
  const bids = Number(car.bidsCount ?? car.bids_count ?? 0) || 0;
  const highest = car.highestBidderId ?? car.highest_bidder_id ?? null;
  let code = null;
  if (car.status === "sold" || car.sold === true) code = DELETE_BLOCK_CODES.SOLD;
  else if (String(car.status ?? "").toLowerCase() === "reserved") code = DELETE_BLOCK_CODES.RESERVED;
  else if (auction === "live") code = DELETE_BLOCK_CODES.AUCTION_ACTIVE;
  else if (auction === "ended") code = DELETE_BLOCK_CODES.AUCTION_CLOSED;
  else if (bids > 0 || highest || Number(bidRowCount) > 0) code = DELETE_BLOCK_CODES.BIDS_PRESENT;
  return code ? { code, message: MESSAGES[code] } : null;
}
