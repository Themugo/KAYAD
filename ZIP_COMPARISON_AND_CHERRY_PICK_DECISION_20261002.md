# KAYAD ZIP FOUNDATION COMPARISON — 2026-10-02

Canonical foundation: ZIP 1
Candidate patch source: ZIP 2

## Decision
ZIP 1 remains the authoritative foundation.

A file-by-file comparison found 14 modified files and 8 files only present in ZIP 2. After reviewing the diffs, none of ZIP 2's repository changes should replace or overwrite the current Marketplace/Auction/Escrow + Homepage/Vercel foundation.

## Excluded ZIP 2 changes
- authController.js: registration/database error handling; unrelated to current deployment/build correction.
- _base.js: deleteOne compatibility; unrelated.
- Axios 1.20.0 dependency change: unrelated dependency churn.
- Node engine change from exact 22.22.2 to >=22.22.2: excluded because it weakens deterministic release pinning.
- deployment-readiness validator change that only follows that engine-range change: excluded.
- V14 validator broadening: unrelated.
- test-only changes: excluded from production foundation.
- auctionService draft status: unrelated.
- AuctionLivePage import change: not required by the current build failure.
- CarCard null-badge hardening: useful but outside this narrowly scoped Vercel cherry-pick.
- auction-experience-2.css: ZIP 2 contains an empty version; explicitly rejected because it would destroy the working Auction WOW visual layer.
- generated CLI/session artifacts (`Success!`, `Upgrading`, `main`, `npm`, `vercel`): not source fixes.

## Vercel findings
ZIP 1 already contains the relevant production contract:
- Node 22.22.2 in CI/deploy.
- `.env.production.example`.
- `vercel.json` with `npm ci`, API-before-SPA rewrites and dist output.
- `vercel pull --yes --environment=production`.
- `vercel build --prod`.
- `vercel deploy --prebuilt --prod`.
- production release identity verification.
- deployment readiness that refuses silent Vercel skips.

ZIP 2 does not contain a repository-level Vercel CLI authentication/project-link fix. The local CLI upgrade/authentication issue is environment/credential state, not a safe source patch represented in ZIP 2.

## Output
This foundation intentionally preserves ZIP 1 unchanged, with this comparison report added. No irrelevant ZIP 2 features, stale corrections, dependency churn, or corrupted CSS were imported.
