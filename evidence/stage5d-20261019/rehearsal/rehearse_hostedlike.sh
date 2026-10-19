#!/usr/bin/env bash
# STAGE 5D Gate 4 — upgrade rehearsal from a HOSTED-LIKE baseline. DISPOSABLE LOOPBACK DATABASE ONLY.
# Baseline = local migrations whose names appear in the hosted history read on 2026-10-19 (hosted-only migrations, whose SQL is not in the repo, cannot be replicated).
set -u
export PGHOST=127.0.0.1 PGPORT=54339 PGUSER=postgres
X=${1:?extracted project root}; W=/home/claude/s5d/work; DB=kayad5d_hostedlike_disposable
case "$PGHOST" in 127.0.0.1) ;; *) echo REFUSING; exit 2;; esac
psql -X -q -d postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB" >/dev/null
psql -X -q -d $DB -v ON_ERROR_STOP=1 -f /home/claude/s5b/pg/00_LOCAL_SUPABASE_SHIM_DISPOSABLE_ONLY.sql >/dev/null || { echo "shim failed"; exit 1; }
q(){ psql -X -q -At -d $DB -c "$1" 2>&1; }
apply(){ out=$(psql -X -q -v ON_ERROR_STOP=1 -d $DB -1 -f "$1" 2>&1) && echo "OK   $(basename $1)" || echo "FAIL $(basename $1) :: $(echo "$out" | grep -m1 ERROR | cut -c1-200)"; }
python3 - "$X" <<'PY' > $W/split.txt
import os,re,sys
def stem(n):
    n=re.sub(r'\.sql$','',n)
    while re.match(r'^\d{8,14}_',n): n=re.sub(r'^\d{8,14}_','',n)
    return re.sub(r'_20\d{6}$','',n)
H={stem(l.strip().split('|')[1]) for l in open('/home/claude/s5d/work/hosted_names.txt')}
for f in sorted(os.listdir(sys.argv[1]+'/supabase/migrations')): print(('H ' if stem(f) in H else 'M ')+f)
PY
echo "== baseline: $(grep -c '^H ' $W/split.txt) migrations that hosted has; $(grep -c '^M ' $W/split.txt) that hosted lacks"
bfail=0; for f in $(grep '^H ' $W/split.txt | cut -c3-); do r=$(apply $X/supabase/migrations/$f); case "$r" in FAIL*) bfail=$((bfail+1)); echo "$r";; esac; done
echo "baseline apply failures (tolerated, listed above): $bfail"
probe(){ q "select json_build_object('register_rpc',exists(select 1 from pg_proc where proname='kayad_register_identity_atomic'),'users_deactivated_at',exists(select 1 from information_schema.columns where table_name='users' and column_name='deactivated_at'),'users_granted_permissions',exists(select 1 from information_schema.columns where table_name='users' and column_name='granted_permissions'),'lower_email_unique',exists(select 1 from pg_indexes where tablename='users' and indexdef ilike '%lower%email%'),'dealers_onboarding_complete',exists(select 1 from information_schema.columns where table_name='dealers' and column_name='onboarding_complete'),'dealers_payment_details',exists(select 1 from information_schema.columns where table_name='dealers' and column_name='payment_details'),'dv_allows_suspended',(select coalesce(bool_or(pg_get_constraintdef(oid) ilike '%suspended%'),false) from pg_constraint where conrelid='public.dealer_verifications'::regclass and contype='c'),'refresh_session_id',exists(select 1 from information_schema.columns where table_name='refresh_tokens' and column_name='session_id'),'owner_memberships',exists(select 1 from information_schema.tables where table_name='owner_memberships'),'owner_fns',(select count(*) from pg_proc where proname like 'kayad\_owner\_%'),'otp_delivery_failed',(select coalesce(bool_or(pg_get_constraintdef(oid) ilike '%delivery_failed%'),false) from pg_constraint where conrelid='public.otp_challenges'::regclass and contype='c'))"; }
echo "== PROBE hosted-like baseline:"; probe
echo "== seed baseline rows"
q "insert into users(name,email,role,status,email_verified) values ('seed dealer','seed-dealer@kayad-test.example','dealer','pending',false),('seed buyer','seed-buyer@kayad-test.example','user','approved',true)" >/dev/null
q "select count(*) from users" | sed 's/^/users before: /'
pre=$(q "select md5(string_agg(id::text||email||role||status, ',' order by email)) from users"); echo "users digest before: $pre"
echo "== upgrade: apply the migrations hosted lacks, in repository order"
ufail=0; for f in $(grep '^M ' $W/split.txt | cut -c3-); do r=$(apply $X/supabase/migrations/$f); case "$r" in FAIL*) ufail=$((ufail+1)); echo "$r";; esac; done
echo "upgrade failures: $ufail"
echo "== PROBE after chain:"; probe
post=$(q "select md5(string_agg(id::text||email||role||status, ',' order by email)) from users where email like 'seed-%'" ); pre2=$(q "select md5(string_agg(id::text||email||role||status, ',' order by email)) from users where email like 'seed-%'")
echo "seed rows still present: $(q "select count(*) from users where email like 'seed-%'")"
echo "== 5B owner-governance candidate"; apply $X/runbooks/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql
echo "== PROBE after 5B:"; probe
echo "== 5C subscription candidate"; apply $X/runbooks/stage5c-onboarding-20261019/migration-candidate/20261019200000_stage5c_subscription_activation_CANDIDATE.sql
h5c=$(q "select md5(pg_get_functiondef(p.oid)) from pg_proc p where proname='kayad_activate_dealer_subscription_atomic'"); echo "5C function md5 after candidate: $h5c"
echo "== rollback 5C"; apply $X/runbooks/stage5c-onboarding-20261019/migration-candidate/20261019200000_stage5c_subscription_activation_ROLLBACK_CANDIDATE.sql
echo "5C function md5 after rollback: $(q "select md5(pg_get_functiondef(p.oid)) from pg_proc p where proname='kayad_activate_dealer_subscription_atomic'")"
echo "== rollback 5B"; apply $X/runbooks/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_ROLLBACK_CANDIDATE.sql
echo "== PROBE after rollbacks:"; probe
echo "seed rows after rollbacks: $(q "select count(*) from users where email like 'seed-%'")  users digest after: $(q "select md5(string_agg(id::text||email||role||status, ',' order by email)) from users where email like 'seed-%'")"
echo "== re-apply both candidates (idempotence of the forward path)"
apply $X/runbooks/stage5b-owner-governance-20261019/migration-candidate/20261019120000_stage5b_owner_governance_CANDIDATE.sql
apply $X/runbooks/stage5c-onboarding-20261019/migration-candidate/20261019200000_stage5c_subscription_activation_CANDIDATE.sql
echo "5C function md5 after re-apply: $(q "select md5(pg_get_functiondef(p.oid)) from pg_proc p where proname='kayad_activate_dealer_subscription_atomic'")"
echo "DONE"
