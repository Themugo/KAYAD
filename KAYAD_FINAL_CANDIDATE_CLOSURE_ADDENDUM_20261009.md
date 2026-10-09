# KAYAD Final Candidate Closure — Addendum (2026-10-09)

## Foundation and integrity

- Source foundation: uploaded `KAYAD-FINAL-RELEASE-GATE-20261009.zip`, archive comment/commit `d8513151a06420f5d0c1b2ae229726d8708a9415`.
- Input archive size: 24,235,579 bytes.
- Input archive SHA-256: `e8e4bf8ed71b6db7c37bda9a3026aa6fbd7acbf32af4d690b25301b2a9ee2347`.
- No deployment or production migration was performed.

## Corrections made in this addendum

1. **Production browser API contract:** the canonical frontend configuration is `VITE_API_URL=/api`; `vercel.json` rewrites `/api/:path*` to `https://api.kayad.space/api/:path*` before the SPA fallback. Updated `scripts/validate-production-host-contract.mjs` to validate this actual same-origin contract rather than demand an absolute browser API URL that contradicts the environment examples and rewrite. The direct API host remains the backend host for server-side/live API verification and Socket.IO.
2. **Vercel CORS aliases:** aligned the explicit Vercel aliases and regex in `backend/server.js` with the canonical `kayad-space` project described in `docs/VERCEL_CANONICAL_PRODUCTION_RUNBOOK_20261002.md`; removed the obsolete `kayad-motors` aliases.
3. **Hero validator drift:** updated `scripts/validate-home-hero-premium.mjs` to check the current approved `kayad-land-cruiser-cutout.png` and `kayad-mercedes-gle-cutout.png` assets already used by the hero source. No hero dimensions or composition changed.
4. **Escrow validator drift:** updated the custody validator to verify the current server-computed `getEscrowEnabledForNewOrEditedCar` capability path instead of asserting the superseded hard-coded role branch. This preserves the actual authorization/eligibility model; no escrow behavior was changed in this addendum.
5. **Communication event contract:** added `BID_CONFIRMED` and `OUTBID` emissions to the existing M-Pesa-confirmed bid settlement path, after canonical atomic settlement succeeds. The bidder-confirmation event is emitted for the settled bidder. For a market-leading confirmed bid, lower confirmed bids belonging to other users are found and notified. Failures to send these communications are logged and do not roll back a settled payment. This code does not claim provider delivery, and pending/failed bids do not trigger these events.
6. **Validator ownership:** updated the communication convergence validator to inspect the canonical support case service (where the support event contract lives), not the obsolete controller location.
7. Added an assertion to the existing bid payment callback test for `BID_CONFIRMED`.

## Checks actually run in this environment

Passed:
- `node scripts/validate-production-host-contract.mjs` — PASS.
- `node scripts/validate-escrow-custody-domain.mjs` — 14/14 PASS.
- `node scripts/validate-home-hero-premium.mjs` — 12/12 PASS.
- `node scripts/validate-communication-event-convergence.mjs` — 12/12 PASS.
- `node --check backend/server.js` — PASS.
- `node --check backend/services/paymentCallback.service.js` — PASS.
- `node --check backend/tests/payments/bidPaymentRealtimeEmit.test.js` — PASS.

Blocked/not run:
- Full Jest/Vitest suite, TypeScript check and Vite build could not be run. The archive does not include installed dependencies. `npm ci` first rejected the environment because Node was `v22.16.0` while the project requires `>=22.22.2`; a retry with engine strictness disabled timed out and left only a partial `node_modules` directory. The partial dependency directory is excluded from the final ZIP.
- Supabase staging RLS/migration, real provider delivery, live API checks and production verification were not run; credentials/runtime access were not available.
- The original deployed auction 5xx cause remains unconfirmed without deployed logs and release identity.

## Release interpretation

This is a corrected source candidate with targeted validator and syntax evidence. It is **not** a fresh full-suite-certified or production-certified release. The exact final archive must be tested under Node `>=22.22.2` with a clean `npm ci`, full tests, typecheck and build before release. Staging and production remain unconfirmed.
