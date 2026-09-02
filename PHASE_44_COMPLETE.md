# KAYAD Phase 44 — Authoritative Marketplace Query Contract Hardening

## Scope
Phase 44 removes marketplace controls that were being applied locally after the backend had already paginated the result set. Such post-filters can produce incomplete pages and incorrect pagination totals.

## Completed
- Kept seller-type options limited to backend-supported dealer/private queries.
- Removed the `recently-reduced` sort alias that silently mapped to `newest`.
- Removed local inspection, escrow, finance, and new-arrival post-filtering from paginated results.
- Kept live-auction filtering on the authoritative `/api/cars` `auctionStatus=live` query.
- Preserved backend pagination metadata as the source of total pages.
- Added `scripts/validate-phase44.mjs`.

## Explicit non-goals
- No invented API endpoints for inspection, escrow, finance, or new arrivals.
- No database migrations.
- No Supabase Auth changes.
- No fabricated marketplace data.

## Validation
Phase 44 validator checks the query-contract boundaries statically. Run the full project lint/build locally before committing.
