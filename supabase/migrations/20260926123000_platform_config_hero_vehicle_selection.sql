-- Persist the homepage hero vehicle selection in the existing platform config contract.
-- No new business entity is introduced; this only stores presentation selection.
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS hero_car_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hero_featured_mode TEXT NOT NULL DEFAULT 'all';

ALTER TABLE public.platform_config
  DROP CONSTRAINT IF EXISTS platform_config_hero_featured_mode_check;

ALTER TABLE public.platform_config
  ADD CONSTRAINT platform_config_hero_featured_mode_check
  CHECK (hero_featured_mode IN ('all', 'selected'));
