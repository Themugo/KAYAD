# Test results (final code, executed 2026-11-22)

| Suite | Result |
|---|---|
| Disposable-DB harness `ci/db-journeys/run.sh` (209/209 migrations applied to a throwaway DB; legacy journeys j1–j10, 03, 05, 06, 07, 08, 09, 10, 11, 12) | **overall=PASS**, every step exit=0 (`evidence/run-sh-full.log`) |
| Backend Jest, 14 batches, `--maxWorkers=1` | **all 14 pass**; 1 suite and 21 tests skipped in batch 11 (pre-existing skips) (`evidence/backend-jest-batches.txt`) |
| Backend Vitest | 61 / 61 pass |
| Backend node:test (`npm run test:node`) | 34 / 34 pass |
| Frontend Vitest | 215 files; **1829 passed, 1 skipped** (pre-existing skip) |
| `tsc --noEmit` | clean |
| `npm run build` | succeeds |
| Repository validators (`scripts/validate-*.mjs`) | **352 pass, 6 fail** (`evidence/validators.txt`) |

## The 6 validator failures
`validate-communications-provider-certification`, `validate-kayad-navbar-branding`, `validate-live-runtime`, `validate-local-supabase`, `validate-release`, `validate-stage27-brand-identity-admin-editability-20261012`. These fail identically on unmodified `origin/main` (needing live providers / hosted state, or pinning older branding). None were weakened or edited. They are not caused by this work but they are **not fixed**, and `validate-release` failing means the repository's own release gate is red.

## Notes on method
* A defect in my own batch script (its glob also matched stale `.log` files) was found and fixed, then Jest was re-run cleanly; the numbers above are from the clean run.
* The new tests this phase: 4 frontend (pause / republish), node:test lifecycle units, DB journeys 11 and 12. Existing tests were adjusted only where the new publish-completeness rule made old fixtures incomplete (assertions unchanged).
* Real Cloudinary, real M-Pesa and hosted Supabase were not exercised (BLOCKED / read-only).
