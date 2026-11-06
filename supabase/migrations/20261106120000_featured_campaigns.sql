-- Homepage featured-vehicle campaigns (Super Admin). OWNER-RUN. Additive and idempotent; no existing table changes.
-- A campaign puts one listing in the homepage hero/carousel between starts_at and ends_at (absolute instants; the admin screen
-- enters and shows Africa/Nairobi time, UTC+3, no daylight saving). The public site reads only campaigns that are active now.
CREATE TABLE IF NOT EXISTS public.featured_vehicle_campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id        uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  display_order integer NOT NULL DEFAULT 1 CHECK (display_order BETWEEN 1 AND 99),
  paused        boolean NOT NULL DEFAULT false,
  created_by    uuid,
  updated_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT featured_campaign_period CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_featured_campaigns_window ON public.featured_vehicle_campaigns (starts_at, ends_at) WHERE paused = false;
CREATE INDEX IF NOT EXISTS idx_featured_campaigns_car ON public.featured_vehicle_campaigns (car_id);

-- Append-only history: who did what, with the campaign as it was.
CREATE TABLE IF NOT EXISTS public.featured_vehicle_campaign_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,                  -- no FK: history survives deleting a campaign
  action      text NOT NULL CHECK (action IN ('created','updated','paused','resumed','ended','deleted')),
  snapshot    jsonb NOT NULL,
  actor_id    uuid,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_featured_campaign_history_at ON public.featured_vehicle_campaign_history (at DESC);

ALTER TABLE public.featured_vehicle_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_vehicle_campaign_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.featured_vehicle_campaigns FROM anon, authenticated;
REVOKE ALL ON public.featured_vehicle_campaign_history FROM anon, authenticated;
COMMENT ON TABLE public.featured_vehicle_campaigns IS 'Super Admin homepage featured-vehicle campaigns. Server reads with the service role.';
