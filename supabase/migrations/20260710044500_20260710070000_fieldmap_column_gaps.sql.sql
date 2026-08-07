/*
# Cars & Profiles: Add Columns Real Backend Code Depends On

Cross-checking backend/utils/fieldMap.js's FIELD_ALIASES against the
tables added in 20260710043200_..._foundational_tables.sql.sql surfaced
real, load-bearing columns those tables were missing.

cars:
- highest_bidder_id: used across 5 files (bidController.js,
  escrowVaultController.js, smsBiddingController.js, auction.service.js,
  paymentCallback.service.js) as car.highestBidder - real bidding-flow
  logic, not speculative.
- drive_type: used by carController.js as car.drivetrain.
- has_auction: used by dealerHealthScoreService.js as a boolean filter
  (car.isAuction). Added as a generated column derived from
  auction_status rather than a second, independently-writable boolean,
  since auction_status is already the real source of truth for whether
  a car has an active auction (confirmed via seed_demo_vehicles.sql.sql
  and update_car_bid_stats.sql.sql in the earlier migration) - a plain
  second column would just be one more place for that fact to drift out
  of sync with itself.

profiles:
- rating, inspections_completed: used as user.averageRating /
  user.completedChecks by dealerHealthScoreService.js,
  dealerPlatformController.js, and reviewController.js.
*/

ALTER TABLE cars ADD COLUMN IF NOT EXISTS highest_bidder_id UUID REFERENCES profiles(id);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS drive_type TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS has_auction BOOLEAN GENERATED ALWAYS AS (auction_status IS DISTINCT FROM 'none') STORED;

CREATE INDEX IF NOT EXISTS idx_cars_highest_bidder_id ON cars(highest_bidder_id);
CREATE INDEX IF NOT EXISTS idx_cars_has_auction ON cars(has_auction);

-- Same cross-check against fieldMap.js's FIELD_ALIASES.users surfaced 2
-- more real columns missing from profiles: rating (used as
-- user.averageRating by dealerHealthScoreService.js,
-- dealerPlatformController.js, reviewController.js) and
-- inspections_completed (used as user.completedChecks by the same).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 4.5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inspections_completed INTEGER DEFAULT 0;
