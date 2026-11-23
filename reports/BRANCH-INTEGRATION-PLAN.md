# Branch Integration Plan — release-consistency (p8) + dealer command centre (p9)

Status: **dry-run VERIFIED on a scratch tree; nothing merged; `/home/claude/p8` untouched; nothing committed, pushed or deployed.** The merge decision and order are the owner's.

## Facts
* Both worktrees are at base `bfe3735` (= `origin/main`); both deltas are uncommitted. Correct base for both patches: **bfe3735**.
* Release work (p8): `kayard-release-consistency-v3.patch` (73 files; zip sha256 d59f1c80…ce43 unchanged). Command centre (p9): `kayard-dealer-command-centre-v2.patch` (48 files), checksums in `SHA256SUMS-command-centre-v2.txt`. The earlier `…-v1.patch` is kept, superseded (it omitted the generated CSS).

## Conflict analysis
| Check | Result |
|---|---|
| Changed-file overlap p8 vs p9 | none (empty intersection of the two lists) |
| Migrations | none in either delta, so no ordering/number conflict |
| Generated asset `src/styles/dark-theme.generated.css` | only p9 changes it; p8 changes none. Regenerating on the combined tree gave a file **byte-identical** to p9's |
| `ci/db-journeys/run.sh` | p9 only (journeys 18, 19) |
| Incompatible assumptions | none found: p8 is service worker / main.tsx / vite / CI browser scenarios / deploy workflow; p9 is dealer API, workspace UI, reports. Both rely on the same auth/cookie model |

## Dry-run (scratch tree `/tmp/comb2`, export of bfe3735)
1. `git apply --check` + apply v3, then `git apply --check` + apply command-centre v2: **both apply cleanly** (only whitespace warnings inside v3's own report text).
2. `tsc --noEmit`: clean. Full vitest on combined tree: **227 files, 1922 passed, 1 skipped**. Dark-theme guard test passes.
3. Backend `dealerCommandCentre|phase13d`: 2 suites, 204 tests pass.
Not re-run on the combined tree: the DB journeys, the browser harness, the full backend suite (NOT TESTED combined).

## Plan (owner executes; CMD-compatible)
```
git fetch origin
git switch -c integration/release-and-command-centre bfe3735
git apply --index C:\path\kayard-release-consistency-v3.patch
git apply --index C:\path\kayard-dealer-command-centre-v2.patch
node scripts\generate-dark-theme.mjs
git status
npm run typecheck
npm test
```
Then run the DB journeys and `ci/browser/command-centre.mjs` on the combined tree before any merge. Apply each patch **once**; do not also merge the p8/p9 branches. If main moves, rebase/re-export from the new base and re-run the checks.

## Preserve / exclude
* Preserve: both patches, both reports sets, `SHA256SUMS-*`, `reports/evidence/command-centre/`.
* Exclude: `data/uploads.sqlite` (local DB), `ci/db-journeys/out/`, node_modules, traces, build output.
* The generated CSS is included in the patch and must be regenerated after any further change that adds colour classes.

## Open owner decisions
Merge order (recommendation: release work first, then command centre); D1–D6 financial fixes (see `DEALER-LEDGER-RECONCILIATION.md`); hosted migrations; legacy endpoint correction; enquiry assignment.
