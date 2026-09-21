-- KAYAD automation business-rules domain.
-- Backend automation endpoints use the service-role client; the table is
-- intentionally not exposed to anon/authenticated Data API roles.
create table if not exists public.business_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  trigger_event text,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  priority integer not null default 0,
  status text not null default 'draft' check (status in ('draft','active','paused')),
  executions bigint not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_rules_status_trigger_priority_idx
  on public.business_rules(status, trigger_event, priority desc);
create index if not exists business_rules_category_idx
  on public.business_rules(category);

alter table public.business_rules enable row level security;
revoke all on public.business_rules from anon, authenticated;
grant select, insert, update, delete on public.business_rules to service_role;
