-- Admin console completion (2026-11-24). Additive only, safe to re-run, NO data change, NO financial object touched.
-- Repository migrations never created five tables that live backend code reads and writes. Two of them already exist on the
-- hosted project (their definitions below are copied from its catalog, so applying this there is a no-op); three exist nowhere
-- and made user-facing features fail with HTTP 500 (submit a report, send feedback, broadcast history).
-- Column names are exactly camelToSnake(<JS key>) used by controllers/reportController, feedbackController,
-- announcementController, ntsaVerificationRoutes and adminRoutes (market data), verified by ci/db-journeys/27_customer_care.mjs.
-- Backend uses the service role; RLS is enabled with no client policy (the hosted pattern for the two existing tables).

-- 1. Hosted-catalog tables (repository was missing them). Same columns/defaults/indexes as the hosted project.
create table if not exists public.market_data (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  year integer not null,
  body_type text,
  fuel text,
  transmission text,
  engine_cc integer,
  low_price numeric not null,
  avg_price numeric not null,
  high_price numeric not null,
  sample_size integer,
  source text,
  last_updated timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.market_data enable row level security;

create table if not exists public.ntsa_verification_requests (
  id uuid primary key default gen_random_uuid(),
  car uuid,
  requested_by uuid,
  status text not null default 'pending',
  duty_status text,
  chassis_verified boolean,
  logbook_verified boolean,
  import_verified boolean,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ntsa_requests_car on public.ntsa_verification_requests using btree (car);
alter table public.ntsa_verification_requests enable row level security;

-- 2. Reports (a user reports a listing/user/etc; moderators and admins review). Customer-care lifecycle:
--    pending -> under_review -> reviewed | dismissed | action_taken (open/resolved are accepted by the API for older clients).
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid references public.users(id) on delete set null,
  target_type text not null,
  target_id text not null,
  category text not null,
  description text check (description is null or char_length(description) <= 2000),
  status text not null default 'pending'
    check (status in ('pending','under_review','reviewed','dismissed','action_taken','open','resolved')),
  resolution text check (resolution is null or char_length(resolution) <= 2000),
  action_taken text check (action_taken is null or action_taken in ('listing_removed','user_banned')),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_status_created_idx on public.reports(status, created_at desc);
create index if not exists reports_reporter_idx on public.reports(reporter, created_at desc);
create index if not exists reports_target_idx on public.reports(target_type, target_id);
alter table public.reports enable row level security;

-- 3. Feedback (site feedback, bug reports, feature requests; signed-in or anonymous). new -> read -> addressed.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  "user" uuid references public.users(id) on delete set null,
  name text,
  email text,
  type text not null default 'general' check (type in ('general','feedback','bug_report','feature_request')),
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new','read','addressed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_status_created_idx on public.feedback(status, created_at desc);
alter table public.feedback enable row level security;

-- 4. Announcements (admin broadcast history). Creating a row sends nothing; delivery is an explicit, audited action.
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 120),
  message text not null check (char_length(message) <= 5000),
  type text not null default 'info',
  audience text not null default 'all' check (audience in ('all','dealers','buyers','specific_users')),
  target_users jsonb not null default '[]'::jsonb,
  scheduled_for timestamptz,
  sent_by uuid references public.users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','scheduled','sending','sent','partial','failed')),
  sent_at timestamptz,
  stats jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists announcements_status_created_idx on public.announcements(status, created_at desc);
alter table public.announcements enable row level security;

notify pgrst, 'reload schema';
