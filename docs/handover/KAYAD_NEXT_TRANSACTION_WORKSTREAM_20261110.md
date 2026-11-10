# KAYAD Next Transaction Workstream — 10 November 2026

## Executive summary

This pass implements the first source-level slice of the next transaction workstream: a persistent, canonical buyer/seller offer and counteroffer API attached to the existing `leads` and `cars` records. It also verifies the existing escrow → purchase outcome → vehicle/payment convergence path and prepares a staging-only buyer/seller, payment and refund UAT runbook.

This is **not production certification**. The new migration has not been applied to any database, the backend has not been deployed, the UI does not yet expose a complete offer negotiation panel, and no M-Pesa sandbox/live transaction has been executed.

## 1. Canonical offer and negotiation workflow

### Source changes

- Added migration `supabase/migrations/20261110120000_canonical_offer_negotiation_workflow.sql`.
- Added `marketplace_offers`, linked to the existing lead, vehicle, buyer and seller IDs.
- Added append-only `marketplace_offer_events` history.
- Added `kayad_offer_action` database RPC. It locks the lead and offer rows, checks participant authority, prevents simultaneous pending offers on one lead, validates vehicle availability, supports idempotent replay, and writes offer state plus event history in one transaction.
- Supports submit, counter, accept, reject, withdraw and expiry states. Counteroffers are new child rows linked to the prior offer.
- Direct client writes are revoked; mutations are through the backend service-role RPC. RLS participant read policies are defined.
- Added authenticated backend endpoints:
  - `GET /api/leads/:leadId/offers`
  - `POST /api/leads/:leadId/offers`
  - `POST /api/leads/:leadId/offers/:offerId/actions`
- Added request validation, participant checks, server service, and typed `leadApi` client methods.

### Important boundaries

- An accepted offer is not payment, reservation, escrow funding, ownership transfer or proof of sale. The existing purchase checkout/escrow/fulfilment workflows remain authoritative.
- The existing `/api/events/offer` event endpoint remains analytics-only. It must not be used as the durable offer record.
- The frontend API client is prepared, but the customer/seller offer panel and UI integration are still outstanding. Until that UI exists, the backend offer workflow is not a complete customer-facing journey.
- Amounts are KES and server-side constraints apply. Offer expiry is seven days by default in the RPC.

## 2. Atomic transaction convergence

No duplicate transaction or ledger model was added. Source inspection and contract validation confirm:

- `kayad_transition_escrow_atomic` performs escrow state transition, ledger operations and linked car/payment updates inside one database function transaction.
- `trg_escrow_purchase_outcome_reconciliation` from `20261006240000_escrow_marketplace_reconciliation_hardening.sql` synchronizes the canonical purchase outcome on escrow status changes in the same database transaction.
- Dispute settlement creates refund settlement records for buyer payable amounts.
- `kayad_complete_escrow_refund_atomic` posts the settlement ledger entry and marks the refund completed atomically, requiring an external provider reference.
- The application-level escrow-to-purchase synchronization errors propagate instead of being swallowed.

**Deployment dependency:** the two escrow hardening migrations must be present in the target database's migration history. This source audit does not establish that they are applied in staging or production. The new offer migration must also be applied before offer endpoints can operate.

## 3. Payment and refund UAT preparation

Added `docs/runbooks/marketplace-offer-and-transaction-uat.md` with:
- staging preflight and account setup;
- 15 offer lifecycle tests (idempotency, participant isolation, counteroffers, expiry, race, invalid values, sold vehicle);
- buyer/seller enquiry → inspection → negotiation → checkout → collection → transfer journey;
- M-Pesa successful, duplicate, amount mismatch, unknown callback, timeout/late callback, failed STK and refund tests;
- ledger/escrow/purchase outcome/car/refund reconciliation checks;
- release gates and explicit staging-only boundary.

Existing source guards remain in place: M-Pesa purchase callback settlement uses canonical atomic purchase settlement; callback receipts and duplicate keys are persisted; M-Pesa STK is not used to fund vehicle escrow. No actual provider test has been performed.

## 4. Validation performed

| Validation | Result |
|---|---:|
| Canonical offer negotiation source validator | 16/16 PASS |
| Customer transaction lifecycle validator | 21/21 PASS |
| Escrow next hardening validator | 17/17 PASS |
| Transaction integrity validator | 14/14 PASS |
| Dispute integrity validator | 11/11 PASS |
| Payment gateway lifecycle validator | 13/13 PASS |
| Transactions & Money source contracts | 23/23 PASS |
| Inspection marketplace | 37/37 PASS |
| Inspection marketplace activation | 16/16 PASS |
| Domain lifecycle integrity | PASS |
| Listing lifecycle integrity | 5/5 PASS |
| Phase 4 transaction certification contracts | 16/16 PASS |
| Supabase migration preflight | 195 unique migration versions PASS |
| Changed backend JavaScript syntax checks | PASS |

These are source/static validators. They do not execute PostgreSQL functions, prove RLS against live roles, run Vitest/Jest, compile TypeScript, or exercise an M-Pesa provider.

## 5. Outstanding release gates

1. Run migration reset/replay against a disposable PostgreSQL/Supabase database; inspect SQL errors and RLS behavior.
2. Deploy matching backend and schema to staging; run the offer tests O-01–O-15.
3. Build and wire the buyer/seller offer UI using the new `leadApi` methods; include pending/accepted/rejected/withdrawn/countered/expired states and event history.
4. Run complete buyer/seller browser UAT using persisted staging records, including mobile and desktop.
5. Run M-Pesa sandbox purchase callback and refund UAT, including duplicate, timeout, late callback, wrong amount and reconciliation cases.
6. Compare ledger, payment, webhook, escrow, refund, purchase outcome and vehicle records after every test.
7. Verify target migration history for the escrow atomicity and purchase-outcome trigger migrations before production release.
8. Obtain explicit release-owner approval before production migration or deployment.

## 6. Environment constraints and actions not taken

- Local Node runtime is `v22.16.0`; earlier project checks identified a requirement for Node `>=22.22.2`.
- `node_modules/.bin/vitest` is absent, so the full Vitest/Jest suites and TypeScript/build certification could not be run.
- No local `psql` or Docker runtime was available for a PostgreSQL migration replay.
- No production/staging database credentials or M-Pesa sandbox credentials were used.
- No database migration was applied, no payment was initiated, no production data was changed, and no commit/push/deployment was performed.
