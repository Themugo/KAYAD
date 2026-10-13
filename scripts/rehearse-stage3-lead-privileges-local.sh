#!/usr/bin/env bash
# STAGE 3 LOCAL REHEARSAL (throwaway PostgreSQL only). NOT EXECUTED AGAINST PRODUCTION OR STAGING.
# L1–L4: lead creation idempotency (defect reproduction, LEADS_V2 candidate, concurrency, historical duplicates, LEADS_V1
#        coexistence), lead RLS/table boundary under hosted-style table grants, lead stage transition.
# I1:    inspector_applications production shape vs API contract; INSPECTOR_V1 candidate.
# P1–P5: EXECUTE privilege matrix for kayad_rotate_refresh_token, kayad_register_identity_atomic, kayad_create_lead_atomic,
#        kayad_transition_lead_atomic under (1) stock PostgreSQL defaults, (2) hostile default function ACLs,
#        (3) remediation = 20261011093000 + ONBOARDING V3 step 9 + LEADS_V2; real anon calls; definer search_path candidate.
# Usage: PGHOST=/tmp PGPORT=55433 PGUSER=postgres ./scripts/rehearse-stage3-lead-privileges-local.sh
# Safety: refuses non-local hosts and DB names not starting with "rehearsal"; uses only PG* settings; ignores DATABASE_URL and
# SUPABASE_*. Harness role model (NOT proof of production): anon/authenticated/service_role are NOLOGIN roles created by
# scripts/rehearsal/onboarding_prod_shaped_baseline.sql, which also runs `alter role service_role bypassrls` (production fact,
# read-only catalog 2026-10-13). Calls are made as the superuser with `set role <role>`. No PostgREST, no Supabase Auth.
set -uo pipefail
HOST="${PGHOST:-/tmp}"; PORT="${PGPORT:-5432}"
case "$HOST" in /*|localhost|127.0.0.1) ;; *) echo "REFUSED: PGHOST must be a local socket or localhost"; exit 2;; esac
unset DATABASE_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_URL
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/.."; M="$ROOT/supabase/migrations"; R="$HERE/rehearsal"; RB="$ROOT/runbooks"
ORDER="20260930111500 20260930113000 20260930112000 20261001090000 20261001220000 20260930110000 20261011090000 20261011121000"
P=(psql -X -q -h "$HOST" -p "$PORT" -U "${PGUSER:-postgres}")
PASS=0; FAIL=0; TMPE=$(mktemp); OUT=$(mktemp -d)
ok(){ echo "  PASS  $1"; PASS=$((PASS+1)); }
bad(){ echo "  FAIL  $1"; FAIL=$((FAIL+1)); }
info(){ echo "  INFO  $1"; }
newdb(){ case "$1" in rehearsal*) ;; *) echo "REFUSED db name"; exit 2;; esac
  "${P[@]}" -d postgres -c "drop database if exists $1 with (force)" -c "create database $1" >/dev/null 2>&1; }
q(){ "${P[@]}" -At -d "$1" -c "$2" 2>&1; }
runf(){ "${P[@]}" -v ON_ERROR_STOP=1 -d "$1" -f "$2" >/dev/null 2>"$TMPE"; }
apply1(){ "${P[@]}" -v ON_ERROR_STOP=1 -1 -d "$1" -f "$M"/${2}_*.sql >/dev/null 2>"$TMPE"; }
base(){ runf "$1" "$R/onboarding_prod_shaped_baseline.sql" && "${P[@]}" -v ON_ERROR_STOP=1 -d "$1" -f "$M/20260710043210_20260710005500_sync_profiles_trigger.sql" >/dev/null 2>&1; }
# leads table in its pre-20260907200100 shape (same as Stage 2 S9; production has 0 leads rows), then the REAL lead migration.
leads_schema(){ q "$1" "create table public.leads(id uuid primary key default gen_random_uuid(), buyer uuid, dealer uuid, vehicle uuid, source text, source_reference text, estimated_value numeric default 0, stage text not null default 'new', is_hot boolean default false, archived boolean default false, last_activity_at timestamptz, created_at timestamptz not null default now())" >/dev/null
  runf "$1" "$M/20260907200100_lead_crm_domain_end_to_end.sql" || { bad "lead migration: $(head -c 200 "$TMPE")"; return 1; }
  q "$1" "grant all on all tables in schema public to service_role; grant usage on schema public to anon, authenticated, service_role" >/dev/null; }
LC="public.kayad_create_lead_atomic(uuid,uuid,uuid,text,text,numeric)"
LT="public.kayad_transition_lead_atomic(uuid,text,uuid)"
RPC_REG="public.kayad_register_identity_atomic(text,text,text,text,text,text,uuid,text,text,timestamptz)"
RPC_ROT="public.kayad_rotate_refresh_token(text,text,uuid,integer,uuid,text,text,text,timestamptz,uuid)"
FUNCS=("$RPC_ROT" "$RPC_REG" "$LC" "$LT")
priv(){ q "$1" "select has_function_privilege('$2','$3','execute')"; }
matrix(){ local db=$1 label=$2 f s; for f in "${FUNCS[@]}"; do s=$(q "$db" "select format('secdef=%s owner=%s config=%s', prosecdef, pg_get_userbyid(proowner), coalesce(array_to_string(proconfig,';'),'-')) from pg_proc where oid=to_regprocedure('$f')")
  echo "  MATRIX [$label] ${f#public.}  anon=$(priv "$db" anon "$f") authenticated=$(priv "$db" authenticated "$f") service_role=$(priv "$db" service_role "$f")  $s"; done; }
sr(){ "${P[@]}" -At -d "$1" -c "set role service_role; $2" 2>&1 | head -1; }
mk(){ echo "select (kayad_create_lead_atomic($1))->>'created'"; }
B1=11111111-1111-4111-8111-111111111111; D1=22222222-2222-4222-8222-222222222222; V1=33333333-3333-4333-8333-333333333333
echo "SERVER: $(q postgres 'select version()')"

echo "== L1 defect reproduction: current kayad_create_lead_atomic (20260907200100) is not idempotent =="
newdb rehearsal_l1; base rehearsal_l1; leads_schema rehearsal_l1
a=$(sr rehearsal_l1 "$(mk "'$B1','$D1',null,'walk-in',null,0")"); b=$(sr rehearsal_l1 "$(mk "'$B1','$D1',null,'walk-in',null,0")")
n=$(q rehearsal_l1 "select count(*) from leads")
[ "$a$b" = truetrue ] && [ "$n" = 2 ] && ok "L1 defect reproduced: identical repeat returned created=$b and leads=$n (duplicate business record)" || bad "L1 expected the defect, got a=$a b=$b leads=$n"

echo "== L2 LEADS_V2 candidate (find-before-insert under the same advisory lock) =="
runf rehearsal_l1 "$RB/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql" && ok "L2 LEADS_V2 applies on a database that already holds a duplicate key group (non-destructive)" || bad "L2 apply: $(head -c 250 "$TMPE")"
[ "$(q rehearsal_l1 "select count(*) from leads")" = 2 ] && ok "L2 no row was deleted or merged by the candidate" || bad "L2 row count changed"
oldest=$(q rehearsal_l1 "select id from leads order by created_at, id limit 1")
r=$("${P[@]}" -At -d rehearsal_l1 -c "set role service_role; select (x->>'created')||'|'||(x->'lead'->>'id') from kayad_create_lead_atomic('$B1','$D1',null,'walk-in',null,0) x" 2>&1 | head -1)
[ "$r" = "false|$oldest" ] && [ "$(q rehearsal_l1 "select count(*) from leads")" = 2 ] && ok "L2 repeat on a historical duplicate key returns the OLDEST lead, created=false, no new row" || bad "L2 repeat on historical dup: $r (oldest $oldest)"
a=$(sr rehearsal_l1 "$(mk "'$B1','$D1','$V1','auction','auc-1',5")"); b=$(sr rehearsal_l1 "$(mk "'$B1','$D1','$V1','auction','auc-1',5")")
[ "$a$b" = truefalse ] && ok "L2 new key: first create=true, identical repeat=false" || bad "L2 new key a=$a b=$b"
c=$(sr rehearsal_l1 "$(mk "'$B1','$D1','$V1','auction','auc-2',5")"); d=$(sr rehearsal_l1 "$(mk "'$B1','$D1','$V1','chat','auc-1',5")")
[ "$c$d" = truetrue ] && ok "L2 a different source_reference or source is a genuinely new lead" || bad "L2 distinct keys c=$c d=$d"
n0=$(q rehearsal_l1 "select count(*) from leads")
rm -f "$OUT"/lead_*.out
for i in $(seq 1 30); do ( "${P[@]}" -At -d rehearsal_l1 -c "set role service_role; $(mk "'$B1','$D1',null,'race','r-1',1")" >"$OUT/lead_$i.out" 2>&1 ) & done; wait
nt=$(cat "$OUT"/lead_*.out | grep -c '^true$'); nf=$(cat "$OUT"/lead_*.out | grep -c '^false$')
[ "$nt" = 1 ] && [ "$nf" = 29 ] && [ "$(q rehearsal_l1 "select count(*) from leads where source='race'")" = 1 ] && ok "L2 30 concurrent identical creates WITHOUT a unique index: exactly 1 created, 29 returned it, 1 row" || bad "L2 concurrency true=$nt false=$nf rows=$(q rehearsal_l1 "select count(*) from leads where source='race'") $(cat "$OUT"/lead_*.out | sort | uniq -c | tr '\n' ' ')"
runf rehearsal_l1 "$RB/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql" && [ "$(q rehearsal_l1 "select count(*) from leads")" = $((n0+1)) ] && ok "L2 candidate re-run is idempotent (no data effect)" || bad "L2 rerun"
[ "$(q rehearsal_l1 "select prosecdef from pg_proc where oid=to_regprocedure('$LC')")" = f ] && ok "L2 function remains SECURITY INVOKER" || bad "L2 secdef changed"
runf rehearsal_l1 "$RB/LEADS_V1_CANDIDATE_unique_business_identity.sql" && bad "L2 LEADS_V1 should still fail while the historical duplicate exists" || ok "L2 LEADS_V1 (unique index) still fails loudly while a historical duplicate exists — V2 does not need it"

echo "== L3 V1 + V2 together, and the lead RLS/table boundary under hosted-style client table grants =="
newdb rehearsal_l3; base rehearsal_l3; leads_schema rehearsal_l3
runf rehearsal_l3 "$RB/LEADS_V1_CANDIDATE_unique_business_identity.sql" && runf rehearsal_l3 "$RB/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql" && ok "L3 V1 index then V2 body applied on an empty leads table" || bad "L3 apply: $(head -c 200 "$TMPE")"
a=$(sr rehearsal_l3 "$(mk "'$B1','$D1',null,'walk-in',null,0")"); b=$(sr rehearsal_l3 "$(mk "'$B1','$D1',null,'walk-in',null,0")")
[ "$a$b" = truefalse ] && [ "$(q rehearsal_l3 "select count(*) from leads")" = 1 ] && ok "L3 with V1+V2: create=true, repeat=false, one row" || bad "L3 a=$a b=$b"
q rehearsal_l3 "grant all on public.leads, public.lead_activities to anon, authenticated" >/dev/null
info "L3 simulated hosted default: GRANT ALL ON leads, lead_activities TO anon, authenticated (production has none of SELECT/INSERT/UPDATE/DELETE per Stage 2 read-only check)"
for role in anon authenticated; do
  s=$("${P[@]}" -At -d rehearsal_l3 -c "set role $role; select count(*) from public.leads" 2>&1 | head -1)
  [ "$s" = 0 ] && ok "L3 $role SELECT on leads sees 0 of 1 rows (deny-all RLS policy leads_service_only)" || bad "L3 $role select: $s"
  s=$("${P[@]}" -At -d rehearsal_l3 -c "set role $role; insert into public.leads(buyer,dealer,source) values ('$B1','$D1','x')" 2>&1 | head -1)
  case "$s" in *"row-level security"*) ok "L3 $role direct INSERT rejected by RLS";; *) bad "L3 $role insert: $s";; esac
  s=$("${P[@]}" -At -d rehearsal_l3 -c "set role $role; $(mk "gen_random_uuid(),gen_random_uuid(),null,'x','y',1")" 2>&1 | head -1)
  case "$s" in *"row-level security"*|*"permission denied"*) ok "L3 $role RPC create (still EXECUTE-able, invoker rights) rejected: $(echo "$s" | head -c 80)";; *) bad "L3 $role rpc: $s";; esac
done
[ "$(q rehearsal_l3 "select count(*) from leads")" = 1 ] && ok "L3 no client-role attempt created a row" || bad "L3 client role created rows"

echo "== L4 kayad_transition_lead_atomic behaviour (service_role) =="
lid=$(q rehearsal_l3 "select id from leads limit 1"); actor=$(q rehearsal_l3 "select id from users order by email limit 1")   # lead_activities.actor FK → users
s=$(sr rehearsal_l3 "select kayad_transition_lead_atomic('$lid','contacted','$actor')->>'stage'")
[ "$s" = contacted ] && [ "$(q rehearsal_l3 "select count(*) from lead_activities where lead='$lid' and type='stage_changed'")" = 1 ] && ok "L4 new→contacted applied with one stage_changed activity" || bad "L4 transition: $s"
s=$(sr rehearsal_l3 "select kayad_transition_lead_atomic('$lid','sold','$actor')")
case "$s" in *"Invalid lead stage transition"*) ok "L4 contacted→sold rejected by the state machine";; *) bad "L4 illegal transition: $s";; esac
s=$("${P[@]}" -At -d rehearsal_l3 -c "set role anon; select kayad_transition_lead_atomic('$lid','lost',null)" 2>&1 | head -1)
case "$s" in *"row-level security"*|*"permission denied"*|*"Lead not found"*) ok "L4 anon transition attempt has no effect: $(echo "$s" | head -c 80)";; *) bad "L4 anon transition: $s";; esac
[ "$(q rehearsal_l3 "select stage from leads where id='$lid'")" = contacted ] && ok "L4 stage unchanged by the anon attempt" || bad "L4 anon changed stage"

echo "== P1 privilege matrix, stock PostgreSQL defaults (functions EXECUTE-able by PUBLIC unless revoked) =="
newdb rehearsal_p1; base rehearsal_p1
for v in $ORDER; do apply1 rehearsal_p1 $v || bad "P1 $v: $(head -c 200 "$TMPE")"; done; leads_schema rehearsal_p1
matrix rehearsal_p1 "stock"
[ "$(priv rehearsal_p1 anon "$LC")$(priv rehearsal_p1 anon "$LT")" = tt ] && ok "P1 confirms finding: both lead functions are EXECUTE-able by anon (PUBLIC) until 20261011093000 runs" || bad "P1 lead function exposure differs"
[ "$(priv rehearsal_p1 anon "$RPC_ROT")$(priv rehearsal_p1 anon "$RPC_REG")" = ff ] && ok "P1 rotate/register closed to anon under stock defaults (REVOKE … FROM PUBLIC suffices when no explicit grant exists)" || bad "P1 onboarding RPC exposure"

echo "== P2 hostile default function ACL (auto-grant EXECUTE to anon, authenticated) =="
newdb rehearsal_p2; base rehearsal_p2
q rehearsal_p2 "alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role" >/dev/null
for v in $ORDER; do apply1 rehearsal_p2 $v || bad "P2 $v: $(head -c 200 "$TMPE")"; done; leads_schema rehearsal_p2
matrix rehearsal_p2 "hostile-before"
[ "$(priv rehearsal_p2 anon "$RPC_ROT")" = t ] && ok "P2 confirms Stage 2 finding: rotate RPC EXECUTE-able by anon under hostile defaults" || bad "P2 rotate expected exposed"
[ "$(priv rehearsal_p2 anon "$RPC_REG")" = f ] && ok "P2 register RPC closed even under hostile defaults (explicit revoke in 20261001220000)" || bad "P2 register exposed"

echo "== P3 remediation: LEADS_V2, then 20261011093000, then ONBOARDING V3 step 9 =="
runf rehearsal_p2 "$RB/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql" && ok "P3 LEADS_V2 applied" || bad "P3 V2: $(head -c 200 "$TMPE")"
runf rehearsal_p2 "$M/20261011093000_revoke_client_execute_on_kayad_rpcs.sql" && ok "P3 20261011093000 applied" || bad "P3 093000: $(head -c 200 "$TMPE")"
runf rehearsal_p2 "$RB/ONBOARDING_V3_CANDIDATE_9_explicit_client_revokes.sql" && ok "P3 V3 step 9 applied" || bad "P3 step9: $(head -c 200 "$TMPE")"
matrix rehearsal_p2 "remediated"
allf=1; for f in "${FUNCS[@]}"; do [ "$(priv rehearsal_p2 anon "$f")$(priv rehearsal_p2 authenticated "$f")$(priv rehearsal_p2 service_role "$f")" = fft ] || allf=0; done
[ "$allf" = 1 ] && ok "P3 all four functions: anon=f authenticated=f service_role=t under hostile defaults" || bad "P3 matrix not least-privilege"
runf rehearsal_p2 "$RB/LEADS_V2_CANDIDATE_create_lead_find_before_insert.sql" && [ "$(priv rehearsal_p2 anon "$LC")" = f ] && ok "P3 re-applying LEADS_V2 AFTER the revoke keeps anon=f (CREATE OR REPLACE preserves the ACL)" || bad "P3 V2 re-apply widened ACL"
echo "== P4 real calls as client roles after remediation =="
for role in anon authenticated; do
  for call in "select kayad_create_lead_atomic(gen_random_uuid(),gen_random_uuid(),null,'x','y',1)" "select kayad_transition_lead_atomic(gen_random_uuid(),'lost',null)" "select kayad_rotate_refresh_token('a','b',gen_random_uuid(),0,null,'d','u','i',now(),gen_random_uuid())" "select kayad_register_identity_atomic('n','p4-$role@example.test','user',null,null,null,null,'h','v',now())"; do
    s=$("${P[@]}" -At -d rehearsal_p2 -c "set role $role; $call" 2>&1 | head -1)
    case "$s" in *"permission denied for function"*) ok "P4 $role → $(echo "$call" | grep -o 'kayad_[a-z_]*') : permission denied for function";; *) bad "P4 $role $call: $s";; esac
  done
done
[ "$(q rehearsal_p2 "select count(*) from users where email like 'p4-%'")" = 0 ] && ok "P4 no client-role call created a user" || bad "P4 users created"
s=$(sr rehearsal_p2 "$(mk "'$B1','$D1',null,'walk-in',null,0")"); [ "$s" = true ] && ok "P4 backend path (service_role) still creates leads after remediation" || bad "P4 service_role lead: $s"

echo "== P5 SECURITY DEFINER search_path candidate (pg_temp last) + onboarding behaviour unchanged =="
runf rehearsal_p2 "$RB/STAGE3_CANDIDATE_definer_search_path_pg_temp.sql" && ok "P5 search_path candidate applied" || bad "P5 apply: $(head -c 200 "$TMPE")"
runf rehearsal_p2 "$RB/STAGE3_CANDIDATE_definer_search_path_pg_temp.sql" && ok "P5 search_path candidate re-run is idempotent" || bad "P5 rerun"
[ "$(q rehearsal_p2 "select count(*) from pg_proc where oid in (to_regprocedure('$RPC_ROT'),to_regprocedure('$RPC_REG')) and prosecdef and proconfig @> array['search_path=public, pg_temp']")" = 2 ] && ok "P5 both definers: prosecdef=t, search_path=public, pg_temp" || bad "P5 config: $(q rehearsal_p2 "select proconfig from pg_proc where proname like 'kayad_r%'")"
runf rehearsal_p2 "$R/onboarding_assertions.sql" && ok "P5 onboarding behavioural assertions (register/dup/rotate/replay/family/ledger) pass after all candidates" || bad "P5 assertions: $(head -c 300 "$TMPE")"
matrix rehearsal_p2 "final"
newdb rehearsal_p5x; base rehearsal_p5x
runf rehearsal_p5x "$RB/STAGE3_CANDIDATE_definer_search_path_pg_temp.sql" && bad "P5 candidate should refuse to run before the chain" || ok "P5 candidate fails loudly (no partial change) when the functions are absent: $(grep -o 'expected function[^(]*' "$TMPE" | head -1)"

echo "== I1 inspector_applications: production shape (integer years) vs the API contract (fractional years), INSPECTOR_V1 candidate =="
PROD_INSP="create table public.inspector_applications(id uuid primary key default gen_random_uuid(), user_id uuid, full_name text not null, email text not null, phone text, id_number text, location text, years_of_experience integer, specialties text[] not null default '{}', certifications text[] not null default '{}', tools_available text, preferred_regions text[] not null default '{}', cv_url text, certification_docs jsonb not null default '[]', status text not null default 'pending', reviewed_by uuid, reviewed_at timestamptz, review_notes text, assigned_specialty text, assigned_region text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()); create index idx_inspector_applications_email_status on public.inspector_applications(email,status); alter table public.inspector_applications enable row level security"
# PostgREST (supabase-js) decodes the JSON body with json_populate_recordset — reproduce that path, not a SQL literal
# (a SQL literal 2.5 would be silently ROUNDED to 3 by the integer assignment cast).
ins(){ echo "insert into public.inspector_applications(full_name,email,phone,id_number,location,years_of_experience,specialties) select full_name,email,phone,id_number,location,years_of_experience,specialties from json_populate_recordset(null::public.inspector_applications, '[{\"full_name\":\"A\",\"email\":\"$1\",\"phone\":\"0700\",\"id_number\":\"ID1\",\"location\":\"Nairobi\",\"years_of_experience\":2.5,\"specialties\":[\"engine\"]}]')"; }
newdb rehearsal_i1; base rehearsal_i1; q rehearsal_i1 "$PROD_INSP" >/dev/null
q rehearsal_i1 "insert into public.inspector_applications(full_name,email,years_of_experience) values ('Seed','s@example.test',7)" >/dev/null
for v in $ORDER; do apply1 rehearsal_i1 $v || bad "I1 chain $v: $(head -c 200 "$TMPE")"; done
s=$(q rehearsal_i1 "$(ins a1@example.test)"); case "$s" in *"invalid input syntax for type integer"*) ok "I1 defect reproduced AFTER the onboarding chain: a 2.5-year application is rejected by the production integer column";; *) bad "I1 expected integer rejection, got: $s";; esac
runf rehearsal_i1 "$RB/INSPECTOR_V1_CANDIDATE_years_of_experience_numeric.sql" && ok "I1 INSPECTOR_V1 applied over the production shape" || bad "I1 apply: $(head -c 200 "$TMPE")"
[ "$(q rehearsal_i1 "select format_type(atttypid,atttypmod) from pg_attribute where attrelid='public.inspector_applications'::regclass and attname='years_of_experience'")" = "numeric(5,2)" ] && ok "I1 column is numeric(5,2)" || bad "I1 type"
s=$(q rehearsal_i1 "$(ins a2@example.test)"); [ -z "$s" ] && [ "$(q rehearsal_i1 "select years_of_experience from inspector_applications where email='a2@example.test'")" = 2.50 ] && ok "I1 the 2.5-year application (JSON array for text[]) now inserts as 2.50" || bad "I1 insert after: $s"
[ "$(q rehearsal_i1 "select years_of_experience from inspector_applications where email='s@example.test'")" = "7.00" ] && [ "$(q rehearsal_i1 "select count(*) from inspector_applications")" = 2 ] && ok "I1 existing row preserved (7 → 7.00), no row lost" || bad "I1 data"
s=$(q rehearsal_i1 "insert into public.inspector_applications(full_name,email,years_of_experience) values ('B','b@example.test',81)"); case "$s" in *"check constraint"*) ok "I1 81 years rejected by the 0..80 CHECK";; *) bad "I1 range: $s";; esac
[ "$(q rehearsal_i1 "select data_type from information_schema.columns where table_name='inspector_applications' and column_name='specialties'")" = ARRAY ] && ok "I1 text[] columns untouched (PostgREST JSON-array compatible)" || bad "I1 arrays changed"
runf rehearsal_i1 "$RB/INSPECTOR_V1_CANDIDATE_years_of_experience_numeric.sql" && [ "$(q rehearsal_i1 "select count(*) from pg_constraint where conrelid='public.inspector_applications'::regclass and contype='c'")" = 1 ] && ok "I1 re-run is a no-op (one CHECK, same type)" || bad "I1 rerun"
newdb rehearsal_i1b; base rehearsal_i1b; q rehearsal_i1b "$PROD_INSP" >/dev/null; q rehearsal_i1b "insert into public.inspector_applications(full_name,email,years_of_experience) values ('X','x@example.test',90)" >/dev/null
runf rehearsal_i1b "$RB/INSPECTOR_V1_CANDIDATE_years_of_experience_numeric.sql" && bad "I1b should refuse out-of-range data" || { [ "$(q rehearsal_i1b "select format_type(atttypid,atttypmod) from pg_attribute where attrelid='public.inspector_applications'::regclass and attname='years_of_experience'")" = integer ] && ok "I1b out-of-range existing row: candidate fails loudly, type unchanged, data untouched" || bad "I1b partial change"; }
newdb rehearsal_i1c; base rehearsal_i1c; for v in $ORDER; do apply1 rehearsal_i1c $v; done
runf rehearsal_i1c "$RB/INSPECTOR_V1_CANDIDATE_years_of_experience_numeric.sql" && [ "$(q rehearsal_i1c "select count(*) from pg_constraint where conrelid='public.inspector_applications'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%years_of_experience%'")" = 1 ] && ok "I1c on a repository-shaped table (chain-created) the candidate is a no-op" || bad "I1c: $(head -c 200 "$TMPE")"

for d in rehearsal_l1 rehearsal_l3 rehearsal_p1 rehearsal_p2 rehearsal_p5x rehearsal_i1 rehearsal_i1b rehearsal_i1c; do "${P[@]}" -d postgres -c "drop database if exists $d with (force)" >/dev/null; done
rm -rf "$OUT" "$TMPE"
echo "== RESULT: $PASS passed, $FAIL failed =="
[ "$FAIL" = 0 ]
