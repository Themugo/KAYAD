-- G-24: one company name per dealership.
-- Additive and safe to replay: adds a normaliser, a review view and (only when existing data is clean) a unique index.
-- If duplicates already exist the index is NOT created and a NOTICE is raised; nothing is deleted or renamed. Resolve the rows listed in
-- public.dealer_business_name_conflicts and re-run the final DO block. Application code already enforces the company-name rule.

CREATE OR REPLACE FUNCTION public.kayad_normalize_business_name(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(lower(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g')), '')
$$;

CREATE OR REPLACE VIEW public.dealer_business_name_conflicts AS
SELECT public.kayad_normalize_business_name(business_name) AS normalized_name,
       count(*) AS dealer_count,
       array_agg(id ORDER BY id) AS dealer_ids
FROM public.dealers
WHERE public.kayad_normalize_business_name(business_name) IS NOT NULL
GROUP BY 1
HAVING count(*) > 1;

CREATE OR REPLACE VIEW public.dealers_missing_business_name AS
SELECT d.id AS dealer_id, d."user" AS user_id
FROM public.dealers d
WHERE public.kayad_normalize_business_name(d.business_name) IS NULL;

REVOKE ALL ON public.dealer_business_name_conflicts, public.dealers_missing_business_name FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.dealer_business_name_conflicts) THEN
    RAISE NOTICE 'dealers_business_name_unique NOT created: duplicate business names exist (see public.dealer_business_name_conflicts).';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS dealers_business_name_unique
      ON public.dealers (public.kayad_normalize_business_name(business_name))
      WHERE public.kayad_normalize_business_name(business_name) IS NOT NULL;
  END IF;
END $$;
