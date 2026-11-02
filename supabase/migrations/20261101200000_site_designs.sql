-- No-code public-site design editor: named designs (drafts) + an append-only publication history.
-- A design is a validated snapshot of settings the public site ALREADY consumes (platform_config branding / fonts / hero / announcement strip).
-- Publishing applies a snapshot to platform_config (the existing source of truth); this history is what enables identification of the
-- live design and rollback. Additive and idempotent; no existing table changes.
CREATE TABLE IF NOT EXISTS public.site_designs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  config      jsonb NOT NULL,
  revision    integer NOT NULL DEFAULT 1,
  created_by  uuid,
  updated_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_site_designs_name ON public.site_designs (lower(btrim(name)));

CREATE TABLE IF NOT EXISTS public.site_design_publications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id        uuid,                       -- no FK: history must survive deleting a design
  design_name      text NOT NULL,
  kind             text NOT NULL CHECK (kind IN ('publish','rollback')),
  snapshot         jsonb NOT NULL,             -- exactly what went live
  previous_snapshot jsonb,                     -- what was live immediately before (audit / recovery)
  source_publication_id uuid,                  -- for kind = 'rollback'
  published_by     uuid,
  published_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_site_design_publications_at ON public.site_design_publications (published_at DESC);

ALTER TABLE public.site_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_design_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_designs FROM anon, authenticated;
REVOKE ALL ON public.site_design_publications FROM anon, authenticated;
COMMENT ON TABLE public.site_designs IS 'Admin-authored public-site designs (drafts). Live site reads platform_config, never this table.';
