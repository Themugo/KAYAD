/*
# Car Listing Creation/Update Flow — Missing Fields

Flagged in the previous commit as separate from registration/onboarding
and deliberately not fixed there; addressed now as its own pass.
Traced controllers/carController.js's createCar() and updateCar() in
full (the real, live listing-creation flow - dealer package/trial
enforcement, escrow rules, image upload, price history) and cross-
checked every field referenced against the schema built so far.

## cars.images: TEXT[] -> JSONB (a real bug, not just a missing field)
The previous version of this migration defined images as TEXT[] with
plain URL strings, matching seed_demo_vehicles.sql.sql's format. But
createCar()/updateCar()'s real, live code stores an array of OBJECTS
({url, thumb, public_id, _pending} initially, then Cloudinary's own
{url, public_id, ...} shape once a background job finishes uploading) -
confirmed by reading both the initial Car.create(body) call and the
follow-up Car.findByIdAndUpdate(car._id, { $set: { images: uploaded } })
that replaces the placeholders. Postgres would reject inserting an
array of JSON objects into a TEXT[] column outright - every single
listing creation would have failed at the database level. Changed to
JSONB, and rewrote seed_demo_vehicles.sql.sql's 12 image arrays from
ARRAY['url1','url2'] literal syntax to
'[{"url":"url1"},{"url":"url2"}]'::jsonb, so the seed data matches the
same shape the real app actually uses instead of being independently
(and now incompatibly) formatted.

## users: dealer package / trial system
trialListingsUsed, firstVehicleUsed, dealerPackage, packageListingMax,
packageExpiresAt, escrowForced - all read/written in createCar()'s
package-and-trial enforcement block (trial expiry, listing limits,
escrow auto-enable for forced accounts).

## cars: listing fields
coverImage (an index into the images array, not a URL - confirmed via
`Number(body.coverImage)` and a `0 <= requestedCover < totalImages`
bounds check), isDemo/demoEditedAt/demoEditedBy (demo-account listing
tracking), trustScore, escrowEnabled, priceHistory (a JSONB array of
{price, date} entries, pushed to on every price change - same
denormalized-array pattern as chats.messages/escrows.history found
earlier this session), auctionStartTime, startingBid, reservePrice,
reserveMode, promotionExpiresAt, dealerPhone, ntsaVerified, dutyStatus,
logbookVerified - all from updateCar()'s allowedFields list.

## platform_config: packages
createCar() reads config?.packages (the list of dealer/seller listing
plans - free tier, trial, paid tiers), config?.freeMarket, and
config?.waivePayments - none of which existed on the platform_config
table added earlier this session (that pass only covered
dealerCommission, the one field 3 *other* services needed).
*/

ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_listings_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_vehicle_used BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dealer_package TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_listing_max INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS escrow_forced BOOLEAN DEFAULT false;

ALTER TABLE cars ADD COLUMN IF NOT EXISTS cover_image INTEGER DEFAULT 0;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS demo_edited_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS demo_edited_by UUID REFERENCES users(id);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS trust_score NUMERIC DEFAULT 0;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS escrow_enabled BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS price_history JSONB DEFAULT '[]';
ALTER TABLE cars ADD COLUMN IF NOT EXISTS auction_start_time TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS starting_bid NUMERIC;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS reserve_price NUMERIC;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS reserve_mode TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS promotion_expires_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS dealer_phone TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS ntsa_verified BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS duty_status TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS logbook_verified BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cars_demo_edited_by ON cars(demo_edited_by);

ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]';
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS free_market BOOLEAN DEFAULT true;
ALTER TABLE platform_config ADD COLUMN IF NOT EXISTS waive_payments BOOLEAN DEFAULT false;
