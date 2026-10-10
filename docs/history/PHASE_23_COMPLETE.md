# Phase 23 — Production Contract & Deployment Source-of-Truth Hardening

## Scope
Phase 23 removes remaining production paths that could fabricate payment/SMS outcomes and reconciles deployment tooling with the authoritative Supabase migration chain.

## Changes
- Removed the stale `auctions` dependency from the AI suspicious-auction detector; it now reads the canonical `cars` auction lifecycle and `bids`.
- Removed the obsolete separate `auctions` definition from the legacy `backend/db/schema_clean.sql` reference and marked that file non-deployable.
- Replaced `scripts/apply-schema.js` with a migration-only deployment guard that requires the Supabase CLI and directs deployment through `supabase db push`.
- Replaced `scripts/apply-schema.sh` with the same migration-only deployment path.
- Removed mock-payment messaging from the payment, inspection, and dealer upgrade flows.
- Removed the M-Pesa B2C mock-success payout path; missing B2C credentials now fail closed.
- Removed the SMS mock-success provider default; unconfigured SMS is disabled and returns failure instead of reporting delivery.
- Removed the SMS bidding path that created a `paid` bid without a payment-integrated settlement flow; SMS bidding now fails closed until real payment integration exists.
- Removed the obsolete mock branch from the main bid placement flow; bids remain pending until verified M-Pesa confirmation.

## Validation
- `scripts/validate-phase23.mjs` passes.
- Backend and script JavaScript syntax checks pass.
- No production backend query references the separate `auctions` table.
- No Supabase migration creates or references a separate `auctions` table.
- No production payment/SMS mock-success path remains in scanned backend code.
