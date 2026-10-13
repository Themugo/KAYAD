-- PROD-SHAPED BASELINE for LOCAL REHEARSAL ONLY (reconstructed from read-only catalog queries of 2026-10-13).
-- Never run against Supabase/production. scripts/rehearse-onboarding-migrations-local.sh enforces a local host.
create extension if not exists pgcrypto;
do $$ begin
 if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
 if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create table users(
 id uuid primary key default gen_random_uuid(), name text not null, email text not null, role text not null default 'user', super_admin boolean default false,
 status text default 'pending', phone text, phone_verified boolean default false, avatar text default '', business_name text, location text, bio text default '',
 rating numeric default 4.5, inspections_completed int default 0, dealer_approved_at timestamptz, escrow_approved boolean default false, verified_buyer boolean default false,
 total_sales numeric default 0, listing_count int default 0, referral_code text, referred_by uuid references users(id), last_login_at timestamptz,
 created_at timestamptz default now(), updated_at timestamptz default now(), deleted_at timestamptz, credits numeric default 0, dealer_rating numeric default 0,
 email_verified boolean default false, is_banned boolean default false, referral_count int default 0, referral_earnings numeric default 0, review_count int default 0,
 trial_started_at timestamptz, trial_listings_used int default 0, first_vehicle_used boolean default false, dealer_package text, package_listing_max int, package_expires_at timestamptz,
 escrow_forced boolean default false, deleted_by uuid references users(id), package_auto_renew boolean not null default false, subscription_status text not null default 'none',
 package_features jsonb not null default '[]', commission_balance numeric not null default 0, listings_locked boolean not null default false,
 constraint users_email_key unique(email), constraint users_referral_code_key unique(referral_code),
 constraint users_role_check check (role = any (array['user','individual_seller','dealer','broker','ghost_checker','moderator','ad_manager','marketing','escrow_officer','technical_support','hr','accounts','admin','superadmin'])),
 constraint users_status_check check (status = any (array['pending','approved','suspended','rejected'])),
 constraint users_superadmin_flag_consistency check ((role='superadmin') = coalesce(super_admin,false)));
create table user_auth(id uuid primary key default gen_random_uuid(), user_id uuid not null unique references users(id) on delete cascade, password text not null, token_version int default 0,
 login_attempts int default 0, lock_until timestamptz, must_change_password boolean default false, email_verify_token text, email_verify_expire timestamptz, reset_token text, reset_token_expire timestamptz,
 created_at timestamptz default now(), updated_at timestamptz default now());
create table dealers(id uuid primary key default gen_random_uuid(), "user" uuid not null references users(id) on delete cascade, business_name text, location text, approved boolean default false,
 verified_at timestamptz, is_suspended boolean default false, suspension_reason text, created_at timestamptz default now(), updated_at timestamptz default now(), constraint dealers_user_key unique("user"));
create table refresh_tokens(id uuid primary key default gen_random_uuid(), "user" uuid not null references users(id) on delete cascade, token text not null unique, token_version int default 0,
 device_id text, user_agent text, ip_address text, is_revoked boolean default false, expires_at timestamptz not null, last_used_at timestamptz, created_at timestamptz default now());
create index idx_refresh_tokens_token on refresh_tokens(token);
create table communication_deliveries(id uuid primary key default gen_random_uuid(), user_id uuid references users(id) on delete set null, channel text, category text, event_type text, template_code text,
 recipient text, recipient_hash text, provider text, provider_message_id text, provider_event_id text, source_event_id text, correlation_id text, status text, retry_count int default 0,
 next_retry_at timestamptz, last_attempt_at timestamptz, sent_at timestamptz, delivered_at timestamptz, failed_at timestamptz, last_error text, metadata jsonb, created_at timestamptz default now(), updated_at timestamptz default now(),
 constraint communication_deliveries_channel_check check (channel = any(array['in_app','email','sms','whatsapp'])),
 constraint communication_deliveries_status_check check (status = any(array['queued','sending','sent','delivered','failed','bounced','read'])));
create or replace function update_updated_at_snake() returns trigger language plpgsql as $f$ begin new.updated_at=now(); return new; end $f$;
create table profiles(id uuid primary key, email text, role text, super_admin boolean, created_at timestamptz default now(), dealer_approved_at timestamptz, deleted_at timestamptz, last_login_at timestamptz);
alter table users enable row level security; alter table user_auth enable row level security; alter table refresh_tokens enable row level security; alter table communication_deliveries enable row level security;
-- production fact (read-only catalog check 2026-10-13): service_role has BYPASSRLS; anon/authenticated/authenticator do not.
alter role service_role bypassrls;
grant all on all tables in schema public to service_role;
-- the two production users (dealer, pending, unverified) as seen read-only
insert into users(name,email,role,status,business_name,location) values ('seed dealer a','a@example.test','dealer','pending','A Motors','Nairobi'),('seed dealer b','b@example.test','dealer','pending','B Motors','Mombasa');
insert into user_auth(user_id,password,email_verify_token) select id,'x','h' from users;

-- legacy plaintext refresh token (pre-hardening shape) to exercise the 20260930110000 backfill
insert into refresh_tokens("user",token,expires_at) select id,'legacy-token-1',now()+interval '7 days' from users where email='a@example.test';
