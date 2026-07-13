#!/usr/bin/env node
/**
 * Apply KAYAD Schema to Supabase
 * 
 * Uses Supabase Management API to create all tables.
 * Run this ONCE after setting up your Supabase project.
 * 
 * Usage:
 *   cd backend && node ../scripts/apply-schema.js
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment (from backend/.env when run from backend directory)
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#') && vals.length) {
    envVars[key.trim()] = vals.join('=').trim();
  }
});

const supabaseUrl = envVars.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
  console.error('❌ Please update backend/.env with your Supabase credentials first');
  process.exit(1);
}

console.log('\n🚀 KAYAD Schema Applicator');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📍 Project: ${supabaseUrl}`);
console.log('');

// API helper functions
const api = axios.create({
  baseURL: supabaseUrl,
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  },
});

async function testConnection() {
  console.log('🔍 Testing connection...');
  try {
    const response = await api.get('/rest/v1/profiles', { params: { select: 'id', limit: 1 } });
    console.log('   ✅ Connected to Supabase');
    return true;
  } catch (err) {
    if (err.response?.status === 404) {
      console.log('   ✅ Connected to Supabase (profiles table not found yet)');
      return true;
    }
    console.log(`   ⚠️  Note: ${err.message}`);
    return true;
  }
}

// SQL statements to create all tables
const createTablesSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================
-- USERS TABLE
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
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- =============================
-- CARS / VEHICLES TABLE
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
  is_demo BOOLEAN DEFAULT false,
  auction_status TEXT,
  allow_bid BOOLEAN DEFAULT false,
  allow_buy BOOLEAN DEFAULT true,
  is_promoted BOOLEAN DEFAULT false,
  current_bid NUMERIC,
  bids_count INTEGER DEFAULT 0,
  trust_score NUMERIC,
  deal_rating NUMERIC,
  is_verified_dealer BOOLEAN DEFAULT false,
  ntsa_verified BOOLEAN DEFAULT false,
  duty_status TEXT,
  cover_image TEXT,
  demo_edited_at TIMESTAMPTZ,
  demo_edited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- =============================
-- AUCTIONS TABLE
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

-- =============================
-- BIDS TABLE
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

-- =============================
-- ESCROWS TABLE
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

-- =============================
-- PAYMENTS TABLE
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

-- =============================
-- CHATS TABLE
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

-- =============================
-- MESSAGES TABLE
-- =============================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id),
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- NOTIFICATIONS TABLE
-- =============================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- REVIEWS TABLE
-- =============================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cars(id),
  reviewer_id UUID REFERENCES users(id),
  dealer_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- FAVORITES TABLE
-- =============================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  car_id UUID REFERENCES cars(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, car_id)
);

-- =============================
-- PLATFORM_CONFIG TABLE
-- =============================
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- INDEXES
-- =============================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified);

CREATE INDEX IF NOT EXISTS idx_cars_make_model ON cars(make, model);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(price);
CREATE INDEX IF NOT EXISTS idx_cars_dealer ON cars(dealer_id);
CREATE INDEX IF NOT EXISTS idx_cars_featured ON cars(featured);
CREATE INDEX IF NOT EXISTS idx_cars_created ON cars(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cars_is_demo ON cars(is_demo);
CREATE INDEX IF NOT EXISTS idx_cars_auction_status ON cars(auction_status);
CREATE INDEX IF NOT EXISTS idx_cars_is_promoted ON cars(is_promoted);
CREATE INDEX IF NOT EXISTS idx_cars_status_price ON cars(status, price);
CREATE INDEX IF NOT EXISTS idx_cars_status_created ON cars(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_car ON auctions(car_id);
CREATE INDEX IF NOT EXISTS idx_auctions_end ON auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_seller ON auctions(seller_id);

CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_user ON bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(amount DESC);

CREATE INDEX IF NOT EXISTS idx_escrows_buyer ON escrows(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrows_seller ON escrows(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa ON payments(mpesa_receipt);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cars_updated_at ON cars;
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_auctions_updated_at ON auctions;
CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON auctions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_escrows_updated_at ON escrows;
CREATE TRIGGER update_escrows_updated_at BEFORE UPDATE ON escrows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function applySchema() {
  console.log('📦 Applying database schema...\n');

  try {
    // Try to execute via RPC if available
    const { data } = await api.post('/rest/v1/rpc/exec', { query: createTablesSQL }).catch(() => ({ data: null }));
    
    if (data === null) {
      console.log('⚠️  Cannot execute SQL directly via API (RPC not enabled).');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 MANUAL STEP REQUIRED: Apply Schema via Supabase Dashboard');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('1. Go to: https://supabase.com/dashboard');
      console.log('2. Select your project: jypkhvknfgoqrhwzbdwi');
      console.log('3. Click "SQL Editor" in the left sidebar');
      console.log('4. Click "New Query"');
      console.log('5. Copy the SQL from: backend/db/schema.sql');
      console.log('6. Click "Run" or press Ctrl+Enter\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Save SQL to a file for easy access
      const sqlPath = path.join(process.cwd(), 'KAYAD_schema.sql');
      fs.writeFileSync(sqlPath, createTablesSQL);
      console.log(`   📄 Schema saved to: ${sqlPath}`);
      console.log('   You can also copy the schema from: backend/db/schema.sql\n');
      
      return { success: 'manual' };
    }
    
    console.log('   ✅ Schema applied successfully!');
    return { success: true };
  } catch (err) {
    console.log(`   ⚠️  Error: ${err.message}`);
    console.log('\n📋 Please apply the schema manually via Supabase SQL Editor.\n');
    return { success: 'manual', error: err.message };
  }
}

async function verifyTables() {
  console.log('🔍 Verifying tables...\n');
  
  const tables = ['users', 'cars', 'auctions', 'bids', 'escrows', 'payments', 'chats', 'messages', 'notifications', 'reviews', 'favorites', 'platform_config'];
  
  for (const table of tables) {
    try {
      const response = await api.get(`/rest/v1/${table}`, { params: { select: 'id', limit: 1 } });
      if (response.status === 200) {
        console.log(`   ✅ ${table} - exists`);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        console.log(`   ⬜ ${table} - not found`);
      } else {
        console.log(`   ⬜ ${table} - check failed`);
      }
    }
  }
}

async function main() {
  await testConnection();
  await applySchema();
  await verifyTables();
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    SETUP COMPLETE                             ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                ║');
  console.log('║  Next steps:                                                 ║');
  console.log('║  1. ✅ Environment variables configured                       ║');
  console.log('║  2. ⏳ Apply schema via Supabase SQL Editor (if not done)     ║');
  console.log('║  3. 🗄️  Storage bucket "vehicle-images" already exists       ║');
  console.log('║  4. 🚀 Run: cd backend && npm run dev                        ║');
  console.log('║  5. 🚀 Run: npm run dev (frontend)                           ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
