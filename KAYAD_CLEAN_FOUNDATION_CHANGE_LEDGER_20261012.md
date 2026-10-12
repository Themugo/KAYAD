# KAYAD Clean Foundation Change Ledger — 2026-10-12

- Source foundation: supplied Stage 36 dealer-convergence ZIP (SHA-256 `f83684ee763151d0805af7b6ed4826ad0dbbadea358d429836c3f7f0f464c233`).
- Added `.env.production.example` with non-secret, validator-confirmed frontend values only.
- Updated `.gitignore` to allow `.env.production.example` alongside `.env.example`.
- Updated `scripts/validate-homepage-convergence.mjs` so its hero assertion matches the current implementation: real featured inventory is preferred; admin-selected real vehicles and configured showcase fallback are explicit; visual showcase does not become real inventory.
- Added `backend` script `test:dealer-schema-regression` with the correct native-ESM Jest launch flags.
- Preserved existing dealer validation matrix and application architecture.
- No application runtime business logic was changed in this pass because no further source defect was proven by executable evidence under the available runtime.
- No commit, push, deployment, or production database mutation was performed.
