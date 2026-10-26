// Phase 13K — public vehicle projection (allowlist serializers).
// The public vehicle-detail, list and search responses must never be assembled from a raw database row: `cars` carries reserve price,
// chassis/registration numbers, the highest bidder, winner, payment state, deletion/duplicate/approval flags and the listing contact phone.
// Policy switches below record the owner's contract decisions; change them only with a documented decision.
export const PUBLIC_VEHICLE_POLICY = Object.freeze({
  /** VIN is rendered by the public detail page (copy button, structured data); owner decision 13K. */
  exposeVin: false,
  /** Seller account phone feeds the public "Call Seller" action; owner decision 13K. */
  exposeSellerPhone: false,
});

const DETAIL_FIELDS = new Set(("id _id slug title brand model year price mileage fuel transmission bodyType body_type color engine driveType drive_type drivetrain condition description features images coverImage cover_image city location_city status views inspectionStatus inspection_status dutyStatus duty_status isVerifiedDealer is_verified_dealer isPromoted is_promoted dealRating deal_rating auctionStatus auction_status auctionEnd auction_end auctionStartTime auction_start_time startingBid starting_bid currentBid current_bid bidsCount bids_count allowBid allow_bid allowBuy allow_buy hasAuction has_auction isAuction createdAt created_at updatedAt updated_at escrowEnabled escrow_enabled sold dealer").split(" "));
const SUMMARY_FIELDS = new Set(("id _id slug status title price images coverImage cover_image brand year model city location_city fuel transmission mileage bodyType body_type color condition description allowBid allow_bid allowBuy allow_buy auctionStatus auction_status currentBid current_bid bidsCount bids_count views trustScore trust_score dealRating deal_rating createdAt created_at dealer dealer_id isVerifiedDealer is_verified_dealer inspectionStatus inspection_status ntsaVerified ntsa_verified dutyStatus duty_status isPromoted is_promoted escrowEnabled escrow_enabled").split(" "));
const DEALER_FIELDS = new Set("id _id name businessName business_name avatar role dealerApprovedAt dealerRating".split(" "));

const filterKeys = (src, allow) => Object.fromEntries(Object.entries(src || {}).filter(([k, v]) => allow.has(k) && v !== undefined));
export const toPublicDealer = (dealer, policy = PUBLIC_VEHICLE_POLICY) => {
  if (!dealer || typeof dealer !== "object") return dealer; // an unpopulated foreign key is only the seller id already used for chat/profile links
  const out = filterKeys(dealer, DEALER_FIELDS);
  if (policy.exposeSellerPhone && dealer.phone) out.phone = dealer.phone;
  return out;
};
export const toPublicVehicleDetail = (car, policy = PUBLIC_VEHICLE_POLICY) => {
  const out = filterKeys(car, DETAIL_FIELDS);
  if (policy.exposeVin && car?.vin) out.vin = car.vin;
  if (car?.dealer !== undefined) out.dealer = toPublicDealer(car.dealer, policy);
  return out;
};
export const toPublicVehicleSummary = (car, policy = PUBLIC_VEHICLE_POLICY) => {
  const out = filterKeys(car, SUMMARY_FIELDS);
  if (car?.dealer !== undefined) out.dealer = toPublicDealer(car.dealer, policy);
  return out;
};
