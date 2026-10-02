-- KAYAD Auction Phase 9: post-auction fulfilment + exception control.
-- This extends the canonical auction_outcomes record; it does not create a
-- second auction engine or second ownership authority.

ALTER TABLE public.auction_outcomes
  ADD COLUMN IF NOT EXISTS collection_reference TEXT,
  ADD COLUMN IF NOT EXISTS collection_notes TEXT,
  ADD COLUMN IF NOT EXISTS collection_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS collection_updated_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS transfer_reference TEXT,
  ADD COLUMN IF NOT EXISTS transfer_notes TEXT,
  ADD COLUMN IF NOT EXISTS transfer_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_updated_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS owner_vehicle_id UUID REFERENCES public.owner_vehicles(id),
  ADD COLUMN IF NOT EXISTS escrow_release_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS dispute_reference UUID,
  ADD COLUMN IF NOT EXISTS dispute_opened_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_auction_outcomes_collection ON public.auction_outcomes(collection_status);
CREATE INDEX IF NOT EXISTS idx_auction_outcomes_transfer ON public.auction_outcomes(transfer_status);
CREATE INDEX IF NOT EXISTS idx_auction_outcomes_organizer_status ON public.auction_outcomes(organizer_id, status);

CREATE TABLE IF NOT EXISTS public.auction_fulfilment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_outcome_id UUID NOT NULL REFERENCES public.auction_outcomes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_id UUID REFERENCES public.users(id),
  reference TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auction_fulfilment_events_outcome ON public.auction_fulfilment_events(auction_outcome_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auction_fulfilment_events_type ON public.auction_fulfilment_events(event_type);

ALTER TABLE public.auction_fulfilment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auction_fulfilment_events_participant_select ON public.auction_fulfilment_events;
CREATE POLICY auction_fulfilment_events_participant_select ON public.auction_fulfilment_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.auction_outcomes o
    WHERE o.id = auction_fulfilment_events.auction_outcome_id
      AND (
        o.organizer_id = auth.uid()
        OR o.winner_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin','super_admin','staff'))
      )
  )
);
REVOKE ALL ON public.auction_fulfilment_events FROM anon, authenticated;
GRANT SELECT ON public.auction_fulfilment_events TO authenticated;
