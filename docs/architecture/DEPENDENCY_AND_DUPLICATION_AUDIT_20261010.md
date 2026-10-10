# Dependency and Duplication Audit — 2026-10-10

## Scope and method

Audited the uploaded organized foundation as a separate working copy. Compared exact file hashes, searched frontend import/mock references for duplicate components, inspected root and backend package scripts, reviewed the Node runtime contract, checked the Supabase migration inventory and scanned local Markdown links. This was a static/source audit only; dependencies were not installed and application tests/build could not be run in this environment.

## Safe source consolidations applied

Canonical implementations are retained in feature-scoped directories. Imports were redirected before redundant copies were removed.

| Removed duplicate | Canonical implementation | Reference updates / rationale |
|---|---|---|
| `src/components/BackButton.tsx` | `src/components/features/common/BackButton.tsx` | Seller page imports now target the common component. Removed stale test mock for an unrelated path. |
| `src/components/SeoStructuredData.tsx` | `src/components/features/common/SeoStructuredData.tsx` | Showroom now imports the common implementation; the Showroom test already mocked that path. |
| `src/components/CompareDrawer.tsx` | `src/components/features/common/CompareDrawer.tsx` | `AppLayout` now imports the common implementation. |
| `src/components/features/car/CompareDrawer.tsx` | `src/components/features/common/CompareDrawer.tsx` | Exact duplicate with no direct runtime import found; common barrel already exports the canonical implementation. |
| `src/components/SWUpdateBanner.tsx` | `src/components/features/common/SWUpdateBanner.tsx` | Root copy was only referenced by a stale test mock; removed that mock. Canonical feature component remains exported by the common barrel. |
| `src/components/WinnerModal.tsx` | `src/components/features/auction/WinnerModal.tsx` | Root copy was only referenced by a stale test mock; removed that mock. Feature implementation remains exported by the auction barrel. |
| `src/components/dealer/DealerSidebar.tsx` | `src/components/layout/DealerSidebar.tsx` | Legacy dealer layout now imports the shared layout sidebar. No other direct import of the duplicate was found. |

The source changes are intentionally narrow. The legacy `src/components/dealer/DealerLayout.tsx` itself is retained pending a product/route owner confirming whether it is intentionally available for future use.

## Exact duplicate groups retained

These remain byte-identical but were not deleted because their location, runtime role or evidence value may matter.

| Paths | Decision |
|---|---|
| `.nvmrc`, `.node-version` | Keep both for runtime-manager compatibility; values must remain aligned. |
| `package.json`, `evidence/identity/root-package.json.before` | Keep the evidence snapshot. |
| `backend/package.json`, `evidence/identity/backend-package.json.before` | Keep the evidence snapshot. |
| `public/security.txt`, `public/.well-known/security.txt` | Keep both serving paths until hosting behavior is verified. |
| `kayad-land-cruiser-clean-preview.jpg`, `kayad-land-cruiser-clean-preview2.jpg` | Keep until all content/admin references and visual differences are checked. |
| `e2e/inspection-journey/LAST_RUN_20261009.txt`, `evidence/automotive-services/inspection_journey_results.txt` | Keep run output/evidence copy for traceability. |
| `evidence/release-gate/journey_auto.tmp.cjs.txt`, `evidence/ux-convergence/automotive_journey_results.txt` | Keep; verify whether these are code snapshots or test output before any future removal. |
| `evidence/release-gate/journey_insp.tmp.cjs.txt`, `evidence/ux-convergence/inspection_journey_results.txt` | Same: preserve until provenance is established. |
| `evidence/support/playwright_support_journey_output.txt`, `evidence/release-gate/journey_support_journey.cjs.txt` | Keep pending provenance review. |
| `evidence/support/support_hardening_proof_output_final.txt`, `evidence/support/support_hardening_proof_output_post_integration.txt` | Keep both until the milestone relationship is confirmed. |

After source consolidation, 10 exact duplicate hash groups remain, all listed above. Hash equality is a fact; whether a copy is semantically redundant is a separate decision.

## Operational issues requiring owner resolution

1. **Runtime mismatch in audit environment:** the environment used for this audit reports Node `v22.16.0`; repository and CI require `>=22.22.2`. Build/typecheck/test certification must be rerun on the declared runtime.
2. **Dependency installation absent:** `node_modules` is not present. Do not interpret missing Vite/Vitest/TypeScript/Jest executables as source failures or passing tests.
3. **Backend package script targets:** `backend/package.json` advertises `seed-depts` (`backend/scripts/seed-departments.js`) and deployment monitor commands (`backend/scripts/deploymentMonitor.js`), but those target files were not found in the archive. These commands are broken unless the implementation is supplied externally. Confirm intended ownership; do not silently delete the scripts or invent replacements.
4. **Two root lockfiles:** `package-lock.json` and `bun.lock` coexist, while the README and GitHub Actions use npm/`npm ci`. Keep both until the team formally declares one canonical package manager and confirms whether Bun is intentionally supported.
5. **Legacy duplicate dealer layout:** `src/components/dealer/DealerLayout.tsx` is not imported by any source path found in the static search, but was retained because route-level or future usage must be confirmed by the team before deletion.
6. **Documentation links:** fixed the known local links in operational readiness/runbook indexes where the matching runbooks exist. Any remaining broken links are listed in the handover report; don't create a link to a guessed target.
7. **Migrations:** 165 migration files are present. No migration was edited, merged or removed. Validate sequence, applied status, RLS and rollback/forward-fix behavior against staging before release.

## Not considered safe to auto-delete

- Files with similar names but different content.
- Code with no static import until route registries, dynamic imports, barrels, tests and external integration points are checked.
- Phase scripts (`APPLY_PHASE_*.cmd`) and historical execution records.
- Evidence files, package snapshots, environment examples, migration files or deployment definitions.
- A dependency just because no direct import was found; dynamic imports and generated code can evade simple scans.

## Operational documentation hardening

- Replaced unverified placeholder contacts and dashboard URLs in the root runbook index with explicit owner-verification requirements.
- Removed `redis-cli FLUSHALL` as a suggested routine cache-clear command and documented its destructive scope. Added a warning against routine termination of idle database sessions.
- Corrected the operational-readiness links to point at existing runbooks and verified all 695 local Markdown links resolve in this working copy.

## Validation status

- ZIP integrity: checked after packaging.
- Relative import paths: affected imports manually checked; a regex-only whole-repository scan produces false positives from commented imports and generated-code template strings.
- Build/typecheck/tests: **not run successfully** because dependencies are absent and the available Node runtime is below the declared minimum.
- Live database, RLS, payment/M-Pesa, webhook, auction concurrency and production deployment: **not certified by this static archive audit**.
