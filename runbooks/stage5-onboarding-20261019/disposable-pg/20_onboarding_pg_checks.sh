#!/usr/bin/env bash
# Real-PostgreSQL checks for Stage 5 on a DISPOSABLE database that already has the full migration chain.
# Each check prints PASS/FAIL; exit code is non-zero if any check fails.
set -u
: "${PGHOST:?}"; : "${PGPORT:?}"; DB="${1:?db name}"
case "$PGHOST" in 127.0.0.1|localhost|::1) ;; *) echo "REFUSING: host not loopback"; exit 2;; esac
case "$DB" in *_disposable) ;; *) echo "REFUSING: db name must end with _disposable"; exit 2;; esac
Q() { psql -X -At -d "$DB" "$@" 2>&1; }
pass=0; fail=0
ok()  { pass=$((pass+1)); echo "PASS  $1"; }
bad() { fail=$((fail+1)); echo "FAIL  $1  -> $2"; }
expect() { # name, expected-substring, actual
  case "$3" in *"$2"*) ok "$1";; *) bad "$1" "expected '$2' in: $(echo "$3" | head -c 300)";; esac; }

RPC="select kayad_register_identity_atomic(%s)"
reg() { # role email [password-hash]
  Q -c "set role service_role; select kayad_register_identity_atomic('N','$2','$1','0700000000','Biz','Nairobi',null,'${3:-hash}','tokenhash',now()+interval '1 day')" ; }

# ---- A. atomic registration RPC ----
Q -c "delete from user_auth; delete from users where email like '%@s5.test'" >/dev/null
out=$(reg individual_seller seller@s5.test); expect "A1 individual_seller registers" '"role": "individual_seller"' "$out"
expect "A1b starts pending and email_verified=false" '"status": "pending"' "$out"
expect "A1c email_verified false" '"email_verified": false' "$out"
out=$(reg dealer dealer@s5.test); expect "A2 dealer registers pending" '"status": "pending"' "$out"
n=$(Q -c "select count(*) from dealers d join users u on u.id=d.\"user\" where u.email='dealer@s5.test' and d.approved=false"); expect "A2b dealer profile created unapproved by trigger" "1" "$n"
out=$(reg user buyer@s5.test); expect "A3 buyer approved" '"status": "approved"' "$out"
for r in admin superadmin webhoist ghost_checker; do out=$(reg $r esc-$r@s5.test); expect "A4 role '$r' refused by the database" "Invalid self-registration role" "$out"; done
out=$(reg user "BUYER@S5.TEST"); expect "A5 duplicate email (case) refused (unique violation)" "duplicate key" "$out"
out=$(reg user " buyer@s5.test "); expect "A5b duplicate email (spaces) refused" "duplicate key" "$out"
out=$(Q -c "set role service_role; select kayad_register_identity_atomic('N','nopw@s5.test','user',null,null,null,null,null,'t',now())")
expect "A6 user_auth failure aborts the whole registration" "null value" "$out"
n=$(Q -c "select count(*) from users where email='nopw@s5.test'"); expect "A6b no orphan user row after failed credential insert" "0" "$n"
out=$(Q -c "set role anon; select kayad_register_identity_atomic('N','anon@s5.test','user',null,null,null,null,'h','t',now())"); expect "A7 anon cannot execute the RPC" "permission denied" "$out"
out=$(Q -c "set role authenticated; select kayad_register_identity_atomic('N','auth@s5.test','user',null,null,null,null,'h','t',now())"); expect "A7b authenticated cannot execute the RPC" "permission denied" "$out"
# concurrent duplicate registration: exactly one wins
( reg user race@s5.test > /tmp/s5_race1.$$ 2>&1 & reg user race@s5.test > /tmp/s5_race2.$$ 2>&1 & wait )
w=$(cat /tmp/s5_race1.$$ /tmp/s5_race2.$$ | grep -c '"role": "user"'); l=$(cat /tmp/s5_race1.$$ /tmp/s5_race2.$$ | grep -c 'duplicate key'); rm -f /tmp/s5_race*.$$
[ "$w" = "1" ] && [ "$l" = "1" ] && ok "A8 concurrent duplicate registration: one winner, one unique violation" || bad "A8 concurrent duplicate" "winners=$w losers=$l"
n=$(Q -c "select count(*) from users where email='race@s5.test'"); expect "A8b exactly one row for the raced email" "1" "$n"

# ---- B. system_settings: onboarding_policy storage semantics ----
Q -c "delete from system_settings where key='onboarding_policy'" >/dev/null
out=$(Q -c "set role service_role; insert into system_settings(key,value) values ('onboarding_policy','{\"revision\":1,\"dealerOnboardingMode\":\"approval_required\"}')"); expect "B1 first insert (service_role)" "INSERT 0 1" "$out"
out=$(Q -c "set role service_role; insert into system_settings(key,value) values ('onboarding_policy','{\"revision\":1}')"); expect "B2 second insert -> 23505 (the 409 path)" "duplicate key" "$out"
out=$(Q -c "set role service_role; update system_settings set value='{\"revision\":2}' where key='onboarding_policy' and value->>'revision'='1' returning key"); expect "B3 CAS update on current revision affects 1 row" "onboarding_policy" "$out"
out=$(Q -c "set role service_role; update system_settings set value='{\"revision\":9}' where key='onboarding_policy' and value->>'revision'='1' returning key"); [ -z "$(echo "$out" | grep onboarding_policy)" ] && ok "B4 CAS update on STALE revision affects 0 rows (the 409 path)" || bad "B4" "$out"
# concurrent writers from the same revision: row lock + READ COMMITTED re-check => exactly one wins
Q -c "update system_settings set value='{\"revision\":10}' where key='onboarding_policy'" >/dev/null
( Q -c "set role service_role; begin; update system_settings set value='{\"revision\":11,\"w\":\"A\"}' where key='onboarding_policy' and value->>'revision'='10' returning 'A_WON'; select pg_sleep(1.5); commit" > /tmp/s5_cA.$$ 2>&1 &
  sleep 0.4
  Q -c "set role service_role; update system_settings set value='{\"revision\":11,\"w\":\"B\"}' where key='onboarding_policy' and value->>'revision'='10' returning 'B_WON'" > /tmp/s5_cB.$$ 2>&1 & wait )
a=$(grep -c A_WON /tmp/s5_cA.$$); b=$(grep -c B_WON /tmp/s5_cB.$$); rm -f /tmp/s5_c?.$$
[ "$a" = "1" ] && [ "$b" = "0" ] && ok "B5 concurrent CAS writers: A wins, B (blocked on the row lock) re-evaluates and updates 0 rows" || bad "B5" "A=$a B=$b"
w=$(Q -c "select value->>'w' from system_settings where key='onboarding_policy'"); expect "B5b stored value is the winner's" "A" "$w"
out=$(Q -c "set role anon; select * from system_settings"); expect "B6 anon cannot read system_settings (policy values are not publicly readable)" "permission denied" "$out"
out=$(Q -c "set role authenticated; update system_settings set value='{}' where key='onboarding_policy'"); expect "B7 authenticated cannot write system_settings" "permission denied" "$out"
out=$(Q -c "set role service_role; update system_settings set value='{\"revision\":12}', updated_at=now() where key='onboarding_policy' and value->>'revision'='11' returning 1"); expect "B8 update trigger/updated_at path is compatible with the CAS statement" "1" "$out"

# ---- C. cars_status_check (decision D3) ----
def=$(Q -c "select pg_get_constraintdef(oid) from pg_constraint where conname='cars_status_check'")
case "$def" in *rejected*) echo "NOTE  cars_status_check ALREADY accepts 'rejected' on this database: $def";; *) ok "C1 current chain: cars_status_check does NOT include 'rejected' (D3 still gated)";; esac
echo "SUMMARY pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
