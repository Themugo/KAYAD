-- KAYAD hero presentation controls and per-vehicle hero card copy.
-- Reuses the existing singleton platform_config contract; no second CMS is introduced.

ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS hero_presentation JSONB NOT NULL DEFAULT jsonb_build_object(
    'stageHeightPct', 100,
    'cardScalePct', 80,
    'leftOffsetPct', 14,
    'rightOffsetPct', 14,
    'tickerEnabled', true
  );

ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS hero_card_content JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.platform_config
SET hero_presentation = jsonb_build_object(
  'stageHeightPct', 100,
  'cardScalePct', 80,
  'leftOffsetPct', 14,
  'rightOffsetPct', 14,
  'tickerEnabled', true
)
WHERE hero_presentation IS NULL;

UPDATE public.platform_config
SET hero_card_content = '{}'::jsonb
WHERE hero_card_content IS NULL;
