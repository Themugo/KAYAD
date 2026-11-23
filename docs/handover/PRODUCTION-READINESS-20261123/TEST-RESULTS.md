# Test results on the final tree (2026-11-23): current `main` (5bbf2843) + the 25-path identity/merge delta
| Suite | Command | Result |
|---|---|---|
| Backend jest | `cd backend && node --max-old-space-size=3072 --experimental-vm-modules ./node_modules/jest/bin/jest.js --forceExit --maxWorkers=2 --silent` | exit 0; 258 suites passed, 1 skipped; 4,256 tests passed, 21 skipped |
| Frontend vitest | `npx vitest run` | exit 0; 227 files; 1,931 passed, 1 skipped |
| Typecheck | `npm run typecheck` | exit 0 |
| Production build | `npm run build` | exit 0 (chunk-size warnings only) |
| DB journeys | `PGPASSWORD=<local disposable> POSTGREST_BIN=<path> bash ci/db-journeys/run.sh` | exit 0; 211/211 migrations; 29/29 journeys, overall PASS |
| Real-browser invitation journey | hold stack (`ONLY_JOURNEYS=99_browser_hold KAYARD_BROWSER_HOLD=1800 bash ci/db-journeys/run.sh`), `VITE_DEV_API_TARGET=http://127.0.0.1:5065 npx vite --port 5299`, then `node ci/browser/team-invitation.mjs` | exit 0; 29/29 |
Evidence: `evidence/jest-final-full.txt`, `vitest-final-full.txt`, `typecheck-final.txt`, `build-final.txt`, `journeys-final.txt`, `browser-invitation-run.txt`, `evidence/browser-invitation/*.png`. Local disposable stack only; not production. Browser runs are rate-limit sensitive: restart the stack between repeated runs. Not run: real e-mail delivery, any production browser or database write.

## v5 addendum (local, disposable stack, 2026-11-23)
- Backend Jest full: 259 suites / 4,275 tests passed, 21 skipped (`evidence/backend-jest-full-v5-2026-11-23.txt`).
- Vitest full: 228 files / 1,952 tests passed, 1 skipped (`evidence/vitest-full-v5-2026-11-23.txt`).
- `tsc --noEmit` clean; `npm run build` succeeded.
- DB journeys 17: 42/42; 21: 37/37.
- Real browser (desktop + 390 px): 55/55 (`evidence/browser-invitation-v2-run.txt`, screenshots in `evidence/browser-invitation-v2/`), run with `INVITATION_RATE_LIMIT_MAX=1000` on the test stack only.
