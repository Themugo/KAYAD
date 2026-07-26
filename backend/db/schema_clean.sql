CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================
-- USERS & AUTH
-- =============================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','dealer','admin','superadmin','escrow_officer','ad_manager','moderator','ghost_checker','individual_seller','marketing','technical_support','hr','accounts')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended','rejected')),
  is_demo BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT false,
  avatar TEXT DEFAULT '',
  business_name TEXT,
  location TEXT,
  bio TEXT DEFAULT '',
  dealer_rating NUMERIC(2,1) DEFAULT 4.5,
  escrow_approved BOOLEAN DEFAULT false,
  escrow_forced BOOLEAN DEFAULT false,
  verified_buyer BOOLEAN DEFAULT false,
  total_sales NUMERIC DEFAULT 0,
  listing_count INTEGER DEFAULT 0,
  commission NUMERIC DEFAULT 5,
  waiver NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  commission_balance NUMERIC DEFAULT 0,
  listings_locked BOOLEAN DEFAULT false,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id),
  credits NUMERIC DEFAULT 0,
  referral_earnings NUMERIC DEFAULT 0,
  referral_count INTEGER DEFAULT 0,
  token_version INTEGER DEFAULT 0,
  must_change_password BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  last_active TIMESTAMPTZ,
  login_attempts INTEGER DEFAULT 0,
  lock_until TIMESTAMPTZ,
  reset_token TEXT,
  reset_token_expire TIMESTAMPTZ,
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'KES',
  timezone TEXT DEFAULT 'Africa/Nairobi',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);

-- =============================
-- CARS / VEHICLES
-- =============================
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_cars_make_model ON cars(make, model);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(price);
CREATE INDEX IF NOT EXISTS idx_cars_dealer ON cars(dealer_id);
CREATE INDEX IF NOT EXISTS idx_cars_featured ON cars(featured);
CREATE INDEX IF NOT EXISTS idx_cars_created ON cars(created_at DESC);

-- =============================
-- AUCTIONS
-- =============================
CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cars(id),
  seller_id UUID REFERENCES users(id),
  start_price NUMERIC NOT NULL,
  reserve_price NUMERIC,
  current_bid NUMERIC DEFAULT 0,
  highest_bidder_id UUID REFERENCES users(id),
  bid_increment NUMERIC DEFAULT 100,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','paused','ended','cancelled')),
  winner_id UUID REFERENCES users(id),
  final_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_car ON auctions(car_id);
CREATE INDEX IF NOT EXISTS idx_auctions_end ON auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_seller ON auctions(seller_id);

-- =============================
-- BIDS
-- =============================
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id),
  user_id UUID REFERENCES users(id),
  amount NUMERIC NOT NULL,
  is_auto_bid BOOLEAN DEFAULT false,
  max_auto_bid_amount NUMERIC,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','outbid','won','lost','cancelled','refunded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_user ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(amount DESC);

-- =============================
-- ESCROWS
-- =============================
CREATE TABLE IF NOT EXISTS escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cars(id),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  amount NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','funded','inspecting','approved','released','refunded','disputed','cancelled')),
  release_code TEXT,
  release_code_expires TIMESTAMPTZ,
  auto_release_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrows_buyer ON escrows(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrows_seller ON escrows(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);

-- =============================
-- PAYMENTS
-- =============================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  escrow_id UUID REFERENCES escrows(id),
  amount NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  method TEXT DEFAULT 'mpesa',
  provider_ref TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','refunded')),
  type TEXT DEFAULT 'escrow_funding',
  mpesa_receipt TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa ON payments(mpesa_receipt);

-- =============================
-- CHATS & MESSAGES
-- =============================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants UUID[] DEFAULT '{}',
  car_id UUID REFERENCES cars(id),
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id),
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);

-- =============================
-- NOTIFICATIONS
-- =============================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- =============================
-- FAVORITES
-- =============================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  car_id UUID REFERENCES cars(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, car_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- =============================
-- REVIEWS
-- =============================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  dealer_id UUID REFERENCES users(id),
  car_id UUID REFERENCES cars(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_dealer ON reviews(dealer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- =============================
-- REFRESH TOKENS
-- =============================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- =============================
-- SECURITY & AUDIT
-- =============================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low','medium','high','critical')),
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);

-- =============================
-- DEALER TABLES
-- =============================
CREATE TABLE IF NOT EXISTS dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id),
  business_name TEXT,
  business_registration TEXT,
  kra_pin TEXT,
  license_number TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dealer_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID REFERENCES users(id),
  score NUMERIC(3,1),
  response_time NUMERIC,
  listing_quality NUMERIC,
  transaction_completion NUMERIC,
  period TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- DISPUTES
-- =============================
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID REFERENCES escrows(id),
  opened_by UUID REFERENCES users(id),
  opened_against UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed','appealed')),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- LEADS
-- =============================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id),
  dealer_id UUID REFERENCES users(id),
  car_id UUID REFERENCES cars(id),
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted','lost')),
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- SUPPORT TICKETS
-- =============================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- FEATURE FLAGS
-- =============================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- ORGANIZATIONS
-- =============================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- MARKET & VALUATION
-- =============================
CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT,
  model TEXT,
  year INTEGER,
  avg_price NUMERIC,
  median_price NUMERIC,
  listing_count INTEGER,
  avg_days_on_market INTEGER,
  period TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cars(id),
  estimated_value NUMERIC,
  low_value NUMERIC,
  high_value NUMERIC,
  confidence NUMERIC,
  factors JSONB,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- SAVED SEARCHES
-- =============================
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  query_params JSONB,
  notify BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- ESCROW VAULTS
-- =============================
CREATE TABLE IF NOT EXISTS escrow_vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id),
  seller_id UUID REFERENCES users(id),
  escrow_id UUID REFERENCES escrows(id),
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- LISTING QUALITY
-- =============================
CREATE TABLE IF NOT EXISTS listing_quality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cars(id),
  score NUMERIC(3,1),
  has_images BOOLEAN,
  has_description BOOLEAN,
  has_price BOOLEAN,
  image_count INTEGER,
  description_length INTEGER,
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- MARKETPLACE HEALTH
-- =============================
CREATE TABLE IF NOT EXISTS marketplace_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_listings INTEGER,
  new_listings_24h INTEGER,
  total_users INTEGER,
  total_dealers INTEGER,
  completed_transactions INTEGER,
  avg_response_time NUMERIC,
  period TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- FRAUD DETECTION
-- =============================
CREATE TABLE IF NOT EXISTS fraud_detection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  rule TEXT,
  score NUMERIC,
  details JSONB,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- IDEMPOTENCY
-- =============================
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  response JSONB,
  status_code INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- =============================
-- PLATFORM CONFIG
-- =============================
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- ANNOUNCEMENTS
-- =============================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  type TEXT,
  active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- CONVERSION FUNNELS
-- =============================
CREATE TABLE IF NOT EXISTS conversion_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step TEXT,
  count INTEGER DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE
);

-- =============================
-- SEARCH ANALYTICS
-- =============================
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT,
  result_count INTEGER,
  filters JSONB,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- MPESA TRANSACTIONS
-- =============================
CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT,
  trans_id TEXT UNIQUE,
  trans_time TIMESTAMPTZ,
  amount NUMERIC,
  phone TEXT,
  account_ref TEXT,
  result_code INTEGER,
  result_desc TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- SUBSCRIPTIONS
-- =============================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plan TEXT,
  status TEXT DEFAULT 'active',
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- NOTIFICATION AUDIT
-- =============================
CREATE TABLE IF NOT EXISTS notification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  channel TEXT,
  status TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- TRANSACTIONS
-- =============================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID REFERENCES users(id),
  to_user UUID REFERENCES users(id),
  escrow_id UUID REFERENCES escrows(id),
  amount NUMERIC,
  type TEXT,
  reference TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- NTSA VERIFICATION
-- =============================
CREATE TABLE IF NOT EXISTS ntsa_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cars(id),
  plate_number TEXT,
  status TEXT DEFAULT 'pending',
  result JSONB,
  requested_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- INSPECTION ORDERS
-- =============================
CREATE TABLE IF NOT EXISTS inspection_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cars(id),
  inspector_id UUID REFERENCES users(id),
  requested_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'scheduled',
  report JSONB,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- ERROR BUDGETS
-- =============================
CREATE TABLE IF NOT EXISTS error_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT,
  period TEXT,
  budget NUMERIC,
  consumed NUMERIC,
  remaining NUMERIC,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- ESCROW ANOMALIES
-- =============================
CREATE TABLE IF NOT EXISTS escrow_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID REFERENCES escrows(id),
  flagged_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  anomaly_type TEXT,
  severity TEXT,
  details JSONB,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS escrow_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  score NUMERIC,
  factors JSONB,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS escrow_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID REFERENCES escrows(id),
  action TEXT,
  performed_by UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- AUCTION INTEGRITY
-- =============================
CREATE TABLE IF NOT EXISTS auction_integrity_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auctions(id),
  flagged_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  flag_type TEXT,
  details JSONB,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auction_risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  risk_score NUMERIC,
  factors JSONB,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- EVIDENCE
-- =============================
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES disputes(id),
  uploaded_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  file_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- ADMIN ALERTS
-- =============================
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  severity TEXT,
  message TEXT,
  details JSONB,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- REPORTS
-- =============================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by UUID REFERENCES users(id),
  type TEXT,
  parameters JSONB,
  result JSONB,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- DEMAND SIGNALS
-- =============================
CREATE TABLE IF NOT EXISTS demand_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT,
  model TEXT,
  signal_type TEXT,
  score NUMERIC,
  period TEXT,
  calculated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- HELPER: updated_at trigger
-- =============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================
-- RPC: increment_car_views
-- =============================
CREATE OR REPLACE FUNCTION increment_car_views(car_id UUID, increment_by INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE cars SET views = COALESCE(views, 0) + increment_by WHERE id = car_id;
END;
$$ LANGUAGE plpgsql;

-- Distributed locks
CREATE TABLE IF NOT EXISTS distributed_locks (
  resource_id TEXT PRIMARY KEY,
  holder TEXT NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- M4: user_profiles ghost table removed (zero queries anywhere).
-- User preferences are handled by UserPreference model (MongoDB).
-- The notification_preferences column was unused.

-- =============================
-- MIGRATION: columns referenced by controllers/carController.js
-- that were missing from the original schema. The Mongo-era app
-- code assumes these fields exist on `cars`; without them, the
-- primary listing/search endpoint (getCars) fails on its very
-- first filter (isDemo), and auction/promotion filtering fails too.
-- Added idempotently so this is safe to re-run.
-- =============================
ALTER TABLE cars ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS auction_status TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS allow_bid BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS allow_buy BOOLEAN DEFAULT true;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS current_bid NUMERIC;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS bids_count INTEGER DEFAULT 0;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS trust_score NUMERIC;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS deal_rating NUMERIC;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS is_verified_dealer BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS ntsa_verified BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS duty_status TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS demo_edited_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS demo_edited_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_cars_is_demo ON cars(is_demo);
CREATE INDEX IF NOT EXISTS idx_cars_auction_status ON cars(auction_status);
CREATE INDEX IF NOT EXISTS idx_cars_is_promoted ON cars(is_promoted);

-- =============================
-- MIGRATION: `users.verified` — referenced by carController's dealer
-- populate select ("name businessName phone role logo verified") but
-- never existed as a column (only email_verified/phone_verified did).
-- Represents overall account verification (distinct from the
-- per-channel flags), settable by admin review or derived from them.
-- =============================
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified);

-- =============================
-- MIGRATION: composite indexes + trigram search for scale
-- (500 dealers / 20,000 vehicles / 5,000 searches per day)
-- =============================

-- Composite indexes for the most common combined filters on the
-- primary browse/search endpoint (status is applied on nearly every
-- query, paired with price or recency).
CREATE INDEX IF NOT EXISTS idx_cars_status_price ON cars(status, price);
CREATE INDEX IF NOT EXISTS idx_cars_status_created ON cars(status, created_at DESC);

-- Trigram index to make the ILIKE-based keyword search (see the
-- $text handling in utils/fieldMap.js / models/_base.js) fast at
-- scale instead of a sequential scan once inventory grows well
-- past 20,000 rows.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_cars_title_trgm ON cars USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cars_make_trgm ON cars USING gin (make gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cars_model_trgm ON cars USING gin (model gin_trgm_ops);

-- =============================
-- MIGRATION: inspector fields on users — referenced by
-- inspectorApplicationController.js's approveApplication() but
-- never existed as columns, meaning every approval attempt threw a
-- "column does not exist" error and failed.
-- =============================
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_inspector BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS inspection_specialty TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS inspections_completed INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_is_inspector ON users(is_inspector);

-- Missing table entirely — TABLE_MAP references "inspector_applications"
-- but it was never created. Columns matched exactly against every
-- field controllers/inspectorApplicationController.js actually reads
-- and writes (submitApplication/approveApplication).
CREATE TABLE IF NOT EXISTS inspector_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_number TEXT NOT NULL,
  location TEXT,
  years_of_experience INTEGER,
  specialties TEXT[],
  certifications TEXT[],
  tools_available TEXT,
  preferred_regions TEXT[],
  cv_url TEXT,
  certification_docs TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  assigned_specialty TEXT,
  assigned_region TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inspector_applications_status ON inspector_applications(status);
CREATE INDEX IF NOT EXISTS idx_inspector_applications_email ON inspector_applications(email);

-- =============================
-- MIGRATION: remaining cars fields referenced by carController.js's
-- createCar/updateCar (allowedFields whitelist + create-time fields)
-- that still didn't exist as columns.
-- =============================
ALTER TABLE cars ADD COLUMN IF NOT EXISTS chat_disabled BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS dealer_phone TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS escrow_enabled BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS logbook_verified BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS auction_start_time TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS auction_end TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS starting_bid NUMERIC;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS reserve_price NUMERIC;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS reserve_mode TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS promotion_expires_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS price_history JSONB DEFAULT '[]';

-- =============================
-- MIGRATION: users.approved and cars.favorites_count — referenced by
-- the /admin/stats aggregation (routes/adminRoutes.js) but never
-- existed, so that Promise.all([...]) threw and the whole admin
-- stats endpoint failed — which is why the admin dashboard was
-- showing hardcoded fake numbers instead of real ones.
-- =============================
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);

-- =============================
-- MIGRATION: two tables referenced throughout the codebase
-- (verificationController.js, contactController.js, adminRoutes.js
-- stats aggregation) that never existed at all.
-- =============================
CREATE TABLE IF NOT EXISTS dealer_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  dealer_id UUID REFERENCES users(id),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','under_review','approved','rejected')),
  rejection_reason TEXT,
  rejection_details JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  admin_notes TEXT,
  suspension_reason TEXT,
  suspension_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dealer_verifications_status ON dealer_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_dealer_verifications_user ON dealer_verifications(user_id);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contacts_read ON contacts(read);

-- =============================
-- MIGRATION: inspection_orders — the routes/inspectionRoutes.js
-- controller creates/reads/updates fields (fee, payment,
-- checkoutRequestID, location, checklist, overallScore,
-- conditionRating, inspectorNotes, images) that never existed as
-- columns, and filters by `buyer`/`car`/`inspector` which don't
-- match the real `requested_by`/`car_id`/`inspector_id` columns
-- (fixed via field aliases in utils/fieldMap.js). This means the
-- entire inspection booking + payment + report flow was broken.
-- =============================
ALTER TABLE inspection_orders ADD COLUMN IF NOT EXISTS fee NUMERIC;
ALTER TABLE inspection_orders ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);
ALTER TABLE inspection_orders ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE inspection_orders ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE inspection_orders ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]';
ALTER TABLE inspection_orders ADD COLUMN IF NOT EXISTS overall_score NUMERIC;
ALTER TABLE inspection_orders ADD COLUMN IF NOT EXISTS condition_rating TEXT;
ALTER TABLE inspection_orders ADD COLUMN IF NOT EXISTS inspector_notes TEXT;
ALTER TABLE inspection_orders ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_inspection_orders_requested_by ON inspection_orders(requested_by);
CREATE INDEX IF NOT EXISTS idx_inspection_orders_checkout ON inspection_orders(checkout_request_id);

-- =============================
-- MIGRATION: payments / mpesa_transactions — services/paymentService.js
-- and paymentCallback.service.js write and read fields that never
-- existed as columns (car, referenceId, referenceModel,
-- checkoutRequestId, mode, mpesaReceiptNumber, paidAt, processed on
-- payments; checkoutRequestID, status, carId, mpesaReceipt on
-- mpesa_transactions), and the payments.status CHECK constraint
-- didn't even allow 'success' — the literal value the entire
-- payment-confirmation flow writes on every successful payment.
-- This means payment status lookups (used by PaymentModal's polling,
-- which is the ONLY working confirmation path after the broken
-- socket effect was removed) could never actually detect success.
-- =============================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS car_id UUID REFERENCES cars(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_model TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS mpesa_receipt_number TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON payments(checkout_request_id);

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending','processing','success','completed','failed','refunded'));

ALTER TABLE mpesa_transactions ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE mpesa_transactions ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE mpesa_transactions ADD COLUMN IF NOT EXISTS car_id UUID REFERENCES cars(id);
ALTER TABLE mpesa_transactions ADD COLUMN IF NOT EXISTS mpesa_receipt TEXT;
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_checkout ON mpesa_transactions(checkout_request_id);

-- =============================
-- MIGRATION: final batch of fields found while tracing the full
-- payment confirmation flow (paymentService.js) — cars.isPaid/
-- paymentStatus, payments.resultDesc, and escrows.payment (aliased)
-- were all referenced but never existed.
-- =============================
ALTER TABLE cars ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS result_desc TEXT;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);

-- =============================
-- MIGRATION: bids/auctions/cars/payments — the bid-payment
-- completion flow (paymentCallback.service.js) references
-- bids.carId (bids only relate via auction_id, no direct car
-- reference existed), sets bid status to 'paid' and auction status
-- to 'completed'/'pending_payment' — none of which the CHECK
-- constraints allowed — and sets cars.highestBidder, which never
-- existed as a column.
-- =============================
ALTER TABLE bids ADD COLUMN IF NOT EXISTS car_id UUID REFERENCES cars(id);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS mpesa_receipt TEXT;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
CREATE INDEX IF NOT EXISTS idx_bids_car_id ON bids(car_id);

ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_status_check;
ALTER TABLE bids ADD CONSTRAINT bids_status_check
  CHECK (status IN ('active','pending','paid','outbid','won','lost','cancelled','refunded'));

ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_status_check;
ALTER TABLE auctions ADD CONSTRAINT auctions_status_check
  CHECK (status IN ('pending','pending_payment','active','paused','completed','ended','cancelled'));

ALTER TABLE payments ADD COLUMN IF NOT EXISTS bid_id UUID REFERENCES bids(id);

-- =============================
-- MIGRATION: escrows.status CHECK constraint didn't match the real
-- state machine (services/escrowStateMachine.js). The state machine
-- transitions through 'vehicle_confirmed', 'delivered', and 'closed'
-- — none of which the constraint allowed, meaning the escrow
-- lifecycle would break as soon as it tried to move past 'funded'.
-- Old constraint values kept for backward compatibility with any
-- existing rows/other callers.
-- =============================
ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_status_check;
ALTER TABLE escrows ADD CONSTRAINT escrows_status_check
  CHECK (status IN ('pending','funded','vehicle_confirmed','delivered','inspecting','approved','released','refunded','disputed','cancelled','closed'));

-- =============================
-- MIGRATION: escrows — services/escrow.service.js (the actual
-- escrow state machine logic: fund/confirm/deliver/release/refund/
-- dispute/close) references a large number of fields that never
-- existed as columns at all. This is the core money-holding
-- mechanism of the marketplace; none of these lifecycle transitions
-- could have persisted correctly before this fix.
-- =============================
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS commission NUMERIC;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS seller_amount NUMERIC;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]';
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS last_action_key TEXT;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS auto_release_eligible_at TIMESTAMPTZ;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '{}';
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS release_window_days INTEGER DEFAULT 3;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS vehicle_confirmed_at TIMESTAMPTZ;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS delivery_confirmed BOOLEAN DEFAULT false;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES users(id);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS refunded_by UUID REFERENCES users(id);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS dispute_reason TEXT;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS disputed_by UUID REFERENCES users(id);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_escrows_last_action_key ON escrows(last_action_key);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee NUMERIC;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS dealer_amount NUMERIC;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending','processing','success','completed','released','failed','refunded'));

-- =============================
-- MIGRATION: disputes — controllers/disputeController.js references
-- evidence/internalNotes/mediation/appeal/timeline fields and calls
-- a Mongoose-style dispute.addTimelineEntry() instance method, none
-- of which existed (the method is fixed generically in
-- models/_base.js instead). The status CHECK constraint also didn't
-- allow 'under_review'/'mediation' — two of the six real states in
-- services/disputeStateMachine.js.
-- =============================
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS internal_notes JSONB DEFAULT '[]';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS mediation JSONB DEFAULT '{}';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS appeal JSONB DEFAULT '{}';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS appealed_at TIMESTAMPTZ;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS mediation_started_at TIMESTAMPTZ;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS under_review_at TIMESTAMPTZ;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
ALTER TABLE disputes ADD CONSTRAINT disputes_status_check
  CHECK (status IN ('open','under_review','mediation','investigating','resolved','appealed','closed'));

-- =============================
-- MIGRATION: cars.winner — referenced across bidController.js,
-- escrowVaultController.js, and auction routes as a JSONB object
-- ({user, amount}), holding the winning bidder of a completed
-- auction. Never existed as a column at all.
-- =============================
ALTER TABLE cars ADD COLUMN IF NOT EXISTS winner JSONB;

-- =====================================================
-- DATABASE AUDIT FIXES — 2026-07-25
-- Comprehensive schema improvements from full audit
-- =====================================================

-- ─────────────────────────────────────────────────────
-- C1: Email verification columns
-- authController.js (lines 52,635,637,644,663,673)
-- writes/reads emailVerifyToken and emailVerifyExpire
-- ─────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expire TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_email_verify_token ON users(email_verify_token);

-- ─────────────────────────────────────────────────────
-- C3: ON DELETE rules for all foreign keys
-- Without these, deleting any parent row crashes with
-- a foreign key violation error.
-- ─────────────────────────────────────────────────────

-- users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_referred_by_fkey;
ALTER TABLE users ADD CONSTRAINT users_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL;

-- cars
ALTER TABLE cars DROP CONSTRAINT IF EXISTS cars_dealer_id_fkey;
ALTER TABLE cars ADD CONSTRAINT cars_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE cars DROP CONSTRAINT IF EXISTS cars_demo_edited_by_fkey;
ALTER TABLE cars ADD CONSTRAINT cars_demo_edited_by_fkey FOREIGN KEY (demo_edited_by) REFERENCES users(id) ON DELETE SET NULL;

-- auctions
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_car_id_fkey;
ALTER TABLE auctions ADD CONSTRAINT auctions_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_seller_id_fkey;
ALTER TABLE auctions ADD CONSTRAINT auctions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_highest_bidder_id_fkey;
ALTER TABLE auctions ADD CONSTRAINT auctions_highest_bidder_id_fkey FOREIGN KEY (highest_bidder_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_winner_id_fkey;
ALTER TABLE auctions ADD CONSTRAINT auctions_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL;

-- bids
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_auction_id_fkey;
ALTER TABLE bids ADD CONSTRAINT bids_auction_id_fkey FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE;
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_user_id_fkey;
ALTER TABLE bids ADD CONSTRAINT bids_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_car_id_fkey;
ALTER TABLE bids ADD CONSTRAINT bids_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL;

-- escrows
ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_car_id_fkey;
ALTER TABLE escrows ADD CONSTRAINT escrows_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL;
ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_buyer_id_fkey;
ALTER TABLE escrows ADD CONSTRAINT escrows_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_seller_id_fkey;
ALTER TABLE escrows ADD CONSTRAINT escrows_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_payment_id_fkey;
ALTER TABLE escrows ADD CONSTRAINT escrows_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_released_by_fkey;
ALTER TABLE escrows ADD CONSTRAINT escrows_released_by_fkey FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_refunded_by_fkey;
ALTER TABLE escrows ADD CONSTRAINT escrows_refunded_by_fkey FOREIGN KEY (refunded_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE escrows DROP CONSTRAINT IF EXISTS escrows_disputed_by_fkey;
ALTER TABLE escrows ADD CONSTRAINT escrows_disputed_by_fkey FOREIGN KEY (disputed_by) REFERENCES users(id) ON DELETE SET NULL;

-- payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_escrow_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_escrow_id_fkey FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE SET NULL;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_car_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_bid_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE SET NULL;

-- chats
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_car_id_fkey;
ALTER TABLE chats ADD CONSTRAINT chats_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL;

-- messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_chat_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- favorites
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE favorites ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_car_id_fkey;
ALTER TABLE favorites ADD CONSTRAINT favorites_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

-- reviews
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_user_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_dealer_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_car_id_fkey;
ALTER TABLE reviews ADD CONSTRAINT reviews_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL;

-- refresh_tokens
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- audit_logs
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- security_logs
ALTER TABLE security_logs DROP CONSTRAINT IF EXISTS security_logs_user_id_fkey;
ALTER TABLE security_logs ADD CONSTRAINT security_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- dealers
ALTER TABLE dealers DROP CONSTRAINT IF EXISTS dealers_user_id_fkey;
ALTER TABLE dealers ADD CONSTRAINT dealers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- dealer_health_scores
ALTER TABLE dealer_health_scores DROP CONSTRAINT IF EXISTS dealer_health_scores_dealer_id_fkey;
ALTER TABLE dealer_health_scores ADD CONSTRAINT dealer_health_scores_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES users(id) ON DELETE CASCADE;

-- disputes
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_escrow_id_fkey;
ALTER TABLE disputes ADD CONSTRAINT disputes_escrow_id_fkey FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE CASCADE;
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_opened_by_fkey;
ALTER TABLE disputes ADD CONSTRAINT disputes_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_opened_against_fkey;
ALTER TABLE disputes ADD CONSTRAINT disputes_opened_against_fkey FOREIGN KEY (opened_against) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_assigned_to_fkey;
ALTER TABLE disputes ADD CONSTRAINT disputes_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- leads
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_buyer_id_fkey;
ALTER TABLE leads ADD CONSTRAINT leads_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_dealer_id_fkey;
ALTER TABLE leads ADD CONSTRAINT leads_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_car_id_fkey;
ALTER TABLE leads ADD CONSTRAINT leads_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL;

-- support_tickets
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_assigned_to_fkey;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- search_analytics
ALTER TABLE search_analytics DROP CONSTRAINT IF EXISTS search_analytics_user_id_fkey;
ALTER TABLE search_analytics ADD CONSTRAINT search_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- vehicle_valuations
ALTER TABLE vehicle_valuations DROP CONSTRAINT IF EXISTS vehicle_valuations_car_id_fkey;
ALTER TABLE vehicle_valuations ADD CONSTRAINT vehicle_valuations_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

-- saved_searches
ALTER TABLE saved_searches DROP CONSTRAINT IF EXISTS saved_searches_user_id_fkey;
ALTER TABLE saved_searches ADD CONSTRAINT saved_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- escrow_vaults
ALTER TABLE escrow_vaults DROP CONSTRAINT IF EXISTS escrow_vaults_buyer_id_fkey;
ALTER TABLE escrow_vaults ADD CONSTRAINT escrow_vaults_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE escrow_vaults DROP CONSTRAINT IF EXISTS escrow_vaults_seller_id_fkey;
ALTER TABLE escrow_vaults ADD CONSTRAINT escrow_vaults_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE escrow_vaults DROP CONSTRAINT IF EXISTS escrow_vaults_escrow_id_fkey;
ALTER TABLE escrow_vaults ADD CONSTRAINT escrow_vaults_escrow_id_fkey FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE CASCADE;

-- fraud_detection
ALTER TABLE fraud_detection DROP CONSTRAINT IF EXISTS fraud_detection_user_id_fkey;
ALTER TABLE fraud_detection ADD CONSTRAINT fraud_detection_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- transactions
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_from_user_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_from_user_fkey FOREIGN KEY (from_user) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_to_user_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_to_user_fkey FOREIGN KEY (to_user) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_escrow_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_escrow_id_fkey FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE SET NULL;

-- ntsa_verification_requests
ALTER TABLE ntsa_verification_requests DROP CONSTRAINT IF EXISTS ntsa_verification_requests_car_id_fkey;
ALTER TABLE ntsa_verification_requests ADD CONSTRAINT ntsa_verification_requests_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;
ALTER TABLE ntsa_verification_requests DROP CONSTRAINT IF EXISTS ntsa_verification_requests_requested_by_fkey;
ALTER TABLE ntsa_verification_requests ADD CONSTRAINT ntsa_verification_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE;

-- inspection_orders
ALTER TABLE inspection_orders DROP CONSTRAINT IF EXISTS inspection_orders_car_id_fkey;
ALTER TABLE inspection_orders ADD CONSTRAINT inspection_orders_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;
ALTER TABLE inspection_orders DROP CONSTRAINT IF EXISTS inspection_orders_inspector_id_fkey;
ALTER TABLE inspection_orders ADD CONSTRAINT inspection_orders_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE inspection_orders DROP CONSTRAINT IF EXISTS inspection_orders_requested_by_fkey;
ALTER TABLE inspection_orders ADD CONSTRAINT inspection_orders_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE inspection_orders DROP CONSTRAINT IF EXISTS inspection_orders_payment_id_fkey;
ALTER TABLE inspection_orders ADD CONSTRAINT inspection_orders_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- escrow_anomalies
ALTER TABLE escrow_anomalies DROP CONSTRAINT IF EXISTS escrow_anomalies_escrow_id_fkey;
ALTER TABLE escrow_anomalies ADD CONSTRAINT escrow_anomalies_escrow_id_fkey FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE CASCADE;
ALTER TABLE escrow_anomalies DROP CONSTRAINT IF EXISTS escrow_anomalies_flagged_by_fkey;
ALTER TABLE escrow_anomalies ADD CONSTRAINT escrow_anomalies_flagged_by_fkey FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE escrow_anomalies DROP CONSTRAINT IF EXISTS escrow_anomalies_reviewed_by_fkey;
ALTER TABLE escrow_anomalies ADD CONSTRAINT escrow_anomalies_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- escrow_risk_scores
ALTER TABLE escrow_risk_scores DROP CONSTRAINT IF EXISTS escrow_risk_scores_user_id_fkey;
ALTER TABLE escrow_risk_scores ADD CONSTRAINT escrow_risk_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- escrow_audits
ALTER TABLE escrow_audits DROP CONSTRAINT IF EXISTS escrow_audits_escrow_id_fkey;
ALTER TABLE escrow_audits ADD CONSTRAINT escrow_audits_escrow_id_fkey FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE CASCADE;
ALTER TABLE escrow_audits DROP CONSTRAINT IF EXISTS escrow_audits_performed_by_fkey;
ALTER TABLE escrow_audits ADD CONSTRAINT escrow_audits_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL;

-- auction_integrity_flags
ALTER TABLE auction_integrity_flags DROP CONSTRAINT IF EXISTS auction_integrity_flags_auction_id_fkey;
ALTER TABLE auction_integrity_flags ADD CONSTRAINT auction_integrity_flags_auction_id_fkey FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE;
ALTER TABLE auction_integrity_flags DROP CONSTRAINT IF EXISTS auction_integrity_flags_flagged_by_fkey;
ALTER TABLE auction_integrity_flags ADD CONSTRAINT auction_integrity_flags_flagged_by_fkey FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE auction_integrity_flags DROP CONSTRAINT IF EXISTS auction_integrity_flags_reviewed_by_fkey;
ALTER TABLE auction_integrity_flags ADD CONSTRAINT auction_integrity_flags_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- auction_risk_profiles
ALTER TABLE auction_risk_profiles DROP CONSTRAINT IF EXISTS auction_risk_profiles_user_id_fkey;
ALTER TABLE auction_risk_profiles ADD CONSTRAINT auction_risk_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- evidence
ALTER TABLE evidence DROP CONSTRAINT IF EXISTS evidence_dispute_id_fkey;
ALTER TABLE evidence ADD CONSTRAINT evidence_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES disputes(id) ON DELETE CASCADE;
ALTER TABLE evidence DROP CONSTRAINT IF EXISTS evidence_uploaded_by_fkey;
ALTER TABLE evidence ADD CONSTRAINT evidence_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE evidence DROP CONSTRAINT IF EXISTS evidence_reviewed_by_fkey;
ALTER TABLE evidence ADD CONSTRAINT evidence_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- admin_alerts
ALTER TABLE admin_alerts DROP CONSTRAINT IF EXISTS admin_alerts_acknowledged_by_fkey;
ALTER TABLE admin_alerts ADD CONSTRAINT admin_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL;

-- reports
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_generated_by_fkey;
ALTER TABLE reports ADD CONSTRAINT reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL;

-- notification_audit
ALTER TABLE notification_audit DROP CONSTRAINT IF EXISTS notification_audit_notification_id_fkey;
ALTER TABLE notification_audit ADD CONSTRAINT notification_audit_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE;

-- mpesa_transactions
ALTER TABLE mpesa_transactions DROP CONSTRAINT IF EXISTS mpesa_transactions_car_id_fkey;
ALTER TABLE mpesa_transactions ADD CONSTRAINT mpesa_transactions_car_id_fkey FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL;

-- user_profiles: dropped (M4)

-- inspector_applications
ALTER TABLE inspector_applications DROP CONSTRAINT IF EXISTS inspector_applications_user_id_fkey;
ALTER TABLE inspector_applications ADD CONSTRAINT inspector_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE inspector_applications DROP CONSTRAINT IF EXISTS inspector_applications_reviewed_by_fkey;
ALTER TABLE inspector_applications ADD CONSTRAINT inspector_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- dealer_verifications
ALTER TABLE dealer_verifications DROP CONSTRAINT IF EXISTS dealer_verifications_user_id_fkey;
ALTER TABLE dealer_verifications ADD CONSTRAINT dealer_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE dealer_verifications DROP CONSTRAINT IF EXISTS dealer_verifications_dealer_id_fkey;
ALTER TABLE dealer_verifications ADD CONSTRAINT dealer_verifications_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE dealer_verifications DROP CONSTRAINT IF EXISTS dealer_verifications_reviewed_by_fkey;
ALTER TABLE dealer_verifications ADD CONSTRAINT dealer_verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────
-- C4/L4: updated_at triggers for all tables with
-- updated_at columns. The function was defined but
-- never attached to any table.
-- ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON cars;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON auctions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON auctions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON escrows;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON escrows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON payments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON reviews;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON dealers;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON dealers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON disputes;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON leads;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON support_tickets;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON feature_flags;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON organizations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON escrow_vaults;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON escrow_vaults FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON platform_config;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON platform_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON announcements;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON subscriptions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- user_profiles trigger: dropped (M4)
DROP TRIGGER IF EXISTS set_updated_at ON inspector_applications;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON inspector_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON dealer_verifications;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON dealer_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON contacts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────
-- H3, H4, H5, H8: Missing indexes for performance
-- ─────────────────────────────────────────────────────
-- H3: GIN index for UUID[] participant lookup in chats
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats USING GIN (participants);
-- H4: Composite index for message loading (every chat load)
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);
-- H5: Composite index for dealer dashboard (active listings)
CREATE INDEX IF NOT EXISTS idx_cars_dealer_status ON cars(dealer_id, status);
-- H8: Partial indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_cars_featured_true ON cars(featured) WHERE featured = true;

-- ─────────────────────────────────────────────────────
-- M2: JSONB indexes for queryable JSON columns
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cars_price_history ON cars USING GIN (price_history);
CREATE INDEX IF NOT EXISTS idx_escrows_history ON escrows USING GIN (history);
CREATE INDEX IF NOT EXISTS idx_escrows_timeline ON escrows USING GIN (timeline);
CREATE INDEX IF NOT EXISTS idx_disputes_evidence ON disputes USING GIN (evidence);
CREATE INDEX IF NOT EXISTS idx_disputes_timeline ON disputes USING GIN (timeline);

-- ─────────────────────────────────────────────────────
-- M5: UNIQUE constraint on payment reference
-- ─────────────────────────────────────────────────────
-- NOTE: Run DELETE duplicate rows first if this fails:
-- DELETE FROM mpesa_transactions WHERE id NOT IN
--   (SELECT MIN(id) FROM mpesa_transactions GROUP BY checkout_request_id);
ALTER TABLE mpesa_transactions ADD CONSTRAINT uq_mpesa_checkout UNIQUE (checkout_request_id);

-- ─────────────────────────────────────────────────────
-- L1: Row Level Security policies
-- service_role (backend) bypasses RLS entirely.
-- anon key (frontend) is subject to these policies.
-- ─────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Public read for marketplace data
CREATE POLICY "cars_public_read" ON cars FOR SELECT USING (status NOT IN ('hidden', 'draft'));
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (status = 'approved');

-- Users own their data
CREATE POLICY "users_own_select" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_own_update" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "notifications_own_all" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "favorites_own_all" ON favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "messages_own_select" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND auth.uid() = ANY(chats.participants))
);
CREATE POLICY "chats_own_select" ON chats FOR SELECT USING (auth.uid() = ANY(participants));

-- ─────────────────────────────────────────────────────
-- L3: CHECK constraints for data integrity
-- ─────────────────────────────────────────────────────
ALTER TABLE cars ADD CONSTRAINT cars_year_check CHECK (year >= 1900 AND year <= 2030);
ALTER TABLE users ADD CONSTRAINT users_commission_check CHECK (commission >= 0 AND commission <= 100);
ALTER TABLE users ADD CONSTRAINT users_dealer_rating_check CHECK (dealer_rating >= 0 AND dealer_rating <= 5);
ALTER TABLE cars ADD CONSTRAINT cars_mileage_check CHECK (mileage >= 0);

-- =====================================================
-- ARCHITECTURAL IMPROVEMENTS — 2026-07-25
-- H1: user_auth split, H2: auction consolidation,
-- M1: audit log retention, M4: user_profiles dropped
-- =====================================================

-- ─────────────────────────────────────────────────────
-- H1: USER AUTH (split from users table)
-- Auth fields moved to dedicated table so profile queries
-- can never accidentally expose passwords or tokens.
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password TEXT,
  token_version INTEGER DEFAULT 0,
  must_change_password BOOLEAN DEFAULT false,
  login_attempts INTEGER DEFAULT 0,
  lock_until TIMESTAMPTZ,
  reset_token TEXT,
  reset_token_expire TIMESTAMPTZ,
  email_verify_token TEXT,
  email_verify_expire TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_auth_user ON user_auth(user_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_reset_token ON user_auth(reset_token);
CREATE INDEX IF NOT EXISTS idx_user_auth_email_verify_token ON user_auth(email_verify_token);

-- Migration: populate user_auth from existing users data
INSERT INTO user_auth (user_id, password, token_version, must_change_password, login_attempts, lock_until, reset_token, reset_token_expire, email_verify_token, email_verify_expire)
SELECT id, password, COALESCE(token_version, 0), COALESCE(must_change_password, false), COALESCE(login_attempts, 0), lock_until, reset_token, reset_token_expire, email_verify_token, email_verify_expire
FROM users
WHERE password IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

DROP TRIGGER IF EXISTS set_updated_at ON user_auth;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_auth FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_auth ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────
-- H2: AUCTION CONSOLIDATION
-- Add missing columns to auctions so auction data lives in
-- one place instead of split between cars and auctions.
-- ─────────────────────────────────────────────────────
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS bids_count INTEGER DEFAULT 0;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS reserve_mode TEXT DEFAULT 'strict';
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS has_auction BOOLEAN DEFAULT false;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS allow_bid BOOLEAN DEFAULT false;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS allow_buy BOOLEAN DEFAULT true;

-- Sync auction flags from cars → auctions where auction rows exist
UPDATE auctions a
SET
  has_auction = true,
  allow_bid = COALESCE(c.allow_bid, false),
  allow_buy = COALESCE(c.allow_buy, true),
  reserve_mode = COALESCE(c.reserve_mode, 'strict'),
  bids_count = COALESCE(c.bids_count, 0)
FROM cars c
WHERE a.car_id = c.id
  AND c.has_auction = true;

-- ─────────────────────────────────────────────────────
-- M1: AUDIT LOG RETENTION
-- Cleanup function for old audit/security data.
-- Schedule via pg_cron: SELECT cron.schedule('audit-cleanup', '0 2 1 * *', 'SELECT cleanup_old_audit_logs(365)');
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE created_at < now() - (retention_days || ' days')::INTERVAL;
  DELETE FROM security_logs WHERE created_at < now() - (retention_days || ' days')::INTERVAL;
  DELETE FROM notification_audit WHERE sent_at < now() - (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- C3: MISSING TABLES FOR MONGOOSE MODEL REPLACEMENT
-- These tables back features that were previously MongoDB-only.
-- =====================================================

-- Transaction ledger (richer than the base transactions table)
CREATE TABLE IF NOT EXISTS transaction_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id TEXT UNIQUE NOT NULL,
  escrow_id UUID REFERENCES escrows(id),
  car_id UUID REFERENCES cars(id),
  from_user UUID REFERENCES users(id),
  to_user UUID REFERENCES users(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KES',
  type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  transaction_hash TEXT,
  previous_hash TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_escrow ON transaction_ledger(escrow_id);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_hash ON transaction_ledger(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_type ON transaction_ledger(type);

-- Localization / translations
CREATE TABLE IF NOT EXISTS localizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL DEFAULT 'common',
  key TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(namespace, key, locale)
);
CREATE INDEX IF NOT EXISTS idx_localizations_locale ON localizations(locale);
CREATE INDEX IF NOT EXISTS idx_localizations_namespace ON localizations(namespace);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  notifications JSONB DEFAULT '{}',
  privacy JSONB DEFAULT '{}',
  display JSONB DEFAULT '{}',
  bidding JSONB DEFAULT '{}',
  search JSONB DEFAULT '{}',
  accessibility JSONB DEFAULT '{}',
  recent_searches JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- Bidder deposits
CREATE TABLE IF NOT EXISTS bidder_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  auction_id UUID REFERENCES auctions(id),
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'held' CHECK (status IN ('held','refunded','forfeited')),
  mpesa_receipt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bidder_deposits_user ON bidder_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_bidder_deposits_auction ON bidder_deposits(auction_id);

-- Bid logs (detailed audit trail for bids)
CREATE TABLE IF NOT EXISTS bid_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID REFERENCES bids(id),
  user_id UUID REFERENCES users(id),
  auction_id UUID REFERENCES auctions(id),
  car_id UUID REFERENCES cars(id),
  amount NUMERIC NOT NULL,
  previous_amount NUMERIC,
  increment NUMERIC,
  source TEXT DEFAULT 'web',
  ip_address TEXT,
  user_agent TEXT,
  pseudonym TEXT,
  is_proxy BOOLEAN DEFAULT false,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bid_logs_bid ON bid_logs(bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_logs_auction ON bid_logs(auction_id);
CREATE INDEX IF NOT EXISTS idx_bid_logs_user ON bid_logs(user_id);

DROP TRIGGER IF EXISTS set_updated_at ON localizations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON localizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON user_preferences;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS set_updated_at ON bidder_deposits;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON bidder_deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- M6: MISSING FK INDEXES (71 unindexed foreign keys)
-- =====================================================

-- disputes: 0 indexes on 4 FK columns (core business logic)
CREATE INDEX IF NOT EXISTS idx_disputes_escrow_id ON disputes(escrow_id);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON disputes(opened_by);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_against ON disputes(opened_against);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_to ON disputes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- leads: 0 indexes on 3 FK columns
CREATE INDEX IF NOT EXISTS idx_leads_buyer_id ON leads(buyer_id);
CREATE INDEX IF NOT EXISTS idx_leads_dealer_id ON leads(dealer_id);
CREATE INDEX IF NOT EXISTS idx_leads_car_id ON leads(car_id);

-- transactions: 0 indexes on 3 FK columns
CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions(to_user);
CREATE INDEX IF NOT EXISTS idx_transactions_escrow_id ON transactions(escrow_id);

-- escrow_vaults: 0 indexes on 3 FK columns
CREATE INDEX IF NOT EXISTS idx_escrow_vaults_buyer_id ON escrow_vaults(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_vaults_seller_id ON escrow_vaults(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_vaults_escrow_id ON escrow_vaults(escrow_id);

-- payments: missing escrow_id, car_id, bid_id
CREATE INDEX IF NOT EXISTS idx_payments_escrow_id ON payments(escrow_id);
CREATE INDEX IF NOT EXISTS idx_payments_car_id ON payments(car_id);
CREATE INDEX IF NOT EXISTS idx_payments_bid_id ON payments(bid_id);

-- escrows: missing car_id, payment_id
CREATE INDEX IF NOT EXISTS idx_escrows_car_id ON escrows(car_id);
CREATE INDEX IF NOT EXISTS idx_escrows_payment_id ON escrows(payment_id);

-- support_tickets: 0 indexes on 2 FK columns
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- escrow_anomalies: 0 indexes
CREATE INDEX IF NOT EXISTS idx_escrow_anomalies_escrow_id ON escrow_anomalies(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_anomalies_flagged_by ON escrow_anomalies(flagged_by);

-- escrow_audits: 0 indexes
CREATE INDEX IF NOT EXISTS idx_escrow_audits_escrow_id ON escrow_audits(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_audits_performed_by ON escrow_audits(performed_by);

-- auction_integrity_flags: 0 indexes
CREATE INDEX IF NOT EXISTS idx_auction_integrity_flags_auction_id ON auction_integrity_flags(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_integrity_flags_flagged_by ON auction_integrity_flags(flagged_by);

-- evidence: 0 indexes
CREATE INDEX IF NOT EXISTS idx_evidence_dispute_id ON evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON evidence(uploaded_by);

-- notification_audit
CREATE INDEX IF NOT EXISTS idx_notification_audit_notification_id ON notification_audit(notification_id);

-- risk/fraud tables
CREATE INDEX IF NOT EXISTS idx_auction_risk_profiles_user_id ON auction_risk_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_risk_scores_user_id ON escrow_risk_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detection_user_id ON fraud_detection(user_id);

-- auctions: bidder/winner FK columns
CREATE INDEX IF NOT EXISTS idx_auctions_highest_bidder_id ON auctions(highest_bidder_id);
CREATE INDEX IF NOT EXISTS idx_auctions_winner_id ON auctions(winner_id);

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_car_id ON reviews(car_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- chats
CREATE INDEX IF NOT EXISTS idx_chats_car_id ON chats(car_id);

-- favorites: car_id-only lookups (UNIQUE(user_id,car_id) can't serve these)
CREATE INDEX IF NOT EXISTS idx_favorites_car_id ON favorites(car_id);

-- users: referral lookups
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- inspector_applications
CREATE INDEX IF NOT EXISTS idx_inspector_applications_user_id ON inspector_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_inspector_applications_reviewed_by ON inspector_applications(reviewed_by);

-- dealer_verifications
CREATE INDEX IF NOT EXISTS idx_dealer_verifications_dealer_id ON dealer_verifications(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_verifications_reviewed_by ON dealer_verifications(reviewed_by);

-- subscriptions, saved_searches, search_analytics
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);

-- admin_alerts, reports
CREATE INDEX IF NOT EXISTS idx_admin_alerts_acknowledged_by ON admin_alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);

-- vehicle_valuations, listing_quality
CREATE INDEX IF NOT EXISTS idx_vehicle_valuations_car_id ON vehicle_valuations(car_id);
CREATE INDEX IF NOT EXISTS idx_listing_quality_car_id ON listing_quality(car_id);

-- inspection_orders
CREATE INDEX IF NOT EXISTS idx_inspection_orders_car_id ON inspection_orders(car_id);
CREATE INDEX IF NOT EXISTS idx_inspection_orders_inspector_id ON inspection_orders(inspector_id);

-- ntsa_verification_requests
CREATE INDEX IF NOT EXISTS idx_ntsa_verification_requests_car_id ON ntsa_verification_requests(car_id);
CREATE INDEX IF NOT EXISTS idx_ntsa_verification_requests_requested_by ON ntsa_verification_requests(requested_by);

-- mpesa_transactions
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_car_id ON mpesa_transactions(car_id);

-- dealer_health_scores
CREATE INDEX IF NOT EXISTS idx_dealer_health_scores_dealer_id ON dealer_health_scores(dealer_id);

-- bid_logs (car_id)
CREATE INDEX IF NOT EXISTS idx_bid_logs_car_id ON bid_logs(car_id);

-- transaction_ledger
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_car_id ON transaction_ledger(car_id);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_from_user ON transaction_ledger(from_user);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_to_user ON transaction_ledger(to_user);

-- cars: demo_edited_by
CREATE INDEX IF NOT EXISTS idx_cars_demo_edited_by ON cars(demo_edited_by);

-- =====================================================
-- COMPOSITE INDEXES (high-value multi-column queries)
-- =====================================================

-- Bids: highest bid per auction
CREATE INDEX IF NOT EXISTS idx_bids_auction_amount_desc ON bids(auction_id, amount DESC);
CREATE INDEX IF NOT EXISTS idx_bids_auction_status ON bids(auction_id, status);

-- Escrows: dashboard filters
CREATE INDEX IF NOT EXISTS idx_escrows_buyer_status ON escrows(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_escrows_seller_status ON escrows(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_escrows_car_status ON escrows(car_id, status);

-- Payments: user history
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payments(user_id, created_at DESC);

-- Reviews: filtered listings
CREATE INDEX IF NOT EXISTS idx_reviews_dealer_status ON reviews(dealer_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_car_status ON reviews(car_id, status);

-- Notifications: feed
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Disputes: filtered lookups
CREATE INDEX IF NOT EXISTS idx_disputes_escrow_status ON disputes(escrow_id, status);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_status ON disputes(assigned_to, status);

-- Support tickets: filtered views
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_status ON support_tickets(assigned_to, status);

-- Leads: pipeline view
CREATE INDEX IF NOT EXISTS idx_leads_dealer_status ON leads(dealer_id, status);

-- Inspector schedule
CREATE INDEX IF NOT EXISTS idx_inspection_orders_inspector_status ON inspection_orders(inspector_id, status);

-- Cars: dealer promoted listings
CREATE INDEX IF NOT EXISTS idx_cars_dealer_featured ON cars(dealer_id, featured, created_at DESC);

-- Admin alerts: unacknowledged by severity
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity_ack ON admin_alerts(severity, acknowledged);

-- =====================================================
-- END OF AUDIT FIXES
-- =====================================================
