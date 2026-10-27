#!/bin/bash
# usage: run_e2e_suites.sh <outdir> ; runs every Phase 14-16A DB E2E on the current tree, each against a freshly recreated database
OUT=${1:-/home/claude/p16c/ev/e2e}; mkdir -p $OUT; : > $OUT/_results.tsv
run() { # name script mode
  local name=$1 script=$2 mode=$3
  /home/claude/p16c/reset_db.sh $mode >/dev/null 2>&1
  if [ $mode = owner ]; then export EXTRA_ENV="WEBHOIST_EMAIL=owner148@example.test OWNER_MFA_ENCRYPTION_KEY=$(cat /home/claude/p16c/mfa.key)"; else export EXTRA_ENV="WEBHOIST_EMAIL=owner148@example.test"; fi
  /home/claude/p16c/start-backend.sh >/dev/null 2>&1
  (cd $(cat /home/claude/p16c/ws.path) && BACKEND_ENV=/home/claude/p16c/backend.env PGDB=kayad_t timeout 1500 node $script > $OUT/$name.log 2>&1; echo "exit=$?" >> $OUT/$name.log)
  local p=$(grep -c '^PASS' $OUT/$name.log); local f=$(grep -c '^FAIL' $OUT/$name.log); local x=$(grep '^exit=' $OUT/$name.log | cut -d= -f2)
  printf "%s\t%s\t%s\tpass=%s\tfail=%s\texit=%s\n" "$name" "$mode" "$script" "$p" "$f" "$x" >> $OUT/_results.tsv
}
run owner_identity_governance runbooks/phase16-20261026/e2e_owner_identity_governance.cjs owner
run phase16a_arrangement runbooks/phase16a-20261026/e2e_phase16a_arrangement.cjs owner
run account_security_owner_tables runbooks/phase16-20261026/e2e_account_security.cjs owner
run account_security_legacy runbooks/phase16-20261026/e2e_account_security.cjs legacy
run identity_integrity runbooks/phase16-20261026/e2e_identity_integrity.cjs legacy
run dealer_lifecycle runbooks/phase16-20261026/e2e_dealer_lifecycle.cjs legacy
run dealer_payments runbooks/phase16-20261026/e2e_dealer_payments.cjs legacy
run inventory_team runbooks/phase16-20261026/e2e_inventory_team.cjs legacy
run superadmin_governance runbooks/phase16-20261026/e2e_superadmin_governance.cjs legacy
run phase16b_owner_dealer_separation runbooks/phase16b-20261027/http/e2e_phase16b_owner_dealer_separation.cjs owner
echo done > $OUT/_done
