#!/usr/bin/env bash
# Rehearses 20261122200000_restore_register_identity_atomic.sql on a DISPOSABLE local database that mimics the hosted tables
# (users, user_auth, system_settings, dealers, profiles, triggers, constraints) and starts from the hosted placeholder function
# INCLUDING its CRLF line endings and its ACL. Refuses anything but loopback and a kayad_test_* database. No hosted access.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; MIG="$ROOT/supabase/migrations/20261122200000_restore_register_identity_atomic.sql"
export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}"
case "$PGHOST" in 127.0.0.1|localhost|::1) ;; *) echo "REFUSING: not loopback"; exit 2;; esac
DB="kayad_test_rehearse"; P="psql -X -q -v ON_ERROR_STOP=1"; PASS=0; FAIL=0
ok(){ if [ "$2" = "1" ]; then echo "PASS $1"; PASS=$((PASS+1)); else echo "FAIL $1 :: $3"; FAIL=$((FAIL+1)); fi; }
q(){ $P -d $DB -At -c "$1" 2>&1; }
$P -d postgres -c "drop database if exists $DB" -c "create database $DB" || exit 2
$P -d postgres -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end \$\$"
$P -d $DB <<'SQL'
create table public.users (
 id uuid primary key default gen_random_uuid(), name text not null, email text not null, role text not null default 'user',
 super_admin boolean default false, status text default 'pending', phone text, business_name text, location text,
 referral_code text, referred_by uuid, email_verified boolean default false, created_at timestamptz default now(), updated_at timestamptz default now(),
 constraint users_email_key unique (email), constraint users_referral_code_key unique (referral_code),
 constraint users_role_check check (role = any (array['user','individual_seller','dealer','broker','ghost_checker','moderator','ad_manager','marketing','escrow_officer','technical_support','hr','accounts','admin','superadmin'])),
 constraint users_status_check check (status = any (array['pending','approved','suspended','rejected'])));
create table public.user_auth (id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.users(id) on delete cascade,
 password text not null, token_version integer default 0, email_verify_token text, email_verify_expire timestamptz);
create table public.system_settings (id uuid primary key default gen_random_uuid(), key text not null, value jsonb not null default '{}');
insert into public.system_settings(key,value) values ('onboarding_policy','{"revision":2,"listingModeration":"auto_publish","dealerOnboardingMode":"approval_required","privateSellerRegistration":"enabled"}');
create table public.profiles (id uuid primary key references public.users(id) on delete cascade, role text, created_at timestamptz);
create table public.dealers (id uuid primary key default gen_random_uuid(), "user" uuid not null unique references public.users(id) on delete cascade, business_name text, location text, approved boolean, is_suspended boolean, updated_at timestamptz default now());
create function public.sync_profile_from_user() returns trigger language plpgsql security definer set search_path = public, pg_temp as $f$ begin insert into profiles(id,role,created_at) values (new.id,new.role,new.created_at) on conflict (id) do nothing; return new; end $f$;
create function public.sync_dealer_profile_from_user() returns trigger language plpgsql security definer set search_path = public as $f$ begin if new.role='dealer' then insert into public.dealers("user",business_name,location,approved,is_suspended) values (new.id,new.business_name,new.location,false,false) on conflict ("user") do nothing; end if; return new; end $f$;
create trigger trg_sync_profile_from_user after insert on public.users for each row execute function public.sync_profile_from_user();
create trigger trg_sync_dealer_profile_from_user after insert on public.users for each row execute function public.sync_dealer_profile_from_user();
grant usage on schema public to anon, authenticated, service_role;
SQL
# --- the hosted placeholder, CRLF line endings preserved (as read from pg_get_functiondef on hosted) ---
printf 'CREATE OR REPLACE FUNCTION public.kayad_register_identity_atomic(p_name text, p_email text, p_role text, p_phone text, p_business_name text, p_location text, p_referred_by uuid, p_password_hash text, p_email_verify_token text, p_email_verify_expire timestamp with time zone)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO '"'"'public'"'"'\nAS $function$\r\nDECLARE\r\n  v_user public.users%%ROWTYPE;\r\n  v_seller_approval_required boolean := false;\r\nBEGIN\r\n  -- Other function logic\r\n\r\n  IF p_role NOT IN ('"'"'user'"'"','"'"'individual_seller'"'"','"'"'dealer'"'"') THEN\r\n    RAISE EXCEPTION '"'"'Invalid self-registration role'"'"'\r\n      USING ERRCODE = '"'"'22023'"'"';\r\n  END IF;\r\n\r\n  -- Remaining registration logic\r\nEND;\r\n$function$\n' > /tmp/hosted_stub.sql
$P -d $DB -f /tmp/hosted_stub.sql
$P -d $DB -c "revoke all on function public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz) from public; grant execute on function public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz) to service_role"
FN="public.kayad_register_identity_atomic"
call(){ echo "set role service_role; select $FN('Rehearsal','$1','$2','0712345678','$3','$4',null,'\$2b\$12\$hash','tokenhash',now()+interval '24 hours');" ; }
ACL0=$(q "select proacl::text from pg_proc where proname='kayad_register_identity_atomic'")
H0=$(q "select md5(pg_get_functiondef(oid)) from pg_proc where proname='kayad_register_identity_atomic'")
echo "pre-state: acl=$ACL0 md5=$H0 crlf=$(q "select (pg_get_functiondef(oid) like '%'||chr(13)||'%')::text from pg_proc where proname='kayad_register_identity_atomic'")"
R=$($P -d $DB -At -c "set role service_role; select $FN('R','stub@example.test','user',null,null,null,null,'h','t',now());" 2>&1)
ok "P0 hosted placeholder reproduces the failure (2F005, no user created)" "$(echo "$R" | grep -q 'without RETURN' && [ "$(q 'select count(*) from users')" = 0 ] && echo 1 || echo 0)" "$R"
# --- negative rehearsal: a missing required column aborts the migration atomically and leaves the function untouched ---
$P -d $DB -c "alter table user_auth rename column email_verify_expire to email_verify_expire_x"
R=$($P -d $DB -f "$MIG" 2>&1); H1=$(q "select md5(pg_get_functiondef(oid)) from pg_proc where proname='kayad_register_identity_atomic'")
ok "N1 preflight aborts on a missing column and the function is unchanged" "$(echo "$R" | grep -q 'Preflight failed' && [ "$H1" = "$H0" ] && echo 1 || echo 0)" "$R"
$P -d $DB -c "alter table user_auth rename column email_verify_expire_x to email_verify_expire"
# --- apply ---
R=$($P -d $DB -f "$MIG" 2>&1); RC=$?
ok "A1 migration applies cleanly in one transaction" "$([ $RC = 0 ] && echo 1 || echo 0)" "$R"
if [ -n "${VERIFY_SQL:-}" ]; then
  VR=$($P -d $DB -At -F'|' -f "$VERIFY_SQL" 2>&1 | grep -E '\|(t|f)$' | head -20)
  ok "V1 post-change read-only verification SQL: every check true" "$([ -n "$VR" ] && ! echo "$VR" | grep -q '|f$' && echo 1 || echo 0)" "$VR"
fi
ACL1=$(q "select proacl::text from pg_proc where proname='kayad_register_identity_atomic'")
ok "A2 ACL unchanged: postgres + service_role only" "$([ "$ACL1" = "$ACL0" ] && echo 1 || echo 0)" "$ACL1"
ok "A3 SECURITY DEFINER, search_path=public, owner postgres" "$([ "$(q "select prosecdef::text||proconfig::text||pg_get_userbyid(proowner) from pg_proc where proname='kayad_register_identity_atomic'")" = 'true{search_path=public}postgres' ] && echo 1 || echo 0)" "$(q "select prosecdef::text||proconfig::text||pg_get_userbyid(proowner) from pg_proc where proname='kayad_register_identity_atomic'")"
ok "A4 CRLF placeholder text is gone" "$(q "select (pg_get_functiondef(oid) !~ 'Other function logic|Remaining registration logic')::text from pg_proc where proname='kayad_register_identity_atomic'" | grep -q t && echo 1 || echo 0)" ""
for r in anon authenticated; do R=$($P -d $DB -At -c "set role $r; select $FN('x','$r@example.test','user',null,null,null,null,'h','t',now());" 2>&1); ok "S1 role $r cannot execute" "$(echo "$R" | grep -qi 'permission denied' && echo 1 || echo 0)" "$R"; done
R=$($P -d $DB -At -c "set role service_role; select ($FN('Buyer One','Buyer.One@Example.test','user','0712','ignored','ignored',null,'\$hash','tok',now()+interval '1 day')->>'status') || '|' || ($FN('Dealer One','dealer1@example.test','dealer','0712','Gari Motors','Nairobi',null,'\$hash','tok',now()+interval '1 day')->>'status');" 2>&1)
ok "F1 user -> approved, dealer -> pending" "$([ "$R" = 'approved|pending' ] && echo 1 || echo 0)" "$R"
ok "F2 email normalised, credential row + token hash persisted, no business data kept for a personal user" "$([ "$(q "select count(*) from users u join user_auth a on a.user_id=u.id where u.email='buyer.one@example.test' and a.email_verify_token='tok' and u.business_name is null and u.location is null")" = 1 ] && echo 1 || echo 0)" ""
ok "F3 dealer identity: business data kept and dealers row created by the existing trigger" "$([ "$(q "select count(*) from dealers d join users u on u.id=d.\"user\" where u.email='dealer1@example.test' and d.business_name='Gari Motors' and d.approved=false")" = 1 ] && echo 1 || echo 0)" ""
ok "F4 profile rows created by the existing trigger" "$([ "$(q "select count(*) from profiles")" = 2 ] && echo 1 || echo 0)" ""
R=$($P -d $DB -At -c "set role service_role; select $FN('Dup','BUYER.ONE@example.test','user',null,null,null,null,'h','t',now());" 2>&1); ok "F5 duplicate (case-insensitive input) -> unique violation 23505" "$(echo "$R" | grep -q 'users_email_key' && echo 1 || echo 0)" "$R"
R=$($P -d $DB -At -c "set role service_role; select $FN('Bad','admin@example.test','admin',null,null,null,null,'h','t',now());" 2>&1); ok "F6 privileged role refused (22023), no row" "$(echo "$R" | grep -q 'Invalid self-registration role' && [ "$(q "select count(*) from users where email='admin@example.test'")" = 0 ] && echo 1 || echo 0)" "$R"
R=$($P -d $DB -At -c "set role service_role; select $FN('Atom','atomic@example.test','user',null,null,null,null,null,'t',now());" 2>&1); ok "F7 atomicity: credential insert fails -> NO orphan users row" "$(echo "$R" | grep -q 'null value' && [ "$(q "select count(*) from users where email='atomic@example.test'")" = 0 ] && echo 1 || echo 0)" "$R"
R=$($P -d $DB -At -c "set role service_role; select $FN('Legacy','legacy@example.test','individual_seller',null,'B','L',null,'h','t',now())->>'role';" 2>&1); ok "F8 legacy role accepted at DB level without private_seller_capabilities (table absent here, as on hosted)" "$([ "$R" = individual_seller ] && echo 1 || echo 0)" "$R"
# --- idempotency ---
H2=$(q "select md5(pg_get_functiondef(oid)) from pg_proc where proname='kayad_register_identity_atomic'"); R=$($P -d $DB -f "$MIG" 2>&1); H3=$(q "select md5(pg_get_functiondef(oid)) from pg_proc where proname='kayad_register_identity_atomic'")
ok "I1 re-applying is a no-op (same definition, ACL kept)" "$([ "$H2" = "$H3" ] && [ "$(q "select proacl::text from pg_proc where proname='kayad_register_identity_atomic'")" = "$ACL0" ] && echo 1 || echo 0)" "$R"
# --- rollback rehearsal: restore the captured pre-change definition ---
$P -d $DB -f /tmp/hosted_stub.sql; H4=$(q "select md5(pg_get_functiondef(oid)) from pg_proc where proname='kayad_register_identity_atomic'")
ok "R1 rollback by re-running the captured definition restores the exact pre-change md5; accounts created stay (data is not rolled back)" "$([ "$H4" = "$H0" ] && [ "$(q 'select count(*) from users')" -ge 3 ] && echo 1 || echo 0)" "$H4 vs $H0"
$P -d postgres -c "drop database if exists $DB"
echo "rehearsal: $PASS passed, $FAIL failed"; [ $FAIL = 0 ]
