-- Temporary duties: a dealership grants a staff member extra operational permissions for a limited period WITHOUT changing their role.
-- Safe to re-run. Additive only: one new table, and the employment-event type list gains two values (the constraint is replaced by a superset).
-- Authority is enforced in the backend (never the browser): permissions are limited to an operational catalogue, the granter must hold what
-- they grant, nobody grants to themselves, and an expiry is mandatory. Expiry needs no job: an expired or revoked row simply stops counting.
create table if not exists public.dealer_team_temporary_grants (
  id uuid primary key default gen_random_uuid(),
  dealer uuid not null references public.users(id) on delete cascade,
  team_id uuid not null references public.dealer_teams(id) on delete cascade,
  permissions jsonb not null check (jsonb_typeof(permissions) = 'array' and jsonb_array_length(permissions) between 1 and 8),
  reason text check (reason is null or char_length(reason) <= 300),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  granted_by uuid references public.users(id) on delete set null,
  granted_by_label text,
  revoked_at timestamptz,
  revoked_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint dealer_team_temporary_grants_window check (expires_at > starts_at)
);
create index if not exists dealer_team_temporary_grants_team_idx on public.dealer_team_temporary_grants(team_id, expires_at desc);
create index if not exists dealer_team_temporary_grants_dealer_idx on public.dealer_team_temporary_grants(dealer, created_at desc);
alter table public.dealer_team_temporary_grants enable row level security;
drop policy if exists dealer_team_temporary_grants_owner_select on public.dealer_team_temporary_grants;
create policy dealer_team_temporary_grants_owner_select on public.dealer_team_temporary_grants for select using (auth.uid() = dealer);

alter table public.dealer_employment_events drop constraint if exists dealer_employment_events_event_type_check;
alter table public.dealer_employment_events add constraint dealer_employment_events_event_type_check check (event_type in (
  'invited','invitation_resent','invitation_cancelled','accepted','profile_completed','role_changed','permissions_changed',
  'business_email_changed','suspended','reinstated','terminated','resigned','archived','rehire_invited','staff_number_assigned',
  'temporary_duty_granted','temporary_duty_revoked'));
