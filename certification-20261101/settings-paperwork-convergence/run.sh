#!/usr/bin/env bash
cd "$(dirname "$0")/../.."
CF=certification-20261101/settings-paperwork-convergence
run() { name=$1; shift; ( "$@" ) > $CF/$name.log 2>&1; echo "$name $?" >> $CF/exit-codes.txt; }
: > $CF/exit-codes.txt
run tsc npx tsc --noEmit -p .
run lint npm run lint
run vitest-frontend npx vitest run
run build npm run build
run validate-panic-room node scripts/validate-panic-room-end-to-end.mjs
run validate-business-command-centre node scripts/validate-business-command-centre-phase04.mjs
run validate-superadmin-navigation node scripts/validate-super-admin-phase1-navigation.mjs
run validate-admin-route-convergence node scripts/validate-admin-route-convergence.mjs
run validate-superadmin-completion node scripts/validate-super-admin-completion.mjs
( cd backend && run_b() { :; } )
( cd backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit > ../$CF/backend-jest.log 2>&1; echo "backend-jest $?" >> ../$CF/exit-codes.txt )
( cd backend && npx vitest run --config vitest.config.js > ../$CF/backend-vitest.log 2>&1; echo "backend-vitest $?" >> ../$CF/exit-codes.txt )
( cd backend && node --test tests/response-lifecycle.test.js > ../$CF/backend-node-test.log 2>&1; echo "backend-node-test $?" >> ../$CF/exit-codes.txt )
echo ALLDONE >> $CF/exit-codes.txt
