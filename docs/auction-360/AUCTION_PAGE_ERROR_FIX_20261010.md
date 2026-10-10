# Auction page error repair — 2026-10-10

## Scope

Targeted repair of the existing canonical `AuctionsView` only. No redesign, second auction implementation, mock inventory, financial behavior changes, deployment, or production migration.

## Findings

- The customer page requests live, scheduled (`status=draft`), and completed auctions independently.
- Live/completed queries use the canonical `cars` lifecycle data. The scheduled query reads published `auction_setups` rows.
- The repository contains migration `20261002190000_auction_setup_publication_contract.sql`, which creates `public.auction_setups`.
- The existing production-style error text (`Internal server error`) is sanitized by the backend error handler. The source archive cannot establish whether the deployed database is missing the table, the deployed backend points to a different Supabase project, or another database/runtime failure is occurring.
- The application must not convert a database failure into a successful empty schedule or synthesize auction records.

## Changes

- `src/features/AuctionsView.tsx`: error details are now attributed to each failed section rather than displaying the first failure as if it explained every failed request.
- The headline/subcopy now identify a failed Starting soon list accurately when live and completed requests can still respond. It does not claim that the floor is empty when the scheduled list is unavailable.
- `src/__tests__/features/auctionsViewLoadFailure.test.tsx`: regression assertions cover section-specific errors and multi-section failures.
- `docs/runbooks/auction-page-500.md`: added read-only SQL and API checks to verify the deployed schema and isolate the failing endpoint.

## Validation

Passed on the extracted source copy:
- `scripts/validate-auction-bid-surface.mjs` — 6/6
- `scripts/validate-auction-360-hardening-20261007.mjs` — 28/28
- `scripts/validate-frontend-runtime-contracts.mjs` — PASS
- `scripts/validate-runtime-integrity.mjs` — 7/7

The full Vitest/typecheck/build suite was not run in this environment: the available Node version is `22.16.0`, below the repository engine requirement `>=22.22.2`, and dependencies are not installed. `npm ci --offline` stopped at the engine check.

## Remaining live-runtime action

The source-side messaging/diagnostics are repaired, but a code archive cannot itself repair the hosted database. Follow `docs/runbooks/auction-page-500.md` against the exact Supabase project configured for the deployed backend. If `to_regclass('public.auction_setups')` returns `NULL`, review/apply the existing migration through the approved migration workflow. If the table exists, correlate the failing request with backend logs and verify deployed `SUPABASE_URL`/server-side credentials without exposing secret values. No live migration or deployment was performed.
