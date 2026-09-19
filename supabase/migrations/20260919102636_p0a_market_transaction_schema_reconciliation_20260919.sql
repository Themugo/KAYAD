create table if not exists public.market_data (
 id uuid primary key default gen_random_uuid(),
 brand text not null, model text not null, year integer not null,
 body_type text, fuel text, transmission text, engine_cc integer,
 low_price numeric(18,2) not null, avg_price numeric(18,2) not null,
 high_price numeric(18,2) not null, sample_size integer,
 source text, last_updated timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.market_data enable row level security;
revoke all on table public.market_data from anon, authenticated;
grant all on table public.market_data to service_role;
