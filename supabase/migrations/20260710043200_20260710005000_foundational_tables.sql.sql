/*
# Gari Motors — Foundational Tables (users, profiles, cars, bids, favorites, car_views)

## Why this migration exists
The next migration in this history (20260710043238_..._gari_motors_full_schema.sql.sql)
documents itself as extending "existing base tables (profiles, cars, bids,
car_views, favorites)" and does `ALTER TABLE profiles ...` / `ALTER TABLE
cars ...` against them directly - it assumes these tables were "already
created in a prior migration." That prior migration does not exist
anywhere in this repository's migration history, which means the
committed migrations cannot be applied to a fresh database: every
REFERENCES cars(id) / REFERENCES profiles(id) foreign key in the later
migration would fail immediately.

## users vs. profiles - a real architectural fork, resolved
The later migration's own comments describe profiles as "linked to
auth.users" - Supabase's built-in, session-based authentication. But the
actual backend (confirmed directly: controllers/authController.js hashes
passwords with bcrypt and issues its own JWTs; backend/models/_base.js's
TABLE_MAP routes the User model to a table literally named "users", not
"profiles"; raw Supabase queries in server.js and chatController.js query
"users" directly) runs its own self-contained authentication system, not
Supabase Auth. These are two incompatible designs that both exist in this
codebase and were never reconciled - confirmed with the project owner
which one is real: the custom bcrypt/JWT system is real; the "profiles
linked to auth.users" framing in the later migration's comments describes
something that was never actually built.

Resolved as: `users` is the real, primary table - matching the 21+
backend files, the model layer, and the actual working auth flow. It has
its own identity, no dependency on Supabase's auth.users (its credentials
- password, tokenVersion, login lockout, email verification, reset
tokens - live on a separate user_auth table, added in a later migration
after finding that split is how the real code, not just the database,
actually works: controllers/authController.js's User.create() never
sets password at all - it's written separately via UserAuth.create()).
`profiles` still exists, but only as a minimal
table whose sole purpose is to give the later migration's `ALTER TABLE
profiles` / `REFERENCES profiles(id)` / RLS-policy statements something
valid to point at, since that migration cannot be edited (it may already
be applied to a real database). `profiles.id` references `users(id)`
directly as a 1:1 extension, not `auth.users(id)`.

All foreign keys from cars/bids/favorites/car_views that represent "the
user who did this" point at `users(id)`, matching what the real
application code (TABLE_MAP, raw queries) actually expects.

RLS is enabled on every table below as a safe default, but no
auth.uid()-based policies are defined, because auth.uid() only resolves
inside a Supabase-session request - this backend always connects with
the Supabase service-role key (confirmed in backend/utils/supabase.js),
which bypasses RLS entirely. Authorization happens in the Express/JWT
middleware layer (backend/middleware/auth.js, role.js, rbac.js), not at
the Postgres layer. Writing auth.uid()-based policies here would be
inert and misleading about how this app actually enforces access.

## Column choices for cars
Cross-referenced against three sources rather than invented: the
ALTER TABLE cars ADD COLUMN statements in the later migration (slug,
approved, inspection_status, deleted_at); the exact column list
seed_demo_vehicles.sql.sql's INSERT statement sets (brand, fuel, engine,
location_city, auction_status, auction_end, current_bid, bids_count,
allow_bid, allow_buy, is_promoted, is_verified_dealer, deal_rating - all
of which disagree with backend/db/schema_clean.sql's naming, and take
precedence here as already-committed, already-real evidence); and
update_car_bid_stats.sql.sql's RPC function, which proves bids reference
cars.id directly (bids.car_id) rather than a separate auctions entity -
there is no auctions table in this migration. highest_bidder_id,
drive_type, and has_auction were added after cross-checking
backend/utils/fieldMap.js's FIELD_ALIASES.cars against real, multi-file
backend usage (bidController.js, escrowVaultController.js,
smsBiddingController.js, auction.service.js, paymentCallback.service.js,
carController.js, dealerHealthScoreService.js) - has_auction is a
GENERATED column derived from auction_status rather than a second,
independently-writable boolean, since auction_status is already the real
source of truth for that fact.

car_views' shape was inferred from its RLS policies in the later
migration, since no CREATE TABLE for it exists anywhere to copy from.
*/

-- ═══════════════════════════════════════════════════════
-- USERS (the real, primary identity table - custom bcrypt/JWT auth,
-- not Supabase Auth)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role = ANY (ARRAY['user'::text, 'dealer'::text, 'broker'::text, 'admin'::text, 'superadmin'::text])),
  super_admin BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended','rejected')),
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  avatar TEXT DEFAULT '',
  business_name TEXT,
  location TEXT,
  bio TEXT DEFAULT '',
  rating NUMERIC(2,1) DEFAULT 4.5,
  inspections_completed INTEGER DEFAULT 0,
  dealer_approved_at TIMESTAMPTZ,
  escrow_approved BOOLEAN DEFAULT false,
  verified_buyer BOOLEAN DEFAULT false,
  total_sales NUMERIC DEFAULT 0,
  listing_count INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- PROFILES (minimal compatibility table - exists only so the later
-- migration's ALTER TABLE profiles / REFERENCES profiles(id) / RLS
-- policies have something valid to point at; see header comment)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- CARS (vehicle listings)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  slug TEXT,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  mileage INTEGER,
  fuel TEXT,
  transmission TEXT,
  body_type TEXT,
  color TEXT,
  engine TEXT,
  drive_type TEXT,
  condition TEXT,
  description TEXT,
  features TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  location_city TEXT,
  vin TEXT,
  chassis_number TEXT,
  registration_number TEXT,
  is_flagged_duplicate BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','sold','pending','reserved','hidden','draft')),
  views INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT true,
  inspection_status TEXT DEFAULT 'pending',
  is_verified_dealer BOOLEAN DEFAULT false,
  is_promoted BOOLEAN DEFAULT false,
  deal_rating TEXT,
  -- Auction fields live directly on the car row (denormalized) rather
  -- than a separate auctions table - confirmed by update_car_bid_stats.sql.sql,
  -- which updates cars.current_bid/cars.bids_count directly, and by
  -- bids.car_id below (not bids.auction_id).
  auction_status TEXT DEFAULT 'none',
  auction_end TIMESTAMPTZ,
  current_bid NUMERIC DEFAULT 0,
  bids_count INTEGER DEFAULT 0,
  highest_bidder_id UUID REFERENCES users(id),
  allow_bid BOOLEAN DEFAULT false,
  allow_buy BOOLEAN DEFAULT true,
  has_auction BOOLEAN GENERATED ALWAYS AS (auction_status IS DISTINCT FROM 'none') STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cars_dealer_id ON cars(dealer_id);
CREATE INDEX IF NOT EXISTS idx_cars_highest_bidder_id ON cars(highest_bidder_id);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_slug ON cars(slug);
CREATE INDEX IF NOT EXISTS idx_cars_deleted_at ON cars(deleted_at);
CREATE INDEX IF NOT EXISTS idx_cars_brand_model ON cars(brand, model);
CREATE INDEX IF NOT EXISTS idx_cars_auction_status ON cars(auction_status);
CREATE INDEX IF NOT EXISTS idx_cars_has_auction ON cars(has_auction);

ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- BIDS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','outbid','won','lost','cancelled','refunded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bids_car_id ON bids(car_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- FAVORITES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  car_id UUID REFERENCES cars(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, car_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_car_id ON favorites(car_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- CAR_VIEWS (vehicle view tracking)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS car_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  ip_address TEXT,
  viewed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_car_views_car_id ON car_views(car_id);
CREATE INDEX IF NOT EXISTS idx_car_views_user_id ON car_views(user_id);

ALTER TABLE car_views ENABLE ROW LEVEL SECURITY;
