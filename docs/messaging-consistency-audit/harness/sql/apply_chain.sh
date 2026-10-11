#!/bin/bash
# Build a throwaway PostgreSQL 16 database from the project's migration chain, with a minimal Supabase shim
# (roles anon/authenticated/service_role, auth.uid()/role()/jwt(), pgcrypto/uuid-ossp). NOT Supabase: no GoTrue, no storage, no PostgREST.
DB=${1:-msg_chain}; MIG=${2:-/home/claude/msg/base/KAYAD-main/supabase/migrations}; OUT=${3:-/home/claude/msg/pg}
su postgres -c "dropdb --if-exists $DB; createdb $DB" || { echo "cannot (re)create $DB - is PostgreSQL running?" >&2; exit 2; }
su postgres -c "psql -d $DB -v ON_ERROR_STOP=1 -q" <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(auth.jwt()->>'sub','')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT COALESCE(auth.jwt()->>'role', current_user) $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN CREATE PUBLICATION supabase_realtime; END IF; END $$;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, encrypted_password text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb, raw_app_meta_data jsonb DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), email_confirmed_at timestamptz, last_sign_in_at timestamptz);
-- Stub of a function that exists on the hosted project but is created by NO migration in the chain (see defect register D-MIG-1)
CREATE OR REPLACE FUNCTION public.rls_auto_enable() RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;
GRANT USAGE ON SCHEMA auth, extensions TO anon, authenticated, service_role;
SQL
# SUPABASE_DEFAULT_PRIVILEGES=1 reproduces what a hosted Supabase project does for objects created by `postgres`
# (documented platform defaults): anon/authenticated/service_role receive ALL on new tables, sequences and functions in
# public, plus USAGE on the schema. Without this, a local replay under-reports client privileges and RLS looks stronger
# than it is on Supabase, because grants that a migration never revokes simply do not exist locally.
if [ "${SUPABASE_DEFAULT_PRIVILEGES:-0}" = "1" ]; then
su postgres -c "psql -X -d $DB -v ON_ERROR_STOP=1 -q" <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
SQL
echo "supabase default privileges: ON" >> $OUT/chain_summary.txt.mode
fi
: > $OUT/chain_errors.txt; n=0; bad=0
for f in $(ls $MIG/*.sql | sort); do
  n=$((n+1)); b=$(basename $f)
  # Judge by psql's EXIT STATUS (a server that is down prints "psql: error: connection ... failed", which contains
  # neither ERROR nor FATAL, and used to be counted as applied).
  out=$(su postgres -c "psql -X -d $DB -q -v ON_ERROR_STOP=1 -1 -f $f" 2>&1 >/dev/null); rc=$?
  if [ $rc -ne 0 ]; then bad=$((bad+1)); echo "$b :: rc=$rc :: $(echo "$out" | grep -vE '^(NOTICE|WARNING|HINT|DETAIL)' | head -2 | tr '\n' ' ')" >> $OUT/chain_errors.txt; fi
done
echo "applied=$n failed=$bad" | tee $OUT/chain_summary.txt
