/*
# Activate the dormant inspection marketplace system (backend/inspection/)
# KAYAD - Pre-Purchase Inspection implementation, step 1

Per the forensic audit (docs/PRE_PURCHASE_INSPECTION_FORENSIC_AUDIT.md):
backend/inspection/ (2,711 lines: providerService, settlementService,
bookingService, reportService, providerController) is real, well-designed,
substantial application code that has never been mountable because none
of its 13 target tables exist. This migration creates them - purely
additive, no existing table touched.

Column names/types are derived directly from the real application code's
own db.create()/db.update() calls (read in full before writing this
migration, not guessed) for providers, bookings, reports, checklist
items, transactions, settlements, and reviews. For the three tables only
ever read from in the current code (inspection_staff, inspection_packages,
provider_credentials) and one not yet written to at all
(inspection_branches), columns are inferred from the specific fields the
real code reads off them (e.g. staff.first_name/last_name/role/photo_url/
provider_id) - narrower and more conservative than the fully-written
tables, since no create-call confirms their complete real shape yet.

## Design choices stated directly
- Every foreign key to a "customer"/"buyer" references the real, existing
  users(id) table - this system's own customer_id/user linkage was
  already scoped to real accounts in the application code, not a
  separate identity system.
- inspection_bookings.provider_id references the new inspection_providers
  table, NOT vehicle_inspections - this is a deliberate, confirmed
  finding from the audit: this is a genuinely separate system from the
  simpler routes/inspectionRoutes.js flow, not an extension of it.
- No column here references escrows or any vehicle-purchase-payment
  table - confirmed directly in the audit that zero escrow coupling
  exists in the real application code, and this migration preserves
  that boundary.
- JSONB used for breakdown/business_hours/findings/photos fields,
  matching exactly how the real application code treats them (arrays/
  objects passed straight through, not normalized into rows).
*/

CREATE TABLE IF NOT EXISTS inspection_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  trading_name TEXT,
  registration_number TEXT,
  tax_id TEXT,
  business_type TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  country TEXT DEFAULT 'Kenya',
  county TEXT,
  town TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  service_radius_km NUMERIC DEFAULT 50,
  description TEXT,
  logo_url TEXT,
  has_workshop BOOLEAN DEFAULT false,
  offers_mobile BOOLEAN DEFAULT true,
  mobile_inspection_fee NUMERIC DEFAULT 0,
  weekend_available BOOLEAN DEFAULT true,
  same_day_available BOOLEAN DEFAULT true,
  business_hours JSONB DEFAULT '{}',
  languages JSONB DEFAULT '["English","Swahili"]',
  vehicle_types JSONB DEFAULT '["cars","suvs"]',
  inspection_types JSONB DEFAULT '[]',
  commercial_vehicles BOOLEAN DEFAULT false,
  electric_vehicles BOOLEAN DEFAULT false,
  luxury_vehicles BOOLEAN DEFAULT false,
  years_in_business INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  verification_status TEXT DEFAULT 'unverified',
  commission_rate NUMERIC DEFAULT 15.0,
  payment_methods JSONB DEFAULT '["bank_transfer","mpesa"]',
  average_rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_providers_user ON inspection_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_providers_location ON inspection_providers(county, town);
CREATE INDEX IF NOT EXISTS idx_inspection_providers_status ON inspection_providers(status, verification_status);

-- Real code only ever reads staff.first_name/last_name/role/photo_url/
-- provider_id - no create() call found for this table in the current
-- application code, so this schema is inferred from read-usage only,
-- narrower/more conservative than the fully-written tables above.
CREATE TABLE IF NOT EXISTS inspection_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_staff_provider ON inspection_staff(provider_id);

-- Same basis as inspection_staff above: read-only usage in the current
-- code (pkg.name/description/price/currency/provider_id/inspection_type/
-- is_active/estimated_duration_minutes) - no create() call found yet.
CREATE TABLE IF NOT EXISTS inspection_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  inspection_type TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  estimated_duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_packages_provider ON inspection_packages(provider_id);

CREATE TABLE IF NOT EXISTS inspection_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT UNIQUE NOT NULL,
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE RESTRICT,
  package_id UUID REFERENCES inspection_packages(id) ON DELETE SET NULL,
  inspection_type TEXT,
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  vehicle_id UUID REFERENCES cars(id) ON DELETE SET NULL,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_registration TEXT,
  vehicle_vin TEXT,
  vehicle_type TEXT,
  inspection_country TEXT,
  inspection_county TEXT,
  inspection_town TEXT,
  inspection_address TEXT,
  inspection_latitude NUMERIC,
  inspection_longitude NUMERIC,
  is_mobile BOOLEAN DEFAULT true,
  seller_name TEXT,
  seller_phone TEXT,
  seller_is_dealer BOOLEAN DEFAULT false,
  scheduled_date DATE,
  scheduled_time TEXT,
  estimated_end_time TEXT,
  assigned_staff_id UUID REFERENCES inspection_staff(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'booked',
  customer_notes TEXT,
  internal_notes TEXT,
  cancellation_reason TEXT,
  base_price NUMERIC DEFAULT 0,
  mobile_fee NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  payment_status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  status_changed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_bookings_provider ON inspection_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_customer ON inspection_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_vehicle ON inspection_bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_status ON inspection_bookings(status);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_reference ON inspection_bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_inspection_bookings_schedule ON inspection_bookings(provider_id, scheduled_date);

CREATE TABLE IF NOT EXISTS inspection_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES inspection_bookings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES inspection_staff(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_status_history_booking ON inspection_status_history(booking_id);

CREATE TABLE IF NOT EXISTS inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES inspection_bookings(id) ON DELETE CASCADE,
  report_number TEXT UNIQUE NOT NULL,
  overall_score NUMERIC,
  overall_condition TEXT,
  engine_score NUMERIC,
  transmission_score NUMERIC,
  suspension_score NUMERIC,
  brakes_score NUMERIC,
  electrical_score NUMERIC,
  interior_score NUMERIC,
  exterior_score NUMERIC,
  body_score NUMERIC,
  paint_score NUMERIC,
  tyres_score NUMERIC,
  undercarriage_score NUMERIC,
  road_test_score NUMERIC,
  findings JSONB DEFAULT '[]',
  critical_issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  executive_summary TEXT,
  detailed_findings TEXT,
  technician_notes TEXT,
  road_test_performed BOOLEAN DEFAULT false,
  road_test_notes TEXT,
  road_test_distance_km NUMERIC,
  diagnostic_codes JSONB DEFAULT '[]',
  obd_scan_performed BOOLEAN DEFAULT false,
  photos JSONB DEFAULT '[]',
  quality_reviewed BOOLEAN DEFAULT false,
  quality_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  quality_reviewed_at TIMESTAMPTZ,
  quality_score NUMERIC,
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  share_token UUID,
  share_expires_at TIMESTAMPTZ,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_reports_booking ON inspection_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_share_token ON inspection_reports(share_token);

CREATE TABLE IF NOT EXISTS inspection_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_number INTEGER,
  item_name TEXT,
  status TEXT DEFAULT 'not_inspected',
  condition_notes TEXT,
  severity TEXT,
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_checklist_items_report ON inspection_checklist_items(report_id);

CREATE TABLE IF NOT EXISTS inspection_quality_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  auditor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  audit_score NUMERIC,
  findings JSONB DEFAULT '[]',
  checklist_accuracy NUMERIC,
  photo_quality NUMERIC,
  report_completeness NUMERIC,
  passed BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_quality_audits_report ON inspection_quality_audits(report_id);

CREATE TABLE IF NOT EXISTS inspection_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES inspection_bookings(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_reviews_provider ON inspection_reviews(provider_id, is_published);

CREATE TABLE IF NOT EXISTS inspection_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES inspection_bookings(id) ON DELETE SET NULL,
  settlement_id UUID,
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KES',
  status TEXT DEFAULT 'pending',
  description TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_transactions_provider ON inspection_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_inspection_transactions_booking ON inspection_transactions(booking_id);

CREATE TABLE IF NOT EXISTS inspection_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  settlement_reference TEXT UNIQUE NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  gross_amount NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  status TEXT DEFAULT 'pending',
  bookings_count INTEGER DEFAULT 0,
  breakdown JSONB DEFAULT '[]',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_settlements_provider ON inspection_settlements(provider_id);

ALTER TABLE inspection_transactions
  ADD CONSTRAINT fk_inspection_transactions_settlement
  FOREIGN KEY (settlement_id) REFERENCES inspection_settlements(id) ON DELETE SET NULL;

-- Referenced by the audit's own file inventory but not yet written to
-- or read from by any function body examined in this pass - included
-- for completeness/consistency with the real table-name inventory,
-- with a minimal, conservative shape pending confirmation of its real
-- intended use.
CREATE TABLE IF NOT EXISTS inspection_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  name TEXT,
  county TEXT,
  town TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_branches_provider ON inspection_branches(provider_id);

CREATE TABLE IF NOT EXISTS provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  credential_type TEXT,
  title TEXT,
  document_url TEXT,
  issued_by TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  verification_status TEXT DEFAULT 'unverified',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_credentials_provider ON provider_credentials(provider_id);
