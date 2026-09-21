# KAYAD V14.2 — Live API Certification Harness

## Purpose

V14.2 moves the project from static production-activation gates toward real deployed API certification without inventing production records or creating a second implementation.

The new `scripts/certify-v14-live-api.mjs` uses the existing KAYAD authentication and canonical API routes. It is deliberately read-only after login. It verifies:

- API health and readiness
- marketplace vehicle reads
- auction catalogue reads
- subscription plan catalogue
- real authentication and `/auth/me`
- buyer/user profile, bids, payments, escrow, disputes, inspections, finance and subscription reads
- optional dealer dashboard/inventory/subscription/finance/inspection reads
- optional admin finance/dispute/subscription/escrow reads

## Required certification account

Set these environment variables outside source control:

- `KAYAD_CERT_EMAIL`
- `KAYAD_CERT_PASSWORD`

Optional role certification:

- `KAYAD_CERT_DEALER_EMAIL`
- `KAYAD_CERT_DEALER_PASSWORD`
- `KAYAD_CERT_ADMIN_EMAIL`
- `KAYAD_CERT_ADMIN_PASSWORD`

Override the API endpoint with `KAYAD_API_URL` when certifying a staging deployment.

## Safety boundary

The harness does **not** seed Supabase directly, fabricate production records, call payment callbacks, place bids, create escrows, create disputes, or mutate subscriptions. Those state-changing workflows remain separate certification stages and must use their existing API contracts with real test identities/providers.

## Execution

```text
npm run certify:v14:live-api
```

A missing buyer certification account is reported as `BLOCKED`; it is not silently replaced by synthetic credentials.

## Current certification status

Static V14 gates are already green. Live API certification remains dependent on a real KAYAD certification account and reachable deployment credentials; it must not be represented as complete until the harness has actually run against the deployed API.
