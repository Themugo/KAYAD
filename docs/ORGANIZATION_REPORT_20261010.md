# KAYAD Archive Organization Report — 2026-10-10

## Scope

Organized the October 9, 2026 KAYAD archive without rebuilding the application or changing its information architecture. The uploaded ZIP remains untouched; this report describes the separate organized copy.

## Changes made

- Moved **422 root-level Markdown reports** into topical `docs/` folders, retaining original filenames.
- Added `docs/README.md` as a topical documentation index and added a pointer to it in the root README.
- Rewrote Markdown links when a local link target was a moved root-level report; scanned project text files and updated 4 files.
- Removed only zero-byte root artifacts named `Success!`, `Upgrading`, `cd`, `main`, `node`, `npm`, `vercel`, `vite`, and `kayad@0.0.0`. The empty `evidence/automotive-services/tsc.txt` was preserved as historical evidence.

## Source duplicate dependency review

Two byte-identical root component copies were removed only after resolving relative module imports against the project source:

- Removed `src/components/ReferralStats.tsx`; retained `src/components/features/common/ReferralStats.tsx`. No relative import resolved to the root-level copy.
- Removed `src/components/SkeletonCard.tsx`; retained `src/components/features/common/SkeletonCard.tsx`. The root barrel exports skeletons from `Skeleton.tsx`; no relative import resolved to the root-level copy.


The other duplicate source pairs were retained because references indicate both paths are used, exported, or otherwise potentially significant. In particular, duplicate security.txt paths, Node version files, package snapshot evidence, and identical preview images were retained.

## Preserved

- Existing application source, backend, Supabase migrations, deployment definitions, package configuration, test files and infrastructure paths.
- Historical phase reports and certification evidence under `evidence/`.
- Root `README.md`, `CHANGES.md`, `CONTRIBUTING.md`, `SECURITY.md`, and required runtime/configuration files.

## Validation limits

- The source archive SHA-256 is recorded in `docs/ORGANIZATION_MANIFEST_20261010.json`.
- ZIP integrity check passed. The organized archive contains 2,996 files; the original contained 3,004. The difference reflects nine zero-byte root artifacts and two unused duplicate source files removed, plus new organization records/index content.
- Local Markdown link scan checked 676 links. Ten missing targets were found, exactly the same ten already missing in the original archive; no new broken local Markdown links were introduced by this reorganization.
- Build/test certification was not achieved: `node_modules` is absent, the available Node runtime is 22.16.0 (prior project requirements specify Node >=22.22.2), `vite` and `vitest` are unavailable, and `npm run typecheck` reports missing project dependencies/types. These are reported as environment/dependency blockers, not as successful tests.
