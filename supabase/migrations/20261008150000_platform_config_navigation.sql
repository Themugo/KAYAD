-- KAYAD navigation authority (Stage 14A).
-- Extends the existing singleton platform_config contract with one JSONB
-- presentation-state column. No new table, no new policy: platform_config keeps
-- RLS enabled with no anon/authenticated policies (service-role-only), and is
-- written only through PUT /api/admin/config.
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS navigation JSONB NOT NULL DEFAULT '{}'::jsonb;
