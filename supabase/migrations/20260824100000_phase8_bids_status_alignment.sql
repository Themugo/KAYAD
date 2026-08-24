-- Phase 8: align bids.status CHECK with the canonical auction engine's
-- status vocabulary.
--
-- The engine (controllers/bidController.js, utils/auctionTimer.js,
-- services/auctionClose.service.js) writes:
--   pending  — bid created, M-Pesa payment not yet confirmed
--   paid     — payment confirmed; the bid counts toward market state
--   failed   — payment failed/cancelled
--   won/lost — set at close by the canonical close path
-- The foundational migration only allowed
-- ('active','outbid','won','lost','cancelled','refunded'), which made
-- every engine insert/update using pending/paid/failed violate the
-- constraint. This migration widens the constraint to the union.

ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;

ALTER TABLE bids ADD CONSTRAINT bids_status_check
  CHECK (status IN (
    'active',
    'pending',
    'paid',
    'failed',
    'outbid',
    'won',
    'lost',
    'cancelled',
    'refunded'
  ));
