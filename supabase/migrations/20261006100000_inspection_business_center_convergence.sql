-- ============================================================
-- KAYAD INSPECTION BUSINESS CENTER CONVERGENCE
-- 20261006
--
-- Extends the canonical inspection_staff workforce and adds only
-- business-operational tables that do not duplicate inspection
-- providers, bookings, reports or digital inspections.
-- ============================================================

ALTER TABLE inspection_staff
  ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS home_county VARCHAR(100),
  ADD COLUMN IF NOT EXISTS home_town VARCHAR(100),
  ADD COLUMN IF NOT EXISTS avg_inspection_time_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS on_time_rate DECIMAL(5,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS engineer_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID NOT NULL REFERENCES inspection_staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  booking_id UUID REFERENCES inspection_bookings(id) ON DELETE SET NULL,
  location_name VARCHAR(255),
  location_address TEXT,
  estimated_travel_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(engineer_id, date, start_time)
);
CREATE INDEX IF NOT EXISTS idx_engineer_schedules_engineer_date ON engineer_schedules(engineer_id, date);

CREATE TABLE IF NOT EXISTS inspection_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  customer_type VARCHAR(50) NOT NULL DEFAULT 'private_buyer',
  company_name VARCHAR(255),
  tax_id VARCHAR(100),
  total_inspections INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_inspection_date DATE,
  average_rating DECIMAL(3,2) DEFAULT 0,
  preferred_location_type VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inspection_customers_provider ON inspection_customers(provider_id);
CREATE INDEX IF NOT EXISTS idx_inspection_customers_user ON inspection_customers(user_id);

CREATE TABLE IF NOT EXISTS report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  content JSONB DEFAULT '{}',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  sent_at TIMESTAMP,
  sent_via VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(report_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_report_versions_status ON report_versions(status);

CREATE TABLE IF NOT EXISTS report_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES report_versions(id) ON DELETE CASCADE,
  section VARCHAR(100) NOT NULL,
  issue_description TEXT NOT NULL,
  suggested_fix TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  jobs_completed INTEGER DEFAULT 0,
  jobs_cancelled INTEGER DEFAULT 0,
  jobs_rescheduled INTEGER DEFAULT 0,
  average_inspection_time_minutes INTEGER DEFAULT 0,
  gross_revenue DECIMAL(12,2) DEFAULT 0,
  net_revenue DECIMAL(12,2) DEFAULT 0,
  commission_paid DECIMAL(12,2) DEFAULT 0,
  engineer_hours_worked DECIMAL(8,2) DEFAULT 0,
  engineer_utilization_rate DECIMAL(5,2) DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  repeat_customers INTEGER DEFAULT 0,
  average_customer_rating DECIMAL(3,2) DEFAULT 0,
  reports_approved INTEGER DEFAULT 0,
  reports_rejected INTEGER DEFAULT 0,
  quality_score DECIMAL(5,2) DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider_id, metric_date, metric_type)
);

CREATE TABLE IF NOT EXISTS inspection_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,
  discount_value DECIMAL(10,2),
  min_order_value DECIMAL(10,2) DEFAULT 0,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  applicable_packages JSONB DEFAULT '[]',
  applicable_customers JSONB DEFAULT '[]',
  max_uses INTEGER,
  uses_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inspection_promos_provider_active ON inspection_promos(provider_id, is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS business_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500),
  file_type VARCHAR(50),
  file_size INTEGER,
  issue_date DATE,
  expiry_date DATE,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  engineer_id UUID REFERENCES inspection_staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_business_documents_provider_expiry ON business_documents(provider_id, expiry_date);

CREATE TABLE IF NOT EXISTS engineer_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id UUID NOT NULL REFERENCES inspection_staff(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  current_status VARCHAR(50) NOT NULL DEFAULT 'available',
  booking_id UUID REFERENCES inspection_bookings(id) ON DELETE SET NULL,
  accuracy_meters INTEGER,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_engineer_locations_engineer_time ON engineer_locations(engineer_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS business_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES inspection_providers(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  performed_by UUID REFERENCES users(id),
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_business_audit_provider_time ON business_audit_logs(provider_id, created_at DESC);

-- Provider-owned operational tables are readable/writable only by the
-- provider owner, provider workforce where explicitly applicable, or admins.
ALTER TABLE engineer_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inspection_business_provider_access ON engineer_schedules;
CREATE POLICY inspection_business_provider_access ON engineer_schedules FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM inspection_staff s JOIN inspection_providers p ON p.id=s.provider_id WHERE s.id=engineer_schedules.engineer_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin'))))
) WITH CHECK (EXISTS (SELECT 1 FROM inspection_staff s JOIN inspection_providers p ON p.id=s.provider_id WHERE s.id=engineer_schedules.engineer_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin')))));

DROP POLICY IF EXISTS inspection_business_provider_access ON inspection_customers;
CREATE POLICY inspection_business_provider_access ON inspection_customers FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM inspection_providers p WHERE p.id=inspection_customers.provider_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin'))))
) WITH CHECK (EXISTS (SELECT 1 FROM inspection_providers p WHERE p.id=inspection_customers.provider_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin')))));

DROP POLICY IF EXISTS inspection_business_provider_access ON business_metrics;
CREATE POLICY inspection_business_provider_access ON business_metrics FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM inspection_providers p WHERE p.id=business_metrics.provider_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin'))))
);

DROP POLICY IF EXISTS inspection_business_provider_access ON inspection_promos;
CREATE POLICY inspection_business_provider_access ON inspection_promos FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM inspection_providers p WHERE p.id=inspection_promos.provider_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin'))))
) WITH CHECK (EXISTS (SELECT 1 FROM inspection_providers p WHERE p.id=inspection_promos.provider_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin')))));

DROP POLICY IF EXISTS inspection_business_provider_access ON business_documents;
CREATE POLICY inspection_business_provider_access ON business_documents FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM inspection_providers p WHERE p.id=business_documents.provider_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin'))))
) WITH CHECK (EXISTS (SELECT 1 FROM inspection_providers p WHERE p.id=business_documents.provider_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin')))));

DROP POLICY IF EXISTS inspection_business_provider_access ON engineer_locations;
CREATE POLICY inspection_business_provider_access ON engineer_locations FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM inspection_staff s JOIN inspection_providers p ON p.id=s.provider_id WHERE s.id=engineer_locations.engineer_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin'))))
) WITH CHECK (EXISTS (SELECT 1 FROM inspection_staff s JOIN inspection_providers p ON p.id=s.provider_id WHERE s.id=engineer_locations.engineer_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin')))));

DROP POLICY IF EXISTS inspection_business_provider_access ON business_audit_logs;
CREATE POLICY inspection_business_provider_access ON business_audit_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM inspection_providers p WHERE p.id=business_audit_logs.provider_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin'))))
);

-- Report versions/corrections derive provider ownership through the canonical report -> booking chain.
DROP POLICY IF EXISTS inspection_business_report_access ON report_versions;
CREATE POLICY inspection_business_report_access ON report_versions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM inspection_reports r JOIN inspection_bookings b ON b.id=r.booking_id JOIN inspection_providers p ON p.id=b.provider_id
    WHERE r.id=report_versions.report_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin')))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM inspection_reports r JOIN inspection_bookings b ON b.id=r.booking_id JOIN inspection_providers p ON p.id=b.provider_id
    WHERE r.id=report_versions.report_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin')))
  )
);

DROP POLICY IF EXISTS inspection_business_report_correction_access ON report_corrections;
CREATE POLICY inspection_business_report_correction_access ON report_corrections FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM report_versions v JOIN inspection_reports r ON r.id=v.report_id JOIN inspection_bookings b ON b.id=r.booking_id JOIN inspection_providers p ON p.id=b.provider_id
    WHERE v.id=report_corrections.version_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin')))
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM report_versions v JOIN inspection_reports r ON r.id=v.report_id JOIN inspection_bookings b ON b.id=r.booking_id JOIN inspection_providers p ON p.id=b.provider_id
    WHERE v.id=report_corrections.version_id AND (p.user_id=auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id=auth.uid() AND u.role IN ('admin','superadmin')))
  )
);
