-- Premium hero presentation controls.
-- Database contract repair: this migration previously ALTERed hero_slides
-- without any CREATE TABLE for hero_slides in the migration chain, making a
-- clean database reset fail before the homepage hero could be persisted.
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  eyebrow_text text,
  headline text not null,
  subheadline text,
  cta_primary_text text,
  cta_primary_link text,
  cta_secondary_text text,
  cta_secondary_link text,
  background_type text not null default 'image' check (background_type in ('color','gradient','image')),
  background_value text,
  overlay_color text not null default '#0A3340',
  overlay_opacity numeric not null default 8 check (overlay_opacity >= 0 and overlay_opacity <= 100),
  display_mode text not null default 'boxed' check (display_mode in ('boxed','fullscreen')),
  layout text not null default 'four-corner',
  media_config jsonb not null default '{}',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_hero_slides_visible_order on public.hero_slides(is_visible,sort_order);
alter table public.hero_slides enable row level security;
revoke all on public.hero_slides from anon,authenticated;
grant select on public.hero_slides to service_role;

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
