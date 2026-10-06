-- KAYAD inspection QA segregation and runtime media integrity.
-- Adds reviewer provenance so the report lifecycle can enforce separation
-- between inspection execution and independent QA approval.
BEGIN;

ALTER TABLE public.report_versions
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_report_versions_qa_reviewed_by
  ON public.report_versions(reviewed_by, reviewed_at DESC);

COMMENT ON COLUMN public.report_versions.submitted_by IS
  'Identity that submitted this report version into QA; retained for segregation-of-duties auditability.';
COMMENT ON COLUMN public.report_versions.submitted_at IS
  'Timestamp at which this report version entered QA review.';

COMMIT;
