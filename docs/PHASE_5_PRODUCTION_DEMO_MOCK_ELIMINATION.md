# Phase 5 — Production Demo/Mock Elimination

## Status

**COMPLETE**

## Objective

Make the production application and Supabase migration chain start from real data only. Test fixtures remain isolated under `src/__tests__/fixtures/`; production runtime code must not ship or fall back to synthetic marketplace records.

## Cleanup completed

- Removed the Supabase migration that inserted public demo vehicles into `public.cars`.
- Removed the orphaned browser demo API and its localStorage-backed demo datastore.
- Removed duplicate demo/mock vehicle, auction, dealer, inspection, banking, enterprise, sponsor, and communication datasets from `src/data`.
- Removed obsolete demo-mode banner components that were no longer referenced by runtime code.
- Removed the unreferenced `src/api/api.exports.backup.ts` backup client.
- Removed the obsolete `scripts/apply-schema.js` / `scripts/apply-schema.sh` legacy schema path so Supabase migrations remain the database source of truth.
- Removed the explicit `backend/db/schema_legacy.sql` legacy schema file.
- Refactored `backend/seed.js` into an owner-only bootstrap. It no longer provisions demo buyers, sellers, dealers, staff accounts, or vehicles.
- Removed stale `is_demo` schema remnants from `backend/db/schema_clean.sql`; the authoritative Supabase migrations do not define this production field.
- Preserved test-only fixtures under `src/__tests__/fixtures/`.
- Preserved legitimate browser storage for preferences, compare state, recent searches/views, and test setup; only the demo datastore was removed.

## Production behavior after Phase 5

A new production database may legitimately contain required system configuration, but it is not populated with fictional marketplace users, vehicles, bids, payments, escrow records, chats, or notifications. Marketplace content must come from real application writes and real backend/Supabase reads.

## Validation target

Phase 5 is complete when migration validation, frontend type-check/build, backend tests, and the final repository scan do not expose a production dependency on the removed demo/mock layer.

## Validation results

- Production legacy demo-layer reference scan: **PASS**.
- `DEMO_*` / `MOCK_*` / `SAMPLE_*` production identifier scan: **PASS**.
- TypeScript/JavaScript parser-level syntax validation across 1,422 source files: **PASS**.
- `scripts/validate-supabase-migrations.mjs`: **PASS** across 27 migration files.
- Relative-import existence scan after removals: repaired moved test-fixture type imports, mobile barrel export, and CMS service path issues discovered during validation.
- Dealer platform API client: repaired an already-truncated source file found during compile validation and restored its real backend route wrappers.

### Build environment note

A full Vite/TypeScript package build could not be executed inside the packaging sandbox because dependency installation was interrupted by the sandbox runtime: the available Node.js is `22.16.0`, while the locked `jsdom@30.0.1` declares `^22.22.2 || ^24.15.0 || >=26.0.0`, and repeated forced installs timed out before populating `node_modules`. This is an environment/package-install limitation rather than a successful build claim. The cleaned ZIP intentionally excludes the partial `node_modules` tree. Run `npm ci`, `npm run lint`, and `npm run build` under a supported Node version (22.22.2+ or 24.15.0+) after extraction.
