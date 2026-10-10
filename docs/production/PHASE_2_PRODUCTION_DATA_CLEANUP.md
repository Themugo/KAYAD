# KAYAD — Phase 2 Production Data Cleanup

## Objective
Remove synthetic/demo business data from the production application path and make active marketplace flows depend on real backend data.

## Completed
- Removed the dedicated demo vehicle seed migration from `supabase/migrations` in Pass 1.
- Removed production imports of `src/data/mockData.ts` and removed that production mock dataset.
- Removed production mock inspection/dealer/chat data modules; the dealer test fixture is isolated under `src/__tests__/fixtures/data/`.
- Marketplace inventory state now starts empty and is loaded from the real `/api/cars` service.
- Removed synthetic recently-viewed IDs and saved-search presets from the marketplace.
- Inspection list/report state now starts empty and uses the real inspection API; failed requests do not fall back to synthetic rows.
- Inspection provider portal uses an empty provider state rather than a fictional provider profile.
- Dealer business portal no longer starts from a fictional dealership, staff, leads, promotions or analytics dataset.
- Dealer profile page no longer selects a fictional dealer; it requires a real dealer profile.
- Auction landing page no longer contains hardcoded auction lots; it loads through the existing real auction API and shows a truthful empty state when there are no auctions.
- Removed obsolete `scripts/apply-schema.js` and `scripts/apply-schema.sh`, which encouraged applying a separate legacy schema outside the migration chain.
- Updated `scripts/setup-supabase.js` so the versioned migration directory is the schema source rather than the legacy schema applicator.
- Removed several unreferenced legacy production components that contained complete fictional marketplace inventories/auction experiences.

## Deliberately retained
- Test fixtures under `src/__tests__/fixtures/` and test-only mocks. These are test data, not production marketplace records.
- Legitimate schema tables, indexes, constraints, triggers and business services.
- Product/configuration definitions that are not pretending to be real records (for example inspection package definitions).

## Remaining Phase 2 work
The repository still contains additional synthetic-looking data in some legacy or operational modules. These require endpoint-level replacement rather than blind deletion. Candidates include:
- seller/dealer dashboard presentation data
- financing presentation examples
- admin CMS sample media/content
- some legacy Ghost Checkers fallback values
- some payment/ledger sandbox/mock branches

These are intentionally left for the next cleanup pass so real API/database contracts can be wired without destroying working functionality.

## Validation
- Confirmed there are no production imports of the removed `src/data/mock*.ts` datasets.
- Attempted TypeScript validation, but dependency installation could not complete in the available environment because the repository currently requires a newer Node patch release for `jsdom@30.0.1`. The repository therefore has **not** been certified as a clean build from this environment.
- No Supabase remote project was modified.
- No production secrets were added.
