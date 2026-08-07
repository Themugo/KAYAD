/*
# Real Columns Found by Auditing Every Write to users/cars/bids/favorites

Previous migrations in this set were built by checking specific,
individually-discovered gaps (a missing table, a NOT NULL column that
shouldn't be one). This one comes from a different, more systematic
pass: extracted every field name actually written via .create()/
.findByIdAndUpdate()/.findOneAndUpdate() calls to the User, Car, Bid,
and Favorite models across every controller and service file, then
diffed that list against the real schema built so far.

This matters more than it might look: backend/db/index.js's create()/
update() functions do `sb.from(table).insert(mapPayloadOut(table, data))`
with no field filtering - mapPayloadOut translates JS key names to SQL
column names, but does not drop fields that don't correspond to a real
column. Postgres/PostgREST returns a hard error for an unknown column,
and `if (error) throw error` means every one of these gaps was a request
that would 500 the moment that specific field was written, not a
silent/soft issue.

users: credits, referralEarnings, referralCount (referral bonus flow,
authController.js), dealerRating, reviewCount (review aggregation,
reviewController.js), trialStartedAt (carController.js), isBanned
(reportController.js), emailVerified (referenced in
authController.js's SAFE_USER_FIELDS allowlist and set at signup).

cars: favoritesCount (favoriteController.js, incremented via $inc),
paymentStatus, winner (escrowVaultController.js's release/refund flow -
winner is the winning bidder's user id).

bids: maxBid, isAuto, bidderTag, phone, checkoutRequestID
(bidController.js - both the auto-bid engine and the direct bid-placement
flow). Also: bids had no FIELD_ALIASES entry at all, so
Bid.create({ user: ... }) was writing key "user" verbatim (camelToSnake
of a single word is a no-op) - but the real column is user_id. Every bid
placement would have failed. Fixed in fieldMap.js in this same change.

favorites: carSnapshot (a small JSONB snapshot of the car's title/price/
brand/image at the time it was favorited, from favoriteController.js).
Same missing-alias issue as bids - Favorite.create({ user, car, ... })
was writing "user"/"car" verbatim, but the real columns are user_id/
car_id. Every favorite would have failed. Fixed in fieldMap.js.

notifications: same alias gap (user -> user_id) plus a missing `data`
JSONB column (notificationController.js's reminder/generic notification
creation both pass a data object - remindAt etc. live nested inside it,
not as separate top-level fields, so no other columns were needed here).

audit_logs: same alias gap for actor -> actor_id, plus target/
targetModel need aliasing to the existing entity_id/entity_type columns
(confirmed via services/auditService.js - target is always an entity's
id, targetModel is always a string model name like "Car"/"Auction"/
"Escrow", the same shape as entity_id/entity_type). actorRole and
actorName are genuinely new columns - used consistently across all 3
real call sites (announcementController.js, bulkAdminController.js,
supportTicketAdminController.js) with no existing equivalent. Note:
several other field names appeared in an early extraction pass (count,
newStatus, ticketNumber, title, totalRecipients) but turned out to be
nested inside the `details` JSONB object, not top-level fields at all -
the existing `details` column already covers them; no action needed.

payments: phone and checkoutRequestId already matched existing columns.
referenceId, referenceModel, and mode are genuinely new (confirmed via
services/paymentService.js's real STK-push payment creation). The
user/car alias was already correct in fieldMap.js before this change -
no fix needed there, only the 3 new columns.
*/

ALTER TABLE users ADD COLUMN IF NOT EXISTS credits NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dealer_rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
-- Found later in this same session, while checking the registration/
-- onboarding flow: controllers/authController.js's demoLogin() queries
-- User.findOne({ email: demo.email, isDemo: true }) - a real, live
-- entry point (used to sign in with a pre-seeded demo account), with
-- no backing column at all. Without it, demo login would fail with an
-- unknown-column error the same way bids/favorites/reviews did before
-- their fieldMap fixes earlier this session.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

ALTER TABLE cars ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS winner UUID REFERENCES users(id);

ALTER TABLE bids ADD COLUMN IF NOT EXISTS max_bid NUMERIC;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS is_auto BOOLEAN DEFAULT false;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS bidder_tag TEXT;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;

ALTER TABLE favorites ADD COLUMN IF NOT EXISTS car_snapshot JSONB;

-- Same audit extended to notifications, audit_logs, and payments (the
-- 3 other real tables with actual write call sites found) - same
-- pattern, same severity (unknown-column errors, not soft gaps).
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_name TEXT;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_model TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mode TEXT;

CREATE INDEX IF NOT EXISTS idx_cars_winner ON cars(winner);
