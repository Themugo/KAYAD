-- KAYAD homepage hero: seed admin-managed presentation-only showcase assets and enable
-- the curated pair as a visual fallback until at least two real featured listings exist.
-- These records live inside platform_config.hero_presentation JSONB, NOT public.cars.
-- They must never be counted as inventory or treated as sellable listings.

UPDATE public.platform_config AS pc
SET hero_presentation = jsonb_set(
  jsonb_set(
    COALESCE(pc.hero_presentation, '{}'::jsonb),
    '{showcaseFallbackEnabled}',
    'true'::jsonb,
    true
  ),
  '{showcaseVehicles}',
  CASE
    WHEN jsonb_typeof(pc.hero_presentation->'showcaseVehicles') = 'array' THEN (
      SELECT
        COALESCE(jsonb_agg(
          CASE
            WHEN item->>'id' = 'showcase-land-cruiser' THEN item || jsonb_build_object(
              'image', CASE WHEN COALESCE(item->>'image', '') IN ('', '/hero/kayad-land-cruiser-clean.png', '/hero/kayad-land-cruiser.png')
                THEN '/hero/kayad-land-cruiser-cutout.png' ELSE item->>'image' END,
              'mobileImage', COALESCE(NULLIF(item->>'mobileImage', ''), '/hero/kayad-land-cruiser-mobile.webp'),
              'enabled', COALESCE((item->>'enabled')::boolean, true)
            )
            WHEN item->>'id' = 'showcase-mercedes-gle' THEN item || jsonb_build_object(
              'image', CASE WHEN COALESCE(item->>'image', '') IN ('', '/hero/kayad-mercedes-gle-clean.png', '/hero/kayad-mercedes-gle.png')
                THEN '/hero/kayad-mercedes-gle-cutout.png' ELSE item->>'image' END,
              'mobileImage', COALESCE(NULLIF(item->>'mobileImage', ''), '/hero/kayad-mercedes-gle-mobile.webp'),
              'enabled', COALESCE((item->>'enabled')::boolean, true)
            )
            ELSE item
          END ORDER BY ord
        ), '[]'::jsonb)
        || CASE WHEN NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(pc.hero_presentation->'showcaseVehicles') AS existing(item)
          WHERE item->>'id' = 'showcase-land-cruiser'
        ) THEN jsonb_build_array(jsonb_build_object('id','showcase-land-cruiser','make','Toyota','model','Land Cruiser 300','year',0,'image','/hero/kayad-land-cruiser-cutout.png','mobileImage','/hero/kayad-land-cruiser-mobile.webp','eyebrow','KAYAD SELECT · VISUAL SHOWCASE','tagline','Premium SUV · 4WD · Automatic','enabled',true)) ELSE '[]'::jsonb END
        || CASE WHEN NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(pc.hero_presentation->'showcaseVehicles') AS existing(item)
          WHERE item->>'id' = 'showcase-mercedes-gle'
        ) THEN jsonb_build_array(jsonb_build_object('id','showcase-mercedes-gle','make','Mercedes-Benz','model','GLE','year',0,'image','/hero/kayad-mercedes-gle-cutout.png','mobileImage','/hero/kayad-mercedes-gle-mobile.webp','eyebrow','KAYAD SELECT · VISUAL SHOWCASE','tagline','Luxury SUV · Automatic','enabled',true)) ELSE '[]'::jsonb END
      FROM jsonb_array_elements(pc.hero_presentation->'showcaseVehicles') WITH ORDINALITY AS rows(item, ord)
    )
    ELSE jsonb_build_array(
      jsonb_build_object('id','showcase-land-cruiser','make','Toyota','model','Land Cruiser 300','year',0,'image','/hero/kayad-land-cruiser-cutout.png','mobileImage','/hero/kayad-land-cruiser-mobile.webp','eyebrow','KAYAD SELECT · VISUAL SHOWCASE','tagline','Premium SUV · 4WD · Automatic','enabled',true),
      jsonb_build_object('id','showcase-mercedes-gle','make','Mercedes-Benz','model','GLE','year',0,'image','/hero/kayad-mercedes-gle-cutout.png','mobileImage','/hero/kayad-mercedes-gle-mobile.webp','eyebrow','KAYAD SELECT · VISUAL SHOWCASE','tagline','Luxury SUV · Automatic','enabled',true)
    )
  END,
  true
)
WHERE pc.hero_presentation IS NOT NULL;

-- platform_config is bootstrapped as a singleton by the canonical schema migration.
