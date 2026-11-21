#!/usr/bin/env bash
# STAGE 2 EXTENDED LOCAL REHEARSAL (throwaway PostgreSQL only). NOT EXECUTED AGAINST PRODUCTION OR STAGING.
# Scenarios: S1 empty DB, S2 single-transaction apply x2 + assertions, S3 partial failure, S4 guard-masking,
#            S5 hostile default privileges, S6 volume/dirty data, S7 concurrency.
# Usage: PGHOST=/tmp PGPORT=55433 PGUSER=postgres ./scripts/rehearse-stage2-extended-local.sh
# Refuses non-local hosts and DB names not starting with "rehearsal". Uses only PG* settings; ignores DATABASE_URL/SUPABASE_*.
set -uo pipefail
HOST="${PGHOST:-/tmp}"; PORT="${PGPORT:-5432}"
case "$HOST" in /*|localhost|127.0.0.1) ;; *) echo "REFUSED: PGHOST must be a local socket or localhost"; exit 2;; esac
HERE="$(cd "$(dirname "$0")" && pwd)"; M="$HERE/../supabase/migrations"; R="$HERE/rehearsal"
ORDER="20260930111500 20260930113000 20260930112000 20261001090000 20261001220000 20260930110000 20261011090000 20261011121000"
P=(psql -X -q -h "$HOST" -p "$PORT" -U "${PGUSER:-postgres}")
PASS=0; FAIL=0
ok(){ echo "  PASS  $1"; PASS=$((PASS+1)); }
bad(){ echo "  FAIL  $1"; FAIL=$((FAIL+1)); }
newdb(){ case "$1" in rehearsal*) ;; *) echo "REFUSED db name"; exit 2;; esac
  "${P[@]}" -d postgres -c "drop database if exists $1 with (force)" -c "create database $1" >/dev/null; }
q(){ "${P[@]}" -At -d "$1" -c "$2" 2>&1; }
base(){ "${P[@]}" -v ON_ERROR_STOP=1 -d "$1" -f "$R/onboarding_prod_shaped_baseline.sql" >/dev/null && "${P[@]}" -v ON_ERROR_STOP=1 -d "$1" -f "$M/20260710043210_20260710005500_sync_profiles_trigger.sql" >/dev/null 2>&1; }
apply1(){ "${P[@]}" -v ON_ERROR_STOP=1 -1 -d "$1" -f "$M"/${2}_*.sql >/dev/null 2>"$TMPE"; }   # one transaction per migration file
TMPE=$(mktemp)
echo "SERVER: $(q postgres 'select version()')"
RPC_REG="kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)"
RPC_ROT="kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)"
priv(){ q "$1" "select has_function_privilege('$2','$3','execute')"; }

echo "== S1 empty database (no production baseline): expect the chain to FAIL loudly, not partially succeed =="
newdb rehearsal_s1
first_fail=""
for v in $ORDER; do apply1 rehearsal_s1 $v || { first_fail=$v; break; }; done
[ -n "$first_fail" ] && ok "S1 chain stops with an error at $first_fail on an empty DB: $(head -c 160 "$TMPE" | tr '\n' ' ')" || bad "S1 chain unexpectedly succeeded on an empty DB"

echo "== S2 baseline: each migration in its own transaction, applied twice, then behavioural assertions =="
newdb rehearsal_s2; base rehearsal_s2 && ok "S2 baseline loaded" || bad "S2 baseline"
for pass in 1 2; do for v in $ORDER; do apply1 rehearsal_s2 $v && ok "S2 pass$pass $v" || { bad "S2 pass$pass $v: $(head -c 200 "$TMPE")"; }; done; done
"${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s2 -f "$R/onboarding_assertions.sql" >/dev/null 2>"$TMPE" && ok "S2 assertions (register/dup/rotate/replay/family/ledger)" || bad "S2 assertions: $(head -c 300 "$TMPE")"
"${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s2 -f "$HERE/../runbooks/ONBOARDING_V2_3_POSTVERIFY_READONLY.sql" -At 2>&1 | grep -c "|f$" | { read n; [ "$n" = 0 ] && ok "S2 V2 post-verify: no false rows" || bad "S2 V2 post-verify false rows=$n"; }

echo "== S2b V3 CANDIDATE: whole chain + step 9 in ONE transaction (runbooks/ONBOARDING_V3_2...), applied twice =="
newdb rehearsal_s2b; base rehearsal_s2b
for pass in 1 2; do ( cd "$HERE/.." && "${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s2b -f runbooks/ONBOARDING_V3_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql >/dev/null 2>"$TMPE" ) && ok "S2b V3 apply pass$pass" || bad "S2b V3 apply pass$pass: $(head -c 300 "$TMPE")"; done
"${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s2b -f "$R/onboarding_assertions.sql" >/dev/null 2>"$TMPE" && ok "S2b assertions after V3" || bad "S2b assertions: $(head -c 300 "$TMPE")"
nf=$("${P[@]}" -At -d rehearsal_s2b -f "$HERE/../runbooks/ONBOARDING_V3_3_POSTVERIFY_READONLY.sql" | grep -c '|f$'); nt=$("${P[@]}" -At -d rehearsal_s2b -f "$HERE/../runbooks/ONBOARDING_V3_3_POSTVERIFY_READONLY.sql" | grep -c '|t$')
[ "$nf" = 0 ] && ok "S2b V3 post-verify: $nt checks true, 0 false" || bad "S2b V3 post-verify false=$nf"
newdb rehearsal_s2c; base rehearsal_s2c
sed 's#^commit;#select 1/0;\ncommit;#' "$HERE/../runbooks/ONBOARDING_V3_2_APPLY_ORDER_NEEDS_AUTHORIZATION.sql" > "$HERE/../runbooks/_inj_v3.sql"
( cd "$HERE/.." && "${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s2c -f runbooks/_inj_v3.sql >/dev/null 2>&1 ) && bad "S2c failure injected at the END of the V3 chain was not raised" || ok "S2c failure injected after all 9 steps raised"
rm -f "$HERE/../runbooks/_inj_v3.sql"
[ "$(q rehearsal_s2c "select (to_regprocedure('$RPC_REG') is null) and (to_regclass('uq_users_email_normalized') is null) and exists(select 1 from information_schema.columns where table_name='refresh_tokens' and column_name='token')")" = "t" ] && ok "S2c whole chain rolled back atomically (no RPC, no index, plaintext token column intact)" || bad "S2c not atomic"

echo "== S3 partial failure =="
newdb rehearsal_s3; base rehearsal_s3
for v in 20260930111500 20260930113000 20260930112000 20261001090000 20261001220000; do apply1 rehearsal_s3 $v; done
cp "$M"/20260930110000_*.sql /tmp/_inj.sql; printf '\nSELECT 1/0;\n' >> /tmp/_inj.sql
"${P[@]}" -X -q -h "$HOST" -p "$PORT" -U "${PGUSER:-postgres}" -v ON_ERROR_STOP=1 -1 -d rehearsal_s3 -f /tmp/_inj.sql >/dev/null 2>&1 && bad "S3 injected failure not raised" || ok "S3 injected failure raised"
[ "$(q rehearsal_s3 "select count(*) from information_schema.columns where table_name='refresh_tokens' and column_name in ('token','token_hash')")" = "1" ] && ok "S3 single-transaction apply rolled back completely (token kept, token_hash absent)" || bad "S3 rollback state wrong"
"${P[@]}" -X -q -h "$HOST" -p "$PORT" -U "${PGUSER:-postgres}" -d rehearsal_s3 -f /tmp/_inj.sql >/dev/null 2>&1   # no -1, no ON_ERROR_STOP: statement-by-statement
echo "  INFO  S3 non-transactional run state: $(q rehearsal_s3 "select string_agg(column_name,',' order by column_name) from information_schema.columns where table_name='refresh_tokens' and column_name in ('token','token_hash','family_id')")"
for v in 20260930110000 20261011090000 20261011121000; do apply1 rehearsal_s3 $v && ok "S3 clean rerun of $v converges after partial state" || bad "S3 rerun $v: $(head -c 200 "$TMPE")"; done
"${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s3 -f "$R/onboarding_assertions.sql" >/dev/null 2>"$TMPE" && ok "S3 assertions after recovery" || bad "S3 assertions: $(head -c 200 "$TMPE")"

echo "== S4 guard masking (20260930110000 backfill guard) =="
newdb rehearsal_s4; base rehearsal_s4
for v in $ORDER; do apply1 rehearsal_s4 $v; done
# 4a inconsistent state: token column absent AND a row with NULL token_hash -> must fail loudly, not be skipped silently
q rehearsal_s4 "alter table refresh_tokens alter column token_hash drop not null" >/dev/null
q rehearsal_s4 "insert into refresh_tokens(\"user\",token_hash,family_id,session_id,expires_at) select id,null,gen_random_uuid(),gen_random_uuid(),now()+interval '1 day' from users limit 1" >/dev/null
apply1 rehearsal_s4 20260930110000 && bad "S4a guard masked a NULL token_hash row (migration succeeded)" || ok "S4a inconsistent NULL token_hash is NOT masked: $(grep -o 'null value.*\|violates.*' "$TMPE" | head -1 | head -c 120)"
q rehearsal_s4 "delete from refresh_tokens where token_hash is null" >/dev/null
# 4b security drift: RLS off, explicit anon grant -> rerun must restore RLS; report anon grant behaviour
q rehearsal_s4 "alter table refresh_tokens disable row level security; grant execute on function $RPC_ROT to anon" >/dev/null
apply1 rehearsal_s4 20260930110000 && ok "S4b rerun on drifted security state ran" || bad "S4b rerun failed: $(head -c 200 "$TMPE")"
[ "$(q rehearsal_s4 "select relrowsecurity from pg_class where relname='refresh_tokens'")" = "t" ] && ok "S4b RLS re-enabled by rerun (guard does not skip security)" || bad "S4b RLS NOT restored"
echo "  FINDING S4b anon EXECUTE on rotate RPC after rerun of 20260930110000: $(priv rehearsal_s4 anon "$RPC_ROT") (explicit anon grant is NOT removed by REVOKE ... FROM PUBLIC)"

echo "== S5 hostile default privileges (functions auto-granted to anon/authenticated) =="
newdb rehearsal_s5; base rehearsal_s5
q rehearsal_s5 "alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role" >/dev/null
for v in $ORDER; do apply1 rehearsal_s5 $v; done
for f in "$RPC_REG" "$RPC_ROT" "sync_dealer_profile_from_user()" "sync_profile_role_from_user()"; do
  echo "  INFO  S5 before step 9: $f anon=$(priv rehearsal_s5 anon "$f" 2>&1 | head -1) authenticated=$(priv rehearsal_s5 authenticated "$f" 2>&1 | head -1)"; done
"${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s5 -f "$HERE/../runbooks/ONBOARDING_V3_CANDIDATE_9_explicit_client_revokes.sql" >/dev/null 2>"$TMPE" && ok "S5 V3 step 9 applied" || bad "S5 step 9: $(head -c 200 "$TMPE")"
[ "$(priv rehearsal_s5 anon "$RPC_ROT")$(priv rehearsal_s5 authenticated "$RPC_ROT")$(priv rehearsal_s5 service_role "$RPC_ROT")" = "fft" ] && ok "S5 after step 9: rotate RPC anon=f authenticated=f service_role=t even under hostile default ACLs" || bad "S5 rotate privileges after step 9"

echo "== S6 volume + dirty data (20k users, 40k legacy plaintext tokens, case/space duplicate emails) =="
newdb rehearsal_s6; base rehearsal_s6
q rehearsal_s6 "insert into users(name,email,role,status) select 'u'||g, 'user'||g||'@example.test','user','approved' from generate_series(1,20000) g; insert into user_auth(user_id,password) select id,'x' from users where email like 'user%'; insert into refresh_tokens(\"user\",token,expires_at) select u.id,'legacy-'||u.id||'-'||k, now()+interval '7 days' from users u, generate_series(1,2) k where u.email like 'user%'" >/dev/null
t0=$(date +%s); for v in $ORDER; do apply1 rehearsal_s6 $v || bad "S6 $v: $(head -c 200 "$TMPE")"; done; t1=$(date +%s)
ok "S6 chain on 20k users / 40k tokens finished in $((t1-t0))s"
[ "$(q rehearsal_s6 "select count(*) from refresh_tokens where token_hash is null")" = "0" ] && ok "S6 all legacy tokens hashed" || bad "S6 unhashed tokens"
newdb rehearsal_s6b; base rehearsal_s6b
q rehearsal_s6b "insert into users(name,email) values ('d1','Dup@Example.test'),('d2',' dup@example.test')" >/dev/null
fail6=""; for v in $ORDER; do apply1 rehearsal_s6b $v || { fail6=$v; break; }; done
[ -n "$fail6" ] && ok "S6b case/space-duplicate emails make $fail6 fail loudly (no silent dedupe): $(head -c 140 "$TMPE" | tr '\n' ' ')" || bad "S6b duplicates silently accepted"

echo "== S7 concurrency (on S2 database) =="
rm -f /tmp/_reg_*.out
for i in $(seq 1 30); do ( "${P[@]}" -At -d rehearsal_s2 -c "set role service_role; select kayad_register_identity_atomic('Race','race@example.test','user',null,null,null,null,'h','v',now()+interval '1 day')" >/tmp/_reg_$i.out 2>&1 ) & done; wait
okn=$(grep -l '"email"' /tmp/_reg_*.out | wc -l); dupn=$(grep -l 'duplicate key\|unique' /tmp/_reg_*.out | wc -l)
[ "$okn" = 1 ] && ok "S7a 30 parallel same-email registrations: exactly 1 succeeded ($dupn unique violations)" || bad "S7a successes=$okn"
[ "$(q rehearsal_s2 "select count(*) from users where email='race@example.test'")" = 1 ] && [ "$(q rehearsal_s2 "select count(*) from user_auth ua join users u on u.id=ua.user_id where u.email='race@example.test'")" = 1 ] && ok "S7a exactly one user and one user_auth row" || bad "S7a row counts"
uid=$(q rehearsal_s2 "select id from users where email='race@example.test'")
q rehearsal_s2 "insert into refresh_tokens(\"user\",token_hash,token_version,family_id,session_id,expires_at) values ('$uid','rt0',0,gen_random_uuid(),gen_random_uuid(),now()+interval '1 day')" >/dev/null
rm -f /tmp/_rot_*.out
for i in $(seq 1 20); do ( "${P[@]}" -At -d rehearsal_s2 -c "set role service_role; select kayad_rotate_refresh_token('rt0','rt-new-$i','$uid',0,null,'d','ua','ip',now()+interval '1 day',gen_random_uuid())->>'status'" >/tmp/_rot_$i.out 2>&1 ) & done; wait
rn=$(cat /tmp/_rot_*.out | grep -c '^rotated$'); ru=$(cat /tmp/_rot_*.out | grep -c '^reuse_detected$')
[ "$rn" = 1 ] && ok "S7b 20 concurrent rotations of one token: exactly 1 rotated, $ru reuse_detected" || bad "S7b rotated=$rn reuse=$ru outputs=$(cat /tmp/_rot_*.out | sort | uniq -c | tr '\n' ' ')"
echo "  INFO  S7b active tokens left in that family after the race: $(q rehearsal_s2 "select count(*) from refresh_tokens where \"user\"='$uid' and not is_revoked and token_hash like 'rt-new-%'")"
echo "== S8 pre-existing object with a DIFFERENT shape (production already has public.inspector_applications: text[] arrays, integer years, no CHECK, no trigger) =="
newdb rehearsal_s8; base rehearsal_s8
q rehearsal_s8 "create table public.inspector_applications(id uuid primary key default gen_random_uuid(), user_id uuid, full_name text not null, email text not null, phone text, id_number text, location text, years_of_experience integer, specialties text[] not null default '{}', certifications text[] not null default '{}', tools_available text, preferred_regions text[] not null default '{}', cv_url text, certification_docs jsonb not null default '[]', status text not null default 'pending', reviewed_by uuid, reviewed_at timestamptz, review_notes text, assigned_specialty text, assigned_region text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()); create index idx_inspector_applications_email_status on public.inspector_applications(email,status); alter table public.inspector_applications enable row level security" >/dev/null
for v in $ORDER; do apply1 rehearsal_s8 $v && : || bad "S8 $v: $(head -c 200 "$TMPE")"; done
ok "S8 chain applies over the pre-existing differently-shaped table"
echo "  FINDING S8 shape after chain: specialties=$(q rehearsal_s8 "select data_type from information_schema.columns where table_name='inspector_applications' and column_name='specialties'") years_of_experience=$(q rehearsal_s8 "select data_type from information_schema.columns where table_name='inspector_applications' and column_name='years_of_experience'") status_check=$(q rehearsal_s8 "select count(*) from pg_constraint where conrelid='public.inspector_applications'::regclass and contype='c'") (CREATE TABLE IF NOT EXISTS silently kept the production shape; the file's definition was NOT applied)"
[ "$(q rehearsal_s8 "select count(*) from pg_indexes where tablename='inspector_applications' and indexname in ('idx_inspector_applications_status_created','idx_inspector_applications_email','idx_inspector_applications_user')")" = 3 ] && ok "S8 the three chain indexes were created" || bad "S8 indexes"
[ "$(q rehearsal_s8 "select count(*) from pg_trigger where tgrelid='public.inspector_applications'::regclass and tgname='trg_inspector_applications_updated_at'")" = 1 ] && ok "S8 updated_at trigger created" || bad "S8 trigger"

echo "== S9 lead functions (kayad_create_lead_atomic / kayad_transition_lead_atomic): privileges and RLS, with the real 20260907200100 and 20261011093000 files =="
newdb rehearsal_s9; base rehearsal_s9
q rehearsal_s9 "create table public.leads(id uuid primary key default gen_random_uuid(), buyer uuid, dealer uuid, vehicle uuid, source text, source_reference text, estimated_value numeric default 0, stage text not null default 'new', is_hot boolean default false, last_activity_at timestamptz, created_at timestamptz not null default now()); grant all on all tables in schema public to service_role" >/dev/null
"${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s9 -f "$M/20260907200100_lead_crm_domain_end_to_end.sql" >/dev/null 2>"$TMPE" && ok "S9 real lead migration applied" || bad "S9 lead migration: $(head -c 250 "$TMPE")"
LC="kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)"
echo "  INFO  S9 secdef=$(q rehearsal_s9 "select prosecdef from pg_proc where proname='kayad_create_lead_atomic'") anon_execute=$(priv rehearsal_s9 anon "$LC") authenticated_execute=$(priv rehearsal_s9 authenticated "$LC") (default PUBLIC execute, SECURITY INVOKER)"
q rehearsal_s9 "grant usage on schema public to anon, authenticated" >/dev/null
r=$("${P[@]}" -At -d rehearsal_s9 -c "set role anon; select kayad_create_lead_atomic(gen_random_uuid(),gen_random_uuid(),null,'x','y',1)" 2>&1 | head -1)
case "$r" in *"row-level security"*|*"permission denied"*) ok "S9 anon call is rejected by RLS/privileges: $(echo "$r" | head -c 110)";; *) bad "S9 anon call outcome: $r";; esac
[ "$(q rehearsal_s9 "select count(*) from leads")" = 0 ] && ok "S9 no lead row was created by the anon call" || bad "S9 anon created a row"
r=$("${P[@]}" -At -d rehearsal_s9 -c "set role service_role; select (kayad_create_lead_atomic(gen_random_uuid(),gen_random_uuid(),null,'x','y',1))->>'created'" 2>&1 | head -1)
[ "$r" = true ] && ok "S9 service_role call creates the lead" || bad "S9 service_role call: $r"
r2=$("${P[@]}" -At -d rehearsal_s9 -c "set role service_role; select (kayad_create_lead_atomic((select buyer from leads limit 1),(select dealer from leads limit 1),null,'x','y',1))->>'created'" 2>&1 | head -1)
echo "  FINDING S9 repeating an identical create WITHOUT a unique business-key index returned created=$r2 and leads now=$(q rehearsal_s9 "select count(*) from leads") (ON CONFLICT DO NOTHING can never fire; production has no such index)"
"${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s9 -f "$HERE/../runbooks/LEADS_V1_CANDIDATE_unique_business_identity.sql" >/dev/null 2>"$TMPE" && bad "S9 candidate index should fail while duplicates exist" || ok "S9 candidate unique index fails loudly while duplicate lead keys exist (no silent dedupe)"
q rehearsal_s9 "delete from leads" >/dev/null
"${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s9 -f "$HERE/../runbooks/LEADS_V1_CANDIDATE_unique_business_identity.sql" >/dev/null 2>"$TMPE" && ok "S9 candidate unique index created on an empty leads table (production has 0 leads)" || bad "S9 candidate index: $(head -c 200 "$TMPE")"
a=$("${P[@]}" -At -d rehearsal_s9 -c "set role service_role; select (kayad_create_lead_atomic('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',null,'x','y',1))->>'created'" 2>&1 | head -1)
b=$("${P[@]}" -At -d rehearsal_s9 -c "set role service_role; select (kayad_create_lead_atomic('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',null,'x','y',1))->>'created'" 2>&1 | head -1)
[ "$a$b" = truefalse ] && [ "$(q rehearsal_s9 "select count(*) from leads")" = 1 ] && ok "S9 with the candidate index: first create=true, identical repeat=false, one row" || bad "S9 idempotent create: $a $b"
rm -f /tmp/_lead_*.out; for i in $(seq 1 20); do ( "${P[@]}" -At -d rehearsal_s9 -c "set role service_role; select (kayad_create_lead_atomic('33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444',null,'race','r',1))->>'created'" >/tmp/_lead_$i.out 2>&1 ) & done; wait
[ "$(cat /tmp/_lead_*.out | grep -c '^true$')" = 1 ] && [ "$(q rehearsal_s9 "select count(*) from leads where source='race'")" = 1 ] && ok "S9 20 concurrent identical creates: exactly one lead row (advisory lock + unique index)" || bad "S9 concurrent lead create: $(cat /tmp/_lead_*.out | sort | uniq -c | tr '\n' ' ')"
"${P[@]}" -v ON_ERROR_STOP=1 -d rehearsal_s9 -f "$M/20261011093000_revoke_client_execute_on_kayad_rpcs.sql" >/dev/null 2>"$TMPE" && ok "S9 20261011093000 applied" || bad "S9 20261011093000: $(head -c 250 "$TMPE")"
[ "$(priv rehearsal_s9 anon "$LC")$(priv rehearsal_s9 authenticated "$LC")$(priv rehearsal_s9 service_role "$LC")" = fft ] && ok "S9 after 20261011093000: anon=f authenticated=f service_role=t" || bad "S9 privileges after revoke"
r=$("${P[@]}" -At -d rehearsal_s9 -c "set role service_role; select (kayad_create_lead_atomic(gen_random_uuid(),gen_random_uuid(),null,'z','z',1))->>'created'" 2>&1 | head -1)
[ "$r" = true ] && ok "S9 backend path (service_role) still works after the revoke" || bad "S9 service_role after revoke: $r"

echo "== RESULT: $PASS passed, $FAIL failed =="
[ "$FAIL" = 0 ]
