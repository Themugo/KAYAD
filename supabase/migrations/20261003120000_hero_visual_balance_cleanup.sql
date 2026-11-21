-- Final controlled hero visual-balance correction.
-- Keeps the existing hero contract and vehicle/card sizes; only removes the
-- old background artwork and separates the two vehicle subjects from the center card.
UPDATE public.platform_config
SET hero_presentation = COALESCE(hero_presentation, '{}'::jsonb)
  || jsonb_build_object(
    'backgroundUrl', '/hero/kayad-nairobi-kicc.jpg',
    'backgroundPositionX', 50,
    'backgroundPositionY', 50,
    'backgroundScalePct', 100,
    'leftOffsetPct', 0,
    'rightOffsetPct', 0,
    'leftVehicleNudgePct', 22,
    'rightVehicleNudgePct', 22,
    'vehicleScalePct', 100,
    'vehicleWidthPct', 43,
    'cardScalePct', 80,
    'cardWidthPct', 42
  )
WHERE hero_presentation IS NOT NULL;
