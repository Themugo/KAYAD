# Test results on the final tree (2026-11-23, after the identity fix)
| Suite | Command | Result |
|---|---|---|
| Backend jest | `cd backend && node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=2 --silent` | exit 0; 258 suites passed, 1 skipped; 4,256 tests passed, 21 skipped |
| Frontend vitest | `npx vitest run` | exit 0; 227 files; 1,931 passed, 1 skipped |
| Typecheck | `npm run typecheck` | exit 0 |
| Production build | `npm run build` | exit 0 (chunk-size warnings only) |
| DB journeys | `PGPASSWORD=<local disposable> POSTGREST_BIN=<path> bash ci/db-journeys/run.sh` | exit 0; 211/211 migrations; 29/29 journeys, overall PASS |
| Real-browser invitation journey | hold stack (`ONLY_JOURNEYS=99_browser_hold KAYARD_BROWSER_HOLD=1800 bash ci/db-journeys/run.sh`), `VITE_DEV_API_TARGET=http://127.0.0.1:5065 npx vite --port 5299`, then `node ci/browser/team-invitation.mjs` | exit 0; 29/29 |
Evidence: `evidence/jest-final-full.txt`, `vitest-final-full.txt`, `typecheck-final.txt`, `build-final.txt`, `journeys-final.txt`, `browser-invitation-run.txt`, `evidence/browser-invitation/*.png`. Local disposable stack only; not production. Browser runs are rate-limit sensitive: restart the stack between repeated runs. Not run: real e-mail delivery, any production browser or database write.
