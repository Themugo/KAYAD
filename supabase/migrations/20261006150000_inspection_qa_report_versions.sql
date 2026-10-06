-- KAYAD INSPECTION QA REPORT VERSIONING
-- Canonical QA persistence for generated inspection reports.
-- This migration activates the existing business-center QA contract without
-- introducing a second inspection/report model.

BEGIN;

CREATE TABLE IF NOT EXISTS public.report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.inspection_reports(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_via VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_versions_status_check CHECK (status IN (
    'draft','engineer_complete','qa_review','corrections_requested','approved','sent','archived'
  )),
  CONSTRAINT report_versions_version_positive CHECK (version_number > 0),
  CONSTRAINT report_versions_report_version_unique UNIQUE (report_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_report_versions_report_status
  ON public.report_versions(report_id, status);
CREATE INDEX IF NOT EXISTS idx_report_versions_review_queue
  ON public.report_versions(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.report_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.report_versions(id) ON DELETE CASCADE,
  section VARCHAR(100) NOT NULL,
  issue_description TEXT NOT NULL,
  suggested_fix TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_corrections_status_check CHECK (status IN ('pending','fixed','rejected'))
);

CREATE INDEX IF NOT EXISTS idx_report_corrections_version_status
  ON public.report_corrections(version_id, status);

ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_corrections ENABLE ROW LEVEL SECURITY;

-- Canonical execution evidence stays on vehicle_inspections. This avoids reviving the
-- dormant digital_inspections / inspection_evidence subsystem.
ALTER TABLE public.vehicle_inspections
  ADD COLUMN IF NOT EXISTS inspection_booking_id UUID
    REFERENCES public.inspection_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS execution_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_submitted_by UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS execution_notes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_inspections_booking_execution
  ON public.vehicle_inspections(inspection_booking_id)
  WHERE inspection_booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_execution_status
  ON public.vehicle_inspections(status, execution_started_at, execution_completed_at);

COMMENT ON COLUMN public.vehicle_inspections.evidence IS
  'Canonical inspection execution evidence manifest: uploaded asset URL, type, checklist item, hash and actor metadata.';

COMMENT ON COLUMN public.vehicle_inspections.checklist IS
  'Canonical inspection execution checklist snapshot. Report generation consumes this evidence-backed checklist.';

COMMIT;

-- Review is the final customer gate before settlement. Keep the entire
-- review + lifecycle transition atomic so a successful review can never leave
-- the booking stranded between customer_reviewed and closed.
CREATE OR REPLACE FUNCTION public.kayad_submit_inspection_review_atomic(
  p_booking_id UUID,
  p_reviewer_id UUID,
  p_rating INTEGER,
  p_comment TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  b public.inspection_bookings%ROWTYPE;
  p public.inspection_providers%ROWTYPE;
  rid UUID;
BEGIN
  IF p_rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5'; END IF;
  SELECT * INTO b FROM public.inspection_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND OR b.customer_id<>p_reviewer_id OR b.status NOT IN ('report_generated','customer_reviewed','closed') OR b.payment_status<>'fully_paid' THEN
    RAISE EXCEPTION 'Only a completed paid inspection with a generated report can be reviewed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.inspection_reports r WHERE r.booking_id=b.id AND r.quality_reviewed=true) THEN
    RAISE EXCEPTION 'Inspection report must pass QA before customer review';
  END IF;
  SELECT * INTO p FROM public.inspection_providers WHERE id=b.provider_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Provider not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.inspection_reviews WHERE booking_id=b.id AND reviewer_id=p_reviewer_id) THEN
    RAISE EXCEPTION 'Review already submitted';
  END IF;
  INSERT INTO public.inspection_reviews(provider_id,booking_id,reviewer_id,rating,comment,is_published,created_at,updated_at)
  VALUES(p.id,b.id,p_reviewer_id,p_rating,NULLIF(trim(p_comment),''),true,now(),now()) RETURNING id INTO rid;
  INSERT INTO public.inspection_provider_scorecards(provider_id,completed_inspections,completed_reviews,average_customer_rating,last_calculated_at,created_at,updated_at)
  VALUES(p.id,1,1,p_rating,now(),now(),now())
  ON CONFLICT(provider_id) DO UPDATE SET completed_reviews=public.inspection_provider_scorecards.completed_reviews+1,
    average_customer_rating=round(((public.inspection_provider_scorecards.average_customer_rating*public.inspection_provider_scorecards.completed_reviews)+p_rating)/(public.inspection_provider_scorecards.completed_reviews+1),2),
    last_calculated_at=now(),updated_at=now();
  UPDATE public.inspection_bookings SET status='customer_reviewed', status_changed_at=now(), updated_at=now() WHERE id=b.id;
  UPDATE public.inspection_bookings SET status='closed', status_changed_at=now(), updated_at=now() WHERE id=b.id;
  RETURN jsonb_build_object('reviewId',rid,'providerId',p.id,'rating',p_rating,'bookingStatus','closed');
END;
$$;
REVOKE ALL ON FUNCTION public.kayad_submit_inspection_review_atomic(UUID,UUID,INTEGER,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kayad_submit_inspection_review_atomic(UUID,UUID,INTEGER,TEXT) TO service_role;
