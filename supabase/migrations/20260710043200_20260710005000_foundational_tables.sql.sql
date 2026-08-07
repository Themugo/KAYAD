/*
# Gari Motors — Foundational Tables (profiles, cars, auctions, bids, favorites, car_views)

## Why this migration exists
The next migration in this history (20260710043238_..._gari_motors_full_schema.sql.sql)
documents itself as extending "existing base tables (profiles, cars, bids,
car_views, favorites)" and does `ALTER TABLE profiles ...` / `ALTER TABLE cars ...`
against them directly - it assumes these tables were "already created in a
prior migration." That prior migration does not exist anywhere in this
repository's migration history, which means the committed migrations cannot
be applied to a fresh database: every REFERENCES cars(id) / REFERENCES
profiles(id) foreign key in the later migration would fail immediately.

This migration reconstructs those missing foundational tables.

Column choices for profiles/cars are cross-referenced against three
sources rather than invented: the specific ALTER TABLE ... ADD COLUMN
statements in the later migration (email, super_admin,
dealer_approved_at, last_login_at, deleted_at for profiles; deleted_at,
slug, approved, inspection_status for cars); the exact column list
seed_demo_vehicles.sql.sql's INSERT statement sets on cars (brand, fuel,
engine, location_city, auction_status, auction_end, current_bid,
bids_count, allow_bid, allow_buy, is_promoted, is_verified_dealer,
deal_rating - all of which disagree with backend/db/schema_clean.sql's
naming, and take precedence here since they're already-committed,
already-real evidence rather than a standalone reference doc); and the
update_car_bid_stats.sql.sql RPC function, which proves bids reference
cars.id directly (bids.car_id) rather than a separate auctions entity -
there is no auctions table in this migration. profiles itself is
adjusted from schema_clean.sql's self-contained `users` table (which has
its own password column) to the Supabase-idiomatic `profiles` pattern
the later migration's own comments describe: "User profiles (linked to
auth.users)".
*/

-- ═══════════════════════════════════════════════════════
-- PROFILES (linked to Supabase auth.users)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
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
  dealer_rating NUMERIC(2,1) DEFAULT 4.5,
  dealer_approved_at TIMESTAMPTZ,
  escrow_approved BOOLEAN DEFAULT false,
  verified_buyer BOOLEAN DEFAULT false,
  total_sales NUMERIC DEFAULT 0,
  listing_count INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES profiles(id),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "public_read_profiles" ON profiles;
CREATE POLICY "public_read_profiles" ON profiles
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

-- ═══════════════════════════════════════════════════════
-- CARS (vehicle listings)
--
-- CORRECTED from this file's first version, which had wrongly used
-- backend/db/schema_clean.sql's column names (make, fuel_type, location,
-- a normalized has_auction boolean) without checking them against this
-- repo's own already-existing seed_demo_vehicles.sql.sql migration and
-- update_car_bid_stats.sql.sql RPC function - both of which are real,
-- already-committed evidence of the actual expected column names, and
-- disagree with schema_clean.sql on several of them (brand not make,
-- fuel not fuel_type, location_city not location, auction fields stored
-- directly on the car row rather than a separate normalized entity).
-- Column list here is the union of: every column
-- seed_demo_vehicles.sql.sql's INSERT explicitly sets, every column the
-- main schema migration's ALTER TABLE statements add, and the additional
-- columns real backend service code (duplicateVehicleService.js,
-- vehicleAnalyticsService.js) selects that weren't already covered.
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES profiles(id),
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
  allow_bid BOOLEAN DEFAULT false,
  allow_buy BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cars_dealer_id ON cars(dealer_id);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_slug ON cars(slug);
CREATE INDEX IF NOT EXISTS idx_cars_deleted_at ON cars(deleted_at);
CREATE INDEX IF NOT EXISTS idx_cars_brand_model ON cars(brand, model);
CREATE INDEX IF NOT EXISTS idx_cars_auction_status ON cars(auction_status);

ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_cars" ON cars;
CREATE POLICY "public_read_cars" ON cars
  FOR SELECT TO anon, authenticated
  USING (status != 'draft' AND status != 'hidden' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "dealer_manage_own_cars" ON cars;
CREATE POLICY "dealer_manage_own_cars" ON cars
  FOR ALL TO authenticated
  USING (auth.uid() = dealer_id)
  WITH CHECK (auth.uid() = dealer_id);

-- ═══════════════════════════════════════════════════════
-- BIDS
--
-- CORRECTED: the first version of this file gave bids an auction_id
-- foreign key to a separate auctions table, following
-- schema_clean.sql's normalized design. update_car_bid_stats.sql.sql
-- (already in this repo's migration history) proves that's wrong -
-- its RPC does `WHERE bids.car_id = ...` directly against cars, with
-- no auctions table involved at all. No live backend code references
-- auction_id either (the only match, ecpController.js, belongs to one
-- of the unfinished enterprise-platform subsystems documented in the
-- migration report, not the real bidding flow). The auctions table
-- from the first version of this file has been removed entirely -
-- there was no real evidence for it.
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','outbid','won','lost','cancelled','refunded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bids_car_id ON bids(car_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bids" ON bids;
CREATE POLICY "select_own_bids" ON bids
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bids" ON bids;
CREATE POLICY "insert_own_bids" ON bids
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- FAVORITES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  car_id UUID REFERENCES cars(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, car_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_car_id ON favorites(car_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_favorites_base" ON favorites;
CREATE POLICY "select_own_favorites_base" ON favorites
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "manage_own_favorites" ON favorites;
CREATE POLICY "manage_own_favorites" ON favorites
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- CAR_VIEWS (vehicle view tracking)
-- Column shape inferred from the later migration's RLS policies for this
-- table: INSERT is open to anon+authenticated ("anyone can insert views"),
-- SELECT is open to anon+authenticated ("public can read aggregate") - so
-- user_id must be nullable to allow anonymous view records.
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS car_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  ip_address TEXT,
  viewed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_car_views_car_id ON car_views(car_id);
CREATE INDEX IF NOT EXISTS idx_car_views_user_id ON car_views(user_id);

ALTER TABLE car_views ENABLE ROW LEVEL SECURITY;
