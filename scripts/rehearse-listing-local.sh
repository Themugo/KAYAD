#!/usr/bin/env bash
# LOCAL REAL-SCHEMA REHEARSAL of dealer listing create/edit.
# Builds a THROWAWAY PostgreSQL database named rehearsal_listing from ALL supabase/migrations (with minimal Supabase stubs: roles, auth schema),
# then runs backend/tests/rehearsal/listingRealSchema.test.js, which drives the REAL validateCar -> createCar/updateCar -> Car model -> db layer and the
# REAL kayad_create_dealer_listing_atomic function against it. NOT run against any hosted database: it refuses anything but a local socket/localhost.
# Usage:  PGHOST=/tmp/pgscratch PGPORT=55433 PGUSER=postgres ./scripts/rehearse-listing-local.sh
set -euo pipefail
DB="rehearsal_listing"
HOST="${PGHOST:-/tmp}"
case "$HOST" in /*|localhost|127.0.0.1) ;; *) echo "REFUSED: PGHOST must be a local socket or localhost (got '$HOST')"; exit 2;; esac
if [ -n "${DATABASE_URL:-}${SUPABASE_URL:-}${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then echo "NOTE: ignoring DATABASE_URL/SUPABASE_* - this script only uses PG* local settings."; fi
HERE="$(cd "$(dirname "$0")" && pwd)"; M="$HERE/../supabase/migrations"
P=(psql -X -q -v ON_ERROR_STOP=1)
"${P[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB"
"${P[@]}" -d "$DB" <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='supabase_admin') then create role supabase_admin nologin; end if;
end $$;
create schema if not exists auth; create schema if not exists extensions;
create extension if not exists pgcrypto; create extension if not exists "uuid-ossp"; create extension if not exists pg_trgm; create extension if not exists citext;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;
create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
create publication supabase_realtime;
create function public.rls_auto_enable() returns event_trigger language plpgsql as $$ begin null; end $$;
SQL
ok=0; bad=0
for f in $(ls "$M"/*.sql | sort); do
  if psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>&1; then ok=$((ok+1)); else bad=$((bad+1)); echo "migration not applied locally (Supabase-platform specific?): $(basename "$f")"; fi
done
echo "migrations applied: $ok, skipped: $bad"
cd "$HERE/../backend"
REHEARSAL_PG=1 NODE_OPTIONS=--experimental-vm-modules npx jest tests/rehearsal/listingRealSchema.test.js
