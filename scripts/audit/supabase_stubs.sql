-- Local-substitute stubs for Supabase platform objects. NOT the real platform; used only to
-- replay migrations on a throwaway Postgres 16. Any result is "local substitute", not staging.
do $$ begin
 if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
 if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator noinherit login; end if;
 if not exists (select 1 from pg_roles where rolname='supabase_admin') then create role supabase_admin nologin; end if;
end $$;
create schema if not exists auth; create schema if not exists extensions; create schema if not exists storage; create schema if not exists realtime;
create table if not exists auth.users(id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true),''),'anon') $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
create extension if not exists pgcrypto with schema extensions; create extension if not exists "uuid-ossp" with schema extensions; create extension if not exists pg_trgm with schema extensions;
create table if not exists storage.buckets(id text primary key, name text, public boolean default false);
create table if not exists storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
create publication supabase_realtime;
grant usage on schema public, auth, extensions to anon, authenticated, service_role;
