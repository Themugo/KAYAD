#!/usr/bin/env bash
# STAGE 5E — rehearse the privilege candidate on a DISPOSABLE database whose grants are forced to the OBSERVED hosted state.
set -uo pipefail
export PATH=/usr/lib/postgresql/16/bin:$PATH
PORT=54339; SRC=kayad5d_hostedlike_disposable; DB=kayad5e_priv_disposable
case "$DB" in *_disposable) ;; *) echo REFUSING; exit 1;; esac
PSQL="psql -h 127.0.0.1 -p $PORT -U postgres -v ON_ERROR_STOP=1 -qAt"
C=${CAND_DIR:-/home/claude/s5e/ex/runbooks/stage5e-owner-activation-20261019/migration-candidate}
$PSQL -d postgres -c "drop database if exists $DB" -c "create database $DB template $SRC" >/dev/null
Q() { $PSQL -d $DB "$@"; }
FN="public.kayad_activate_dealer_subscription_atomic(uuid,uuid,text,text,numeric,text,integer,jsonb,integer,text)"
state() { Q -c "select 'sub_exec anon='||has_function_privilege('anon','$FN','EXECUTE')||' auth='||has_function_privilege('authenticated','$FN','EXECUTE')||' svc='||has_function_privilege('service_role','$FN','EXECUTE')||' | otp anon='||coalesce((select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_schema='public' and table_name='otp_challenges' and grantee='anon'),'-')||' auth='||coalesce((select string_agg(privilege_type,',' order by privilege_type) from information_schema.role_table_grants where table_schema='public' and table_name='otp_challenges' and grantee='authenticated'),'-')"; }
# force the observed hosted state
Q -c "revoke all on function $FN from public, anon, authenticated, service_role; "
echo "OBSERVED-HOSTED-LIKE: $(state)"
echo "service_role call before:"; Q -c "set role service_role; select $FN is not null" 2>&1 | tail -1 | cut -c1-120
Q -c "set role service_role; select public.kayad_activate_dealer_subscription_atomic(gen_random_uuid(),gen_random_uuid(),'p','P',1,'KES',1,'{}'::jsonb,30,'h')" 2>&1 | grep -oE "permission denied[^\"]*|ERROR[^\"]*" | head -1
$PSQL -d $DB -f $C/20261019210000_stage5e_privilege_hardening_CANDIDATE.sql >/dev/null && echo "apply: ok"
echo "AFTER CANDIDATE:      $(state)"
$PSQL -d $DB -f $C/20261019210000_stage5e_privilege_hardening_CANDIDATE.sql >/dev/null && echo "re-apply (idempotent): ok; $(state)"
echo "service_role call after (expect a business/validation error, NOT permission denied):"
Q -c "set role service_role; select public.kayad_activate_dealer_subscription_atomic(gen_random_uuid(),gen_random_uuid(),'p','P',1,'KES',1,'{}'::jsonb,30,'h')" 2>&1 | grep -oE "permission denied[^\"]*|ERROR:[^\"]*" | head -1
echo "anon call after (expect permission denied):"; Q -c "set role anon; select public.kayad_activate_dealer_subscription_atomic(gen_random_uuid(),gen_random_uuid(),'p','P',1,'KES',1,'{}'::jsonb,30,'h')" 2>&1 | grep -oE "permission denied[^\"]*" | head -1
$PSQL -d $DB -f $C/20261019210000_stage5e_privilege_hardening_ROLLBACK_CANDIDATE.sql >/dev/null && echo "rollback: ok"
echo "AFTER ROLLBACK:       $(state)"
