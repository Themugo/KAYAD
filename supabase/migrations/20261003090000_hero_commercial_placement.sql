-- Commercial hero placement scheduling and pricing.
-- Keeps the existing homepage hero footprint while allowing paid, scheduled
-- vehicle placements to participate in the same rotation.
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS hero_commercial JSONB NOT NULL DEFAULT '{"enabled":true,"rotationMode":"equal","defaultSlotSeconds":15,"packages":[{"id":"hero-15","label":"15-second Hero Spotlight","seconds":15,"price":2500},{"id":"hero-30","label":"30-second Hero Spotlight","seconds":30,"price":4500},{"id":"hero-60","label":"60-second Hero Spotlight","seconds":60,"price":8000}]}'::jsonb;

CREATE TABLE IF NOT EXISTS public.hero_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  package_id text NOT NULL,
  slot_seconds integer NOT NULL DEFAULT 15 CHECK (slot_seconds BETWEEN 5 AND 300),
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'KES',
  requested_start_at timestamptz,
  requested_end_at timestamptz,
  assigned_start_at timestamptz,
  assigned_end_at timestamptz,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','paid','pending_review','scheduled','active','expired','rejected','cancelled')),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hero_placements_dates_valid CHECK (
    (requested_end_at IS NULL OR requested_start_at IS NULL OR requested_end_at > requested_start_at)
    AND (assigned_end_at IS NULL OR assigned_start_at IS NULL OR assigned_end_at > assigned_start_at)
  )
);

CREATE INDEX IF NOT EXISTS idx_hero_placements_schedule ON public.hero_placements(status, assigned_start_at, assigned_end_at);
CREATE INDEX IF NOT EXISTS idx_hero_placements_seller ON public.hero_placements(seller_id, created_at DESC);

ALTER TABLE public.hero_placements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hero_placements_public_active ON public.hero_placements;
CREATE POLICY hero_placements_public_active ON public.hero_placements FOR SELECT USING (status IN ('scheduled','active') AND assigned_start_at IS NOT NULL AND assigned_end_at IS NOT NULL AND now() >= assigned_start_at AND now() < assigned_end_at);
DROP POLICY IF EXISTS hero_placements_owner_read ON public.hero_placements;
CREATE POLICY hero_placements_owner_read ON public.hero_placements FOR SELECT USING (seller_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS hero_placements_admin_write ON public.hero_placements;
CREATE POLICY hero_placements_admin_write ON public.hero_placements FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
