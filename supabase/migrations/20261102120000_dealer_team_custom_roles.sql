-- Dealer team: owner-defined roles (named permission sets) instead of five hardcoded names.
-- Safe to run more than once. Does not delete or change any team row.
begin;

create table if not exists public.dealer_team_roles (
  id uuid primary key default gen_random_uuid(),
  dealer uuid not null references public.users(id) on delete cascade,
  key text not null check (char_length(key) between 3 and 60),
  label text not null check (char_length(label) between 2 and 40),
  description text not null default '',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dealer, key)
);
create index if not exists dealer_team_roles_dealer_idx on public.dealer_team_roles(dealer);
alter table public.dealer_team_roles enable row level security;

-- dealer_teams.role was limited to the five built-in names; allow any role key (built-in or custom_*).
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.dealer_teams'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ~* '\mrole\M' and pg_get_constraintdef(oid) !~* '\mstatus\M'
  loop
    execute format('alter table public.dealer_teams drop constraint %I', c);
  end loop;
end $$;
alter table public.dealer_teams drop constraint if exists dealer_teams_role_length_check;
alter table public.dealer_teams add constraint dealer_teams_role_length_check check (char_length(role) between 3 and 60);

commit;
