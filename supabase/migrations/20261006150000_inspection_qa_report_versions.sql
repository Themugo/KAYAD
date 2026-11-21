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

COMMIT;
