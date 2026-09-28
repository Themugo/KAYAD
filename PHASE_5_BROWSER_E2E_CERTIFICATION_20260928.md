# KAYAD Phase 5 — Browser / Business Journey Certification

Date: 2026-09-28
Foundation: KAYAD Phase 4 transaction certification foundation

## Scope

Phase 5 hardens the existing Playwright release path without creating a second E2E architecture.

### Canonical live release gate

`e2e/tests/release-journey/release-journey.spec.ts`

The live suite is explicitly opt-in with `E2E_RELEASE=1` and requires dedicated staging/release credentials and a seeded vehicle. Optional seeded auction/escrow identifiers can extend the journey.

The suite covers:

1. Buyer authentication
2. Buyer vehicle detail surface
3. Buyer auctions surface
4. Buyer escrow surface
5. Dealer authentication
6. Dealer dashboard
7. Dealer inventory
8. Dealer listing surface
9. Authenticated access to the seeded vehicle record
10. Authenticated access to the seeded escrow record when supplied

Financial provider callbacks are deliberately not fabricated by browser tests. M-Pesa/custody/escrow state transitions remain governed by Phase 4's canonical transaction certification and must be exercised against real staging/provider infrastructure in the live release gate.

## E2E convergence

The reusable Playwright API helper now targets the same canonical `/api/v1/*` contract used by the production frontend. This removes the previous split between unversioned helper endpoints and the frontend's versioned transport.

The existing legacy E2E suites are preserved. They are not silently rewritten or deleted. The Phase 5 release suite is separately selectable with `E2E_RELEASE=1`; `E2E_WITH_BACKEND=1` continues to expose the broader legacy suite collection for a later cleanup/certification pass.

## Internal certification

- Phase 3 infrastructure contract: PASS
- Phase 4 transaction certification: 16/16 PASS
- Phase 4 deterministic lifecycle: 7/7 PASS
- Phase 5 E2E contract: 22/22 PASS
- Phase 5 browser contract: 10/10 PASS
- JavaScript certification scripts: `node --check` PASS

## Live gates intentionally pending

This environment has no installed project dependencies and is running Node 22.16.0 while the project requires Node 22.22.2+. It also has no live Supabase, Redis, Brevo, Africa's Talking, Twilio, or M-Pesa credentials.

Therefore this phase does not claim a live Playwright pass. The following command is the authoritative live gate on the correct Windows/CI environment:

`E2E_RELEASE=1 npm --prefix e2e test -- --project=chromium --grep "KAYAD Phase 5"`

Required variables:

- `E2E_BUYER_EMAIL`
- `E2E_BUYER_PASSWORD`
- `E2E_DEALER_EMAIL`
- `E2E_DEALER_PASSWORD`
- `E2E_RELEASE_CAR_ID`
- optional `E2E_RELEASE_AUCTION_ID`
- optional `E2E_RELEASE_ESCROW_ID`

## Change discipline

No application feature was rebuilt. No parallel payment, escrow, authentication, or notification system was introduced. No Git commit or push was performed.
