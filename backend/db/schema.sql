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
RETURNS TRIGGER AS 
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
 LANGUAGE plpgsql;

-- =============================
-- RPC: increment_car_views
-- =============================
CREATE OR REPLACE FUNCTION increment_car_views(car_id UUID, increment_by INTEGER)
RETURNS void AS 
BEGIN
  UPDATE cars SET views = COALESCE(views, 0) + increment_by WHERE id = car_id;
END;
 LANGUAGE plpgsql;

-- Distributed locks
CREATE TABLE IF NOT EXISTS distributed_locks (
  resource_id TEXT PRIMARY KEY,
  holder TEXT NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Profiles/user preferences table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id),
  business_name TEXT,
  location TEXT,
  bio TEXT,
  avatar TEXT,
  phone TEXT,
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
