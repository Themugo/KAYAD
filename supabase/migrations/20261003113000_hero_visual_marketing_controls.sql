-- KAYAD unified hero visual/marketing controls.
-- Extends the existing platform_config.hero_presentation JSON contract;
-- no second CMS or duplicate configuration table is introduced.
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS hero_presentation JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.platform_config
SET hero_presentation = jsonb_build_object(
  'stageHeightPct', 100,
  'stageMaxWidthPct', 100,
  'cardScalePct', 80,
  'cardWidthPct', 42,
  'cardOffsetXPct', 0,
  'cardOffsetYPct', 0,
  'cardBgOpacityPct', 95,
  'cardBlurPx', 18,
  'cardBorderColor', '#FFFFFF',
  'cardTextColor', '#0A3340',
  'backgroundUrl', '/hero/kayad-nairobi-kicc.jpg',
  'backgroundPositionX', 50,
  'backgroundPositionY', 50,
  'backgroundScalePct', 100,
  'overlayColor', '#EAF5F7',
  'overlayOpacityPct', 18,
  'secondaryOverlayColor', '#FFFFFF',
  'secondaryOverlayOpacityPct', 10,
  'leftOffsetPct', 16,
  'rightOffsetPct', 16,
  'vehicleScalePct', 100,
  'vehicleTopPct', 50,
  'vehicleWidthPct', 43,
  'showVehicleInfoCards', true,
  'showVehicleLabels', true,
  'primaryButtonColor', '#13B8A6',
  'secondaryButtonBorderColor', '#C7DAD8',
  'arrowEnabled', true,
  'dotsEnabled', true,
  'tickerEnabled', true,
  'tickerFallbackText', 'KAYAD · Verified vehicles across East Africa · Live auctions · Transparent bidding · Protected transactions',
  'tickerBackgroundColor', '#0A3340',
  'tickerTextColor', '#FFFFFF',
  'tickerHeightPx', 36,
  'tickerScrollSeconds', 34,
  'vehicleSource', 'showcase',
  'showcaseVehicles', jsonb_build_array(
    jsonb_build_object('id','showcase-land-cruiser','make','Toyota','model','Land Cruiser 300','year',2026,'image','/hero/kayad-land-cruiser.png','eyebrow','KAYAD SELECT','tagline','Premium SUV · 4WD · Automatic','enabled',true),
    jsonb_build_object('id','showcase-mercedes-gle','make','Mercedes-Benz','model','GLE','year',2026,'image','/hero/kayad-mercedes-gle.png','eyebrow','KAYAD SELECT','tagline','Luxury SUV · Automatic','enabled',true)
  ),
  'floatingCards', '[]'::jsonb
) || COALESCE(hero_presentation, '{}'::jsonb)
WHERE hero_presentation IS NULL OR jsonb_typeof(hero_presentation) = 'object';
