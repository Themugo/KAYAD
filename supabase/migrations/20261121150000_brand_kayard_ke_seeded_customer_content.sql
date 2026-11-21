-- Brand correction: customer-facing text SEEDED by earlier migrations still said "KAYAD". The brand is "KAYARD KE".
-- Forward-only and idempotent. It only rewrites the brand word in rows that still contain it, never touches
-- technical identifiers (codes, keys, reference prefixes such as KAYAD-IR-, table/function names), and a second run changes nothing.
-- NOT applied to any hosted database by the author: REQUIRES OWNER DECISION to apply with the other pending migrations.
DO $$
DECLARE brand_re constant text := '\mKAYAD\M(?!-)';
BEGIN
  IF to_regclass('public.system_settings') IS NOT NULL THEN
    UPDATE public.system_settings SET value = to_jsonb('KAYARD KE'::text) WHERE key = 'platform_name' AND value = to_jsonb('KAYAD'::text);
  END IF;

  IF to_regclass('public.platform_config') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='platform_config' AND column_name='platform_name') THEN
      UPDATE public.platform_config SET platform_name = 'KAYARD KE' WHERE platform_name = 'KAYAD';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='platform_config' AND column_name='hero_presentation') THEN
      UPDATE public.platform_config
      SET hero_presentation = jsonb_set(hero_presentation, '{tickerFallbackText}', to_jsonb(regexp_replace(hero_presentation->>'tickerFallbackText', brand_re, 'KAYARD KE', 'g')))
      WHERE hero_presentation ? 'tickerFallbackText' AND hero_presentation->>'tickerFallbackText' ~ brand_re;
    END IF;
  END IF;

  IF to_regclass('public.website_settings') IS NOT NULL THEN
    ALTER TABLE public.website_settings ALTER COLUMN website_name SET DEFAULT 'KAYARD KE';
    UPDATE public.website_settings SET website_name = 'KAYARD KE' WHERE website_name = 'KAYAD';
  END IF;

  IF to_regclass('public.communication_templates') IS NOT NULL THEN
    UPDATE public.communication_templates
    SET subject_template = regexp_replace(subject_template, brand_re, 'KAYARD KE', 'g'),
        body_template = regexp_replace(body_template, brand_re, 'KAYARD KE', 'g')
    WHERE subject_template ~ brand_re OR body_template ~ brand_re;
  END IF;

  IF to_regclass('public.cms_faqs') IS NOT NULL THEN
    UPDATE public.cms_faqs
    SET question = regexp_replace(question, brand_re, 'KAYARD KE', 'g'),
        answer = regexp_replace(answer, brand_re, 'KAYARD KE', 'g')
    WHERE question ~ brand_re OR answer ~ brand_re;
  END IF;
END $$;
