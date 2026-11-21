-- Brand normalisation (DA-05). Hosted platform_config was observed (read-only) with branding.logoText = 'KAYAD' and
-- platform_name = 'KAYARD ' (trailing space): the previous brand migration only matched the exact string 'KAYAD'.
-- This migration rewrites a brand-name value ONLY when, after trimming and collapsing whitespace and ignoring case, it is exactly one of
-- KAYAD / KAYARD / KAYAD KE / KAYARD KE. Everything else is left alone: dealer business names, domains (kayad.space), 'KAYAD-' reference
-- prefixes, the M-Pesa account reference, and any longer text that merely contains the word.
-- Forward-only, idempotent (a second run changes nothing). NOT applied to any hosted database by the author; owner decision required.
CREATE OR REPLACE FUNCTION pg_temp.kayard_is_brand_variant(v text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(regexp_replace(btrim(coalesce(v,'')), '\s+', ' ', 'g')) IN ('KAYAD','KAYARD','KAYAD KE','KAYARD KE')
$$;

DO $$
DECLARE k text;
BEGIN
  IF to_regclass('public.platform_config') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='platform_config' AND column_name='platform_name') THEN
      UPDATE public.platform_config SET platform_name = 'KAYARD KE'
       WHERE platform_name IS NOT NULL AND pg_temp.kayard_is_brand_variant(platform_name) AND platform_name IS DISTINCT FROM 'KAYARD KE';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='platform_config' AND column_name='branding' AND data_type='jsonb') THEN
      FOREACH k IN ARRAY ARRAY['logoText','platformName','siteName','brandName'] LOOP
        UPDATE public.platform_config
           SET branding = jsonb_set(branding, ARRAY[k], to_jsonb('KAYARD KE'::text))
         WHERE jsonb_typeof(branding) = 'object' AND jsonb_typeof(branding->k) = 'string'
           AND pg_temp.kayard_is_brand_variant(branding->>k) AND (branding->>k) IS DISTINCT FROM 'KAYARD KE';
      END LOOP;
    END IF;
  END IF;

  IF to_regclass('public.system_settings') IS NOT NULL THEN
    UPDATE public.system_settings SET value = to_jsonb('KAYARD KE'::text)
     WHERE key = 'platform_name' AND jsonb_typeof(value) = 'string' AND pg_temp.kayard_is_brand_variant(value #>> '{}') AND (value #>> '{}') IS DISTINCT FROM 'KAYARD KE';
  END IF;

  IF to_regclass('public.website_settings') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='website_settings' AND column_name='website_name') THEN
    UPDATE public.website_settings SET website_name = 'KAYARD KE'
     WHERE website_name IS NOT NULL AND pg_temp.kayard_is_brand_variant(website_name) AND website_name IS DISTINCT FROM 'KAYARD KE';
  END IF;
END $$;
