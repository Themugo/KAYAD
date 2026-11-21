-- KAYAD top notice board animation controls.
-- Existing ad slots remain compatible; these fields only affect top_ticker presentation.
alter table public.ad_slots
  add column if not exists display_mode text not null default 'scroll',
  add column if not exists scroll_duration_seconds integer not null default 28,
  add column if not exists fade_duration_ms integer not null default 4500;

alter table public.ad_slots
  drop constraint if exists ad_slots_display_mode_valid;
alter table public.ad_slots
  add constraint ad_slots_display_mode_valid check (display_mode in ('scroll', 'fade'));

alter table public.ad_slots
  drop constraint if exists ad_slots_scroll_duration_valid;
alter table public.ad_slots
  add constraint ad_slots_scroll_duration_valid check (scroll_duration_seconds between 10 and 120);

alter table public.ad_slots
  drop constraint if exists ad_slots_fade_duration_valid;
alter table public.ad_slots
  add constraint ad_slots_fade_duration_valid check (fade_duration_ms between 1200 and 15000);
