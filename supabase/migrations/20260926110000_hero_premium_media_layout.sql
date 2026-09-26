-- Premium hero presentation controls.
-- Existing hero text/CTA/background fields remain unchanged. These columns
-- only let administrators control the existing hero's vehicle imagery and
-- arrangement without introducing a second homepage content system.
alter table public.hero_slides
  add column if not exists layout text not null default 'four-corner',
  add column if not exists media_config jsonb not null default '{}'::jsonb;

alter table public.hero_slides
  drop constraint if exists hero_slides_layout_valid;
alter table public.hero_slides
  add constraint hero_slides_layout_valid
  check (layout in ('four-corner', 'media-left', 'media-right', 'centered'));
