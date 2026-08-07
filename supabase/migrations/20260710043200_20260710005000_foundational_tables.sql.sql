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

This migration reconstructs those missing foundational tables. `auctions` is
included too, even though it isn't in the later migration's list, because
`bids` cannot exist without it (bids.auction_id references auctions.id).

Column choices for profiles/cars are cross-referenced against the specific
ALTER TABLE ... ADD COLUMN statements in the later migration (email,
super_admin, dealer_approved_at, last_login_at, deleted_at for profiles;
deleted_at, slug, approved, inspection_status for cars) and against
db/schema_clean.sql, this codebase's most complete standalone schema
reference, adjusted from schema_clean.sql's self-contained `users` table
(which has its own password column) to the Supabase-idiomatic `profiles`
pattern the later migration's own comments describe: "User profiles
(linked to auth.users)".
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
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  slug TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  mileage INTEGER,
  fuel_type TEXT,
  transmission TEXT,
  body_type TEXT,
  color TEXT,
  condition TEXT,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  featured_image TEXT,
  location TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','sold','pending','reserved','hidden','draft')),
  views INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  has_auction BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT true,
  inspection_status TEXT DEFAULT 'pending',
  vin TEXT,
  engine_capacity TEXT,
  drive_type TEXT,
  seats INTEGER,
  doors INTEGER,
  features TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cars_dealer_id ON cars(dealer_id);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_slug ON cars(slug);
CREATE INDEX IF NOT EXISTS idx_cars_deleted_at ON cars(deleted_at);
CREATE INDEX IF NOT EXISTS idx_cars_make_model ON cars(make, model);

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
-- AUCTIONS (not documented in the later migration's list, but
-- required by bids.auction_id below)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cars(id),
  seller_id UUID REFERENCES profiles(id),
  start_price NUMERIC NOT NULL,
  reserve_price NUMERIC,
  current_bid NUMERIC DEFAULT 0,
  highest_bidder_id UUID REFERENCES profiles(id),
  bid_increment NUMERIC DEFAULT 100,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','paused','ended','cancelled')),
  winner_id UUID REFERENCES profiles(id),
  final_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auctions_car_id ON auctions(car_id);
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_highest_bidder_id ON auctions(highest_bidder_id);
CREATE INDEX IF NOT EXISTS idx_auctions_winner_id ON auctions(winner_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_auctions" ON auctions;
CREATE POLICY "public_read_auctions" ON auctions
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL);

-- ═══════════════════════════════════════════════════════
-- BIDS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id),
  user_id UUID REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  is_auto_bid BOOLEAN DEFAULT false,
  max_auto_bid_amount NUMERIC,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','outbid','won','lost','cancelled','refunded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
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
