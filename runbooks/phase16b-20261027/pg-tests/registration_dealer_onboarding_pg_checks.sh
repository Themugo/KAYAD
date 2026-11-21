#!/bin/bash
# Phase 16B - disposable-DB rehearsal of the registration + dealer-onboarding candidate and its rollback.
# usage: registration_dealer_onboarding_pg_checks.sh <template_db_with_full_repo_schema>   env PGPORT (default 54329). Test-only.
T=${1:-kayad_16b_base}; PORT=${PGPORT:-54329}; DB=kayad_16b_hostshape; HERE="$(cd "$(dirname "$0")" && pwd)"
CAND="$HERE/../migration-candidate/20261027120000_phase16b_registration_and_dealer_onboarding_CANDIDATE.sql"
ROLL="$HERE/../migration-candidate/20261027120000_phase16b_registration_and_dealer_onboarding_ROLLBACK.sql"
Q() { psql -h 127.0.0.1 -p $PORT -U postgres -d $DB -Atq "$@"; }
pass=0; fail=0
ck() { if [ "$2" = "$3" ]; then pass=$((pass+1)); echo "PASS $1"; else fail=$((fail+1)); echo "FAIL $1 (got [$2] expected [$3])"; fi; }
psql -h 127.0.0.1 -p $PORT -U postgres -d postgres -qc "drop database if exists $DB" -c "create database $DB template $T" >/dev/null 2>&1
# --- shape the clone like hosted (per Phase 16A H-RO): drop the four columns, the function, the dealer-sync trigger, the normalised email index; 3-value CHECK
Q -c "drop trigger if exists trg_sync_dealer_profile_from_user on public.users" \
  -c "drop function if exists public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)" \
  -c "alter table public.dealers drop column bio, drop column payment_details, drop column onboarding_complete, drop column onboarding_completed_at" \
  -c "drop index if exists public.uq_users_email_normalized" \
  -c "alter table public.dealer_verifications drop constraint dealer_verifications_verification_status_check" \
  -c "alter table public.dealer_verifications add constraint dealer_verifications_verification_status_check check (verification_status in ('pending','approved','rejected'))" >/dev/null
# --- two hosted-like rows (synthetic ids/addresses): a verified dealer-labelled primary and an unverified dealer-labelled test dealer
Q -c "insert into users(id,name,email,role,status,email_verified,business_name) values ('00000000-0000-4000-8000-0000000000a1','Primary Synthetic','primary.synthetic@example.test','dealer','pending',true,'Biz A'),('00000000-0000-4000-8000-0000000000b2','Test Dealer Synthetic','dealer.synthetic@example.test','dealer','pending',false,'Biz B')" >/dev/null
Q -c "insert into user_auth(user_id,password) values ('00000000-0000-4000-8000-0000000000a1','x'),('00000000-0000-4000-8000-0000000000b2','x')" >/dev/null 2>&1
VER() { Q -c "insert into dealers(\"user\") values ('00000000-0000-4000-8000-0000000000b2') on conflict do nothing" >/dev/null 2>&1; Q -c "insert into dealer_verifications(\"user\",dealer,verification_status) select '00000000-0000-4000-8000-0000000000b2', id, '$1' from dealers where \"user\"='00000000-0000-4000-8000-0000000000b2' returning verification_status" 2>&1; }
VERCLEAN() { Q -c "delete from dealer_verifications where \"user\"='00000000-0000-4000-8000-0000000000b2'" -c "delete from dealers where \"user\"='00000000-0000-4000-8000-0000000000b2'" >/dev/null 2>&1; }
SNAP() { Q -c "select md5(string_agg(t::text, '|' order by id)) from (select * from users where id::text like '00000000-0000-4000-8000-0000000000%') t"; }
S0=$(SNAP)
ck "BEFORE: register function absent" "$(Q -c "select count(*) from pg_proc where proname='kayad_register_identity_atomic'")" "0"
ck "BEFORE: dealers lacks the 4 onboarding columns" "$(Q -c "select count(*) from information_schema.columns where table_name='dealers' and column_name in ('bio','payment_details','onboarding_complete','onboarding_completed_at')")" "0"
ck "BEFORE: CHECK refuses suspended" "$(VER suspended | grep -c 'violates check')" "1"; VERCLEAN
# --- preflight refuses on a database that lacks a prerequisite column (never changes anything)
psql -h 127.0.0.1 -p $PORT -U postgres -d postgres -qc "drop database if exists ${DB}_pf" -c "create database ${DB}_pf template $DB" >/dev/null 2>&1
psql -h 127.0.0.1 -p $PORT -U postgres -d ${DB}_pf -qc "alter table user_auth drop column token_version" >/dev/null 2>&1
OUT=$(psql -h 127.0.0.1 -p $PORT -U postgres -d ${DB}_pf -v ON_ERROR_STOP=1 -q -f "$CAND" 2>&1)
ck "PREFLIGHT: refuses when user_auth.token_version is missing" "$(echo "$OUT" | grep -c 'PHASE16B PREFLIGHT FAILED')" "1"
ck "PREFLIGHT: nothing changed by the refused run" "$(psql -h 127.0.0.1 -p $PORT -U postgres -d ${DB}_pf -Atqc "select count(*) from pg_proc where proname='kayad_register_identity_atomic'")" "0"
psql -h 127.0.0.1 -p $PORT -U postgres -d postgres -qc "drop database ${DB}_pf" >/dev/null 2>&1
# --- apply
psql -h 127.0.0.1 -p $PORT -U postgres -d $DB -v ON_ERROR_STOP=1 -q -f "$CAND" >/dev/null 2>&1; ck "APPLY: exit 0" "$?" "0"
ck "APPLY: pre-existing user rows byte-identical" "$(SNAP)" "$S0"
ck "APPLY: 4 columns present" "$(Q -c "select count(*) from information_schema.columns where table_name='dealers' and column_name in ('bio','payment_details','onboarding_complete','onboarding_completed_at')")" "4"
ck "APPLY: onboarding_complete defaults false, NOT NULL" "$(Q -c "select column_default||'/'||is_nullable from information_schema.columns where table_name='dealers' and column_name='onboarding_complete'")" "false/NO"
ck "APPLY: suspended now allowed" "$(VER suspended | grep -c '^suspended')" "1"; VERCLEAN
ck "APPLY: unknown status still refused" "$(VER superadmin | grep -c 'violates check')" "1"; VERCLEAN
ck "APPLY: function is SECURITY DEFINER with pg_temp last" "$(Q -c "select prosecdef::text||'/'||array_to_string(proconfig,',') from pg_proc where proname='kayad_register_identity_atomic'")" "true/search_path=public, pg_temp"
for r in anon authenticated PUBLIC; do ck "GRANT: $r cannot execute" "$(Q -c "select has_function_privilege('$( [ $r = PUBLIC ] && echo public || echo $r )', 'public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)', 'execute')")" "f"; done
ck "GRANT: service_role can execute" "$(Q -c "select has_function_privilege('service_role','public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)','execute')")" "t"
REG() { Q -c "select kayad_register_identity_atomic('$1','$2','$3','0700000000','Biz','Nairobi',null,'hash','tok',now()+interval '1 day')" 2>&1; }
ck "FN: user role registers approved/unverified" "$(REG 'N One' 'New.One@Example.test' user | grep -c '"status": "approved"')" "1"
ck "FN: e-mail stored lower-cased" "$(Q -c "select email from users where email='new.one@example.test'")" "new.one@example.test"
ck "FN: auth row created atomically with token_version 0" "$(Q -c "select token_version from user_auth ua join users u on u.id=ua.user_id where u.email='new.one@example.test'")" "0"
ck "FN: dealer registers pending with business name" "$(REG 'D One' 'dealer.one@example.test' dealer | grep -c '"status": "pending"')" "1"
ck "FN: individual_seller registers pending" "$(REG 'S One' 'seller.one@example.test' individual_seller | grep -c '"status": "pending"')" "1"
for bad in superadmin admin webhoist moderator accounts; do ck "FN: role '$bad' refused (22023)" "$(REG X "bad.$bad@example.test" $bad | grep -c 'Invalid self-registration role')" "1"; ck "FN: refused '$bad' left no user row" "$(Q -c "select count(*) from users where email='bad.$bad@example.test'")" "0"; done
ck "FN: duplicate e-mail differing only by case is refused" "$(REG 'N Two' 'NEW.ONE@example.test' user | grep -c 'duplicate key')" "1"
ck "FN: failed duplicate left no orphan auth row" "$(Q -c "select count(*) from user_auth ua left join users u on u.id=ua.user_id where u.id is null")" "0"
ck "FN: user_auth failure rolls the user back (atomic)" "$(Q -c "select kayad_register_identity_atomic('N Three','atomic.three@example.test','user','0700000001',null,null,null,null,'t',now())" 2>&1 | grep -c 'null value')" "1"
ck "FN: atomic rollback left no user row" "$(Q -c "select count(*) from users where email='atomic.three@example.test'")" "0"
ck "FN: owner-reserved style address is NOT blocked at DB layer (application layer reserves it)" "$(REG 'R' 'reserved.owner@example.test' user | grep -c '"role": "user"')" "1"
# --- idempotent re-apply
psql -h 127.0.0.1 -p $PORT -U postgres -d $DB -v ON_ERROR_STOP=1 -q -f "$CAND" >/dev/null 2>&1; ck "REAPPLY: exit 0 (idempotent)" "$?" "0"
ck "REAPPLY: still one function" "$(Q -c "select count(*) from pg_proc where proname='kayad_register_identity_atomic'")" "1"
# --- rollback guards
Q -c "insert into dealers(\"user\",onboarding_complete,bio) values ('00000000-0000-4000-8000-0000000000b2',true,'x')" >/dev/null
OUT=$(psql -h 127.0.0.1 -p $PORT -U postgres -d $DB -v ON_ERROR_STOP=1 -q -f "$ROLL" 2>&1)
ck "ROLLBACK: refused when onboarding data exists" "$(echo "$OUT" | grep -c 'ROLLBACK REFUSED')" "1"
ck "ROLLBACK: refusal changed nothing" "$(Q -c "select count(*) from pg_proc where proname='kayad_register_identity_atomic'")" "1"
Q -c "delete from dealers where \"user\"='00000000-0000-4000-8000-0000000000b2'" >/dev/null
# registration test rows created above are synthetic and local; remove so the original pair is compared
Q -c "delete from user_auth where user_id in (select id from users where email like '%.one@example.test' or email='reserved.owner@example.test' or email='new.one@example.test')" -c "delete from users where email like '%.one@example.test' or email='reserved.owner@example.test'" >/dev/null 2>&1
psql -h 127.0.0.1 -p $PORT -U postgres -d $DB -v ON_ERROR_STOP=1 -q -f "$ROLL" >/dev/null 2>&1; ck "ROLLBACK: exit 0 when clean" "$?" "0"
ck "ROLLBACK: function gone" "$(Q -c "select count(*) from pg_proc where proname='kayad_register_identity_atomic'")" "0"
ck "ROLLBACK: columns gone" "$(Q -c "select count(*) from information_schema.columns where table_name='dealers' and column_name in ('bio','payment_details','onboarding_complete','onboarding_completed_at')")" "0"
ck "ROLLBACK: CHECK back to 3 values" "$(VER suspended | grep -c 'violates check')" "1"; VERCLEAN
ck "ROLLBACK: pre-existing user rows byte-identical" "$(SNAP)" "$S0"
psql -h 127.0.0.1 -p $PORT -U postgres -d $DB -v ON_ERROR_STOP=1 -q -f "$CAND" >/dev/null 2>&1; ck "ROLL-FORWARD: candidate re-applies after rollback" "$?" "0"
ck "ROLL-FORWARD: rows still identical" "$(SNAP)" "$S0"
echo "pass=$pass fail=$fail"; [ $fail -eq 0 ]
