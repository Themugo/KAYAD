-- KAYARD KE: dealership employment records and staff business identity, built ON the existing dealer_teams membership table.
-- Additive and idempotent. Does NOT touch auth, users, payments, escrow, ledger or any financial function.
--   * dealer_teams  : + employment status/dates, staff number, business contact, staff profile. Existing columns and rows are preserved.
--   * dealer_staff_settings : per-dealership staff code + monotonic counter (numbers are never reused).
--   * dealer_employment_events : append-only employment history (who changed what, when, why).
--   * kayad_allocate_staff_number(team_id)   : concurrency-safe, idempotent; called when an invitation is ACCEPTED.
--   * kayad_set_staff_code(dealer, code)     : dealer-chosen prefix, only before the first number is issued.
-- Backfill: existing active/suspended/removed rows get an employment_status derived from the membership status; existing accepted
-- members receive staff numbers in created_at order. Start dates of legacy rows are NOT guessed (left NULL = "not recorded").
begin;

alter table public.dealer_teams
  add column if not exists employment_status text,
  add column if not exists employment_start_date date,
  add column if not exists employment_end_date date,
  add column if not exists employment_end_reason text,
  add column if not exists staff_number text,
  add column if not exists business_email text,
  add column if not exists business_email_updated_at timestamptz,
  add column if not exists staff_display_name text,
  add column if not exists work_phone text,
  add column if not exists profile_completed_at timestamptz;

-- Employment status is the HR view; dealer_teams.status stays the ACCESS view. They are tied by the constraint below.
update public.dealer_teams set employment_status = case status
  when 'active' then 'active' when 'suspended' then 'suspended'
  when 'removed' then case when member is not null then 'terminated' else 'invited' end
  else 'invited' end
where employment_status is null;

alter table public.dealer_teams alter column employment_status set default 'invited';
alter table public.dealer_teams alter column employment_status set not null;

alter table public.dealer_teams drop constraint if exists dealer_teams_employment_status_check;
alter table public.dealer_teams add constraint dealer_teams_employment_status_check
  check (employment_status in ('invited','onboarding','active','suspended','terminated','resigned','archived'));

-- Compatibility for writers that predate employment_status (an older backend deployed against this schema, a manual SQL fix): when the access
-- status and the HR status would contradict each other, derive the HR status from the access status instead of failing the write.
-- The current backend always sets both, so this never changes its behaviour; it only keeps older writers working.
create or replace function public.kayad_dealer_teams_employment_sync()
returns trigger language plpgsql as $$
declare ok boolean;
begin
  ok := (new.status = 'invited'   and new.employment_status = 'invited')
     or (new.status = 'active'    and new.employment_status in ('onboarding','active'))
     or (new.status = 'suspended' and new.employment_status = 'suspended')
     or (new.status = 'removed'   and new.employment_status in ('invited','terminated','resigned','archived'));
  if not ok then
    new.employment_status := case new.status
      when 'invited' then 'invited' when 'active' then 'active' when 'suspended' then 'suspended'
      when 'removed' then case when new.member is not null then 'terminated' else 'invited' end
      else new.employment_status end;
  end if;
  return new;
end; $$;
drop trigger if exists dealer_teams_employment_sync on public.dealer_teams;
create trigger dealer_teams_employment_sync before insert or update of status, employment_status, member on public.dealer_teams
  for each row execute function public.kayad_dealer_teams_employment_sync();

-- Access and employment can never contradict each other.
alter table public.dealer_teams drop constraint if exists dealer_teams_access_employment_consistent;
alter table public.dealer_teams add constraint dealer_teams_access_employment_consistent check (
  (status = 'invited'   and employment_status = 'invited') or
  (status = 'active'    and employment_status in ('onboarding','active')) or
  (status = 'suspended' and employment_status = 'suspended') or
  (status = 'removed'   and employment_status in ('invited','terminated','resigned','archived'))
);
alter table public.dealer_teams drop constraint if exists dealer_teams_business_email_format;
alter table public.dealer_teams add constraint dealer_teams_business_email_format
  check (business_email is null or (char_length(business_email) <= 254 and business_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'));
alter table public.dealer_teams drop constraint if exists dealer_teams_end_after_start;
alter table public.dealer_teams add constraint dealer_teams_end_after_start
  check (employment_end_date is null or employment_start_date is null or employment_end_date >= employment_start_date);

create unique index if not exists dealer_teams_dealer_staff_number_uq on public.dealer_teams(dealer, staff_number) where staff_number is not null;

-- One staff code and one counter per dealership. The code is globally unique (case-insensitive) so a staff number identifies exactly one dealership.
create table if not exists public.dealer_staff_settings (
  dealer uuid primary key references public.users(id) on delete cascade,
  staff_code text not null check (staff_code ~ '^[A-Z0-9]{2,8}$'),
  next_seq integer not null default 1 check (next_seq >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists dealer_staff_settings_code_uq on public.dealer_staff_settings(staff_code);
alter table public.dealer_staff_settings enable row level security;
drop policy if exists dealer_staff_settings_owner_select on public.dealer_staff_settings;
create policy dealer_staff_settings_owner_select on public.dealer_staff_settings for select using (auth.uid() = dealer);

-- Append-only employment history. The row survives the member's departure; updates are refused.
create table if not exists public.dealer_employment_events (
  id uuid primary key default gen_random_uuid(),
  dealer uuid not null references public.users(id) on delete cascade,
  team_id uuid not null references public.dealer_teams(id) on delete cascade,
  event_type text not null check (event_type in (
    'invited','invitation_resent','invitation_cancelled','accepted','profile_completed','role_changed','permissions_changed',
    'business_email_changed','suspended','reinstated','terminated','resigned','archived','rehire_invited','staff_number_assigned')),
  actor uuid references public.users(id) on delete set null,
  actor_label text,
  staff_number text,
  from_value jsonb,
  to_value jsonb,
  reason text check (reason is null or char_length(reason) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists dealer_employment_events_team_idx on public.dealer_employment_events(team_id, created_at desc);
create index if not exists dealer_employment_events_dealer_idx on public.dealer_employment_events(dealer, created_at desc);
alter table public.dealer_employment_events enable row level security;
drop policy if exists dealer_employment_events_owner_select on public.dealer_employment_events;
create policy dealer_employment_events_owner_select on public.dealer_employment_events for select using (auth.uid() = dealer);

create or replace function public.kayad_employment_events_immutable()
returns trigger language plpgsql as $$
begin raise exception 'dealer_employment_events is append-only' using errcode = 'P0001'; end; $$;
drop trigger if exists dealer_employment_events_no_update on public.dealer_employment_events;
create trigger dealer_employment_events_no_update before update on public.dealer_employment_events for each row execute function public.kayad_employment_events_immutable();

-- Dealer-chosen staff code (only until the first number is issued; afterwards the prefix is part of issued identities).
create or replace function public.kayad_set_staff_code(p_dealer uuid, p_code text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare c text := upper(trim(coalesce(p_code, ''))); s record;
begin
  if c !~ '^[A-Z0-9]{2,8}$' then raise exception 'STAFF_CODE_INVALID' using errcode = 'P0001'; end if;
  perform 1 from public.users where id = p_dealer and role = 'dealer';
  if not found then raise exception 'DEALER_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into s from public.dealer_staff_settings where dealer = p_dealer for update;
  if found and s.next_seq > 1 then raise exception 'STAFF_CODE_LOCKED' using errcode = 'P0001'; end if;
  begin
    insert into public.dealer_staff_settings(dealer, staff_code) values (p_dealer, c)
    on conflict (dealer) do update set staff_code = excluded.staff_code, updated_at = now();
  exception when unique_violation then raise exception 'STAFF_CODE_TAKEN' using errcode = 'P0001';
  end;
  return c;
end; $$;

-- Concurrency-safe, idempotent allocation. The dealership counter row is the lock: concurrent acceptances serialise on it, numbers are
-- monotonic and never reused (a removed member keeps their number). The prefix is the dealer's configured code, else derived once from
-- the dealership's EXISTING business name (letters/digits, 3 to 8 characters, first free) and then frozen.
create or replace function public.kayad_allocate_staff_number(p_team uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare t record; s record; base text; cand text; n integer; k integer; seq integer; code text; num text;
begin
  select * into t from public.dealer_teams where id = p_team for update;
  if not found then raise exception 'TEAM_ROW_NOT_FOUND' using errcode = 'P0002'; end if;
  if t.staff_number is not null then return t.staff_number; end if;
  if t.member is null or t.status not in ('active','suspended') then raise exception 'STAFF_NUMBER_REQUIRES_ACCEPTED_MEMBER' using errcode = 'P0001'; end if;

  select * into s from public.dealer_staff_settings where dealer = t.dealer for update;
  if not found then
    select upper(regexp_replace(coalesce(business_name, ''), '[^A-Za-z0-9]', '', 'g')) into base from public.users where id = t.dealer;
    if length(coalesce(base, '')) < 2 then raise exception 'STAFF_CODE_REQUIRED' using errcode = 'P0001'; end if;
    for n in least(3, length(base))..least(8, length(base)) loop
      cand := substr(base, 1, n);
      begin insert into public.dealer_staff_settings(dealer, staff_code) values (t.dealer, cand) on conflict (dealer) do nothing; exit;
      exception when unique_violation then cand := null; end;
    end loop;
    if cand is null then
      for k in 2..99 loop
        cand := substr(base, 1, least(3, length(base))) || k::text;
        begin insert into public.dealer_staff_settings(dealer, staff_code) values (t.dealer, cand) on conflict (dealer) do nothing; exit;
        exception when unique_violation then cand := null; end;
      end loop;
    end if;
    if cand is null then raise exception 'STAFF_CODE_REQUIRED' using errcode = 'P0001'; end if;
    select * into s from public.dealer_staff_settings where dealer = t.dealer for update;
  end if;

  update public.dealer_staff_settings set next_seq = next_seq + 1, updated_at = now() where dealer = t.dealer returning staff_code, next_seq - 1 into code, seq;
  num := code || '-STAFF-' || lpad(seq::text, 3, '0');
  update public.dealer_teams set staff_number = num where id = p_team;
  insert into public.dealer_employment_events(dealer, team_id, event_type, actor_label, staff_number, to_value)
    values (t.dealer, p_team, 'staff_number_assigned', 'system', num, jsonb_build_object('staffNumber', num));
  return num;
end; $$;

revoke all on function public.kayad_allocate_staff_number(uuid) from public, anon, authenticated;
revoke all on function public.kayad_set_staff_code(uuid, text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.kayad_allocate_staff_number(uuid) to service_role;
    grant execute on function public.kayad_set_staff_code(uuid, text) to service_role;
  end if;
end $$;

-- Backfill staff numbers for members who already accepted (oldest first, deterministic). Skipped silently for a dealership whose name yields no code.
do $$
declare r record;
begin
  for r in select id from public.dealer_teams where staff_number is null and member is not null and status in ('active','suspended') order by dealer, created_at, id loop
    begin perform public.kayad_allocate_staff_number(r.id);
    exception when others then raise notice 'staff number not backfilled for team row %: %', r.id, sqlerrm; end;
  end loop;
end $$;

comment on column public.dealer_teams.employment_status is 'HR status. status = access (invited/active/suspended/removed); the two are tied by dealer_teams_access_employment_consistent.';
comment on column public.dealer_teams.business_email is 'Recorded dealership business contact. NOT a provisioned mailbox and NOT a login identity.';
comment on table public.dealer_employment_events is 'Append-only dealership employment history. Survives offboarding.';
commit;

notify pgrst, 'reload schema';
