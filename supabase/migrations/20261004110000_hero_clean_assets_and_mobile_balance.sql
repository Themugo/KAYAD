-- Controlled hero asset/containment correction. Reuses the existing platform_config.hero_presentation contract.
UPDATE public.platform_config
SET hero_presentation = COALESCE(hero_presentation, '{}'::jsonb)
  || jsonb_build_object(
    'backgroundUrl', '/hero/kayad-nairobi-kicc.jpg',
    'backgroundPositionX', 50,
    'backgroundPositionY', 50,
    'backgroundScalePct', 100,
    'leftOffsetPct', 0,
    'rightOffsetPct', 0,
    'leftVehicleNudgePct', 28,
    'rightVehicleNudgePct', 28,
    'vehicleScalePct', 100,
    'vehicleWidthPct', 43,
    'cardScalePct', 80,
    'cardWidthPct', 42,
    'showVehicleInfoCards', true,
    'showVehicleLabels', true,
    'showcaseVehicles', jsonb_build_array(
      jsonb_build_object('id','showcase-land-cruiser','make','Toyota','model','Land Cruiser 300','year',2026,'image','/hero/kayad-land-cruiser-clean.png','eyebrow','KAYAD SELECT','tagline','Premium SUV · 4WD · Automatic','enabled',true),
      jsonb_build_object('id','showcase-mercedes-gle','make','Mercedes-Benz','model','GLE','year',2026,'image','/hero/kayad-mercedes-gle-clean.png','eyebrow','KAYAD SELECT','tagline','Luxury SUV · Automatic','enabled',true)
    )
  )
WHERE hero_presentation IS NOT NULL;
