# Test results on the final tree (2026-11-23)
| Suite | Command | Result |
|---|---|---|
| Backend jest | `cd backend && node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=2 --silent` | exit 0; 255 suites passed, 1 skipped; 4,224 tests passed, 21 skipped |
| Frontend vitest | `npx vitest run` | exit 0; 227 files passed; 1,926 passed, 1 skipped |
| Typecheck | `npm run typecheck` | exit 0 |
| DB Journeys | `PGPASSWORD=<local disposable> POSTGREST_BIN=<path> bash ci/db-journeys/run.sh` | exit 0; 211/211 migrations; 29/29 journeys, overall PASS |
Evidence: `evidence/jest-final-full.txt`, `vitest-final-full.txt`, `typecheck-final.txt`, `journeys-final.txt`. Local only; not production. Not run: frontend build, browser/mobile visual checks, real e-mail delivery.
